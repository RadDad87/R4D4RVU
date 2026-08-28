/**
 * R4D4RVU feed proxy — a free Cloudflare Worker that gives the radar a
 * private, CORS-enabled ADS-B feed.
 *
 * Why: airplanes.live closed its free public API (403 without a key/feeder
 * account), and the remaining community feeds (adsb.lol, adsb.fi, adsb.one)
 * do not always send `Access-Control-Allow-Origin`, so a static page like
 * R4D4RVU can be blocked from reading them directly. This Worker sits in
 * front of them, adds the CORS header, and gives you your own IP budget so
 * you are never sharing a rate limit with a public relay.
 *
 * Deploy (2 minutes, free plan is plenty):
 *   1. dash.cloudflare.com → Workers & Pages → Create → Worker
 *   2. Paste this file over the template, Deploy
 *   3. Copy the *.workers.dev URL
 *   4. In R4D4RVU: ⚙ options → "My CORS proxy" → paste it → Save
 *
 * Or with wrangler:
 *   npx wrangler deploy cors-proxy-worker.js --name radar-feed --compatibility-date 2026-01-01
 *
 * The radar calls:  <worker>/v2/point/<lat>/<lon>/<nm>
 */

// Upstreams are tried in order; the first one that returns aircraft wins.
const UPSTREAMS = [
  (lat, lon, nm) => `https://api.adsb.lol/v2/point/${lat}/${lon}/${nm}`,
  (lat, lon, nm) => `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${nm}`,
  (lat, lon, nm) => `https://api.adsb.one/v2/point/${lat}/${lon}/${nm}`,
];

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "*",
  "cache-control": "no-store",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const { pathname } = new URL(request.url);
    // /v2/point/<lat>/<lon>/<nm>
    const m = pathname.match(/^\/v2\/point\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(\d+)\/?$/);
    if (!m) {
      return json({ error: "use /v2/point/<lat>/<lon>/<radius_nm>" }, 400);
    }
    const [, lat, lon, nmRaw] = m;
    const nm = Math.min(parseInt(nmRaw, 10) || 50, 250);

    const tried = [];
    for (const build of UPSTREAMS) {
      const url = build(lat, lon, nm);
      try {
        const r = await fetch(url, {
          headers: { "user-agent": "R4D4RVU-feed-proxy/1.0 (+https://github.com/RadDad87/R4D4RVU)" },
          cf: { cacheTtl: 5, cacheEverything: true },
        });
        if (!r.ok) { tried.push(`${host(url)} ${r.status}`); continue; }
        const data = await r.json();
        const ac = data.aircraft || data.ac;
        if (!Array.isArray(ac)) { tried.push(`${host(url)} bad-shape`); continue; }
        return json({ ac, now: data.now ?? Date.now(), total: ac.length, src: host(url) });
      } catch (e) {
        tried.push(`${host(url)} ${e.name || "error"}`);
      }
    }
    return json({ error: "no upstream answered", tried }, 502);
  },
};

const host = (u) => new URL(u).hostname;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
