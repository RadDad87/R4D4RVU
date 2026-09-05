// R4D4RVU feed proxy — runs on this PC, adds CORS, fetches from your own IP.
// The community ADS-B feeds refuse Cloudflare Worker egress, so the proxy lives here.
const http = require("http");
const PORT = 8787;
const SOURCES = [
  { b: (a, o, n) => `https://api.adsb.lol/v2/point/${a}/${o}/${n}`, m: d => d.ac },
  { b: (a, o, n) => `https://opendata.adsb.fi/api/v2/lat/${a}/lon/${o}/dist/${n}`, m: d => d.aircraft },
  { b: (a, o, n) => `https://api.adsb.one/v2/point/${a}/${o}/${n}`, m: d => d.ac },
];
const H = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "*",
  "cache-control": "no-store",
  "content-type": "application/json",
};
let cache = { t: 0, key: "", body: null };
http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, H); return res.end(); }
  const p = req.url.split("?")[0].split("/").filter(Boolean);
  if (p.length !== 5 || p[0] !== "v2" || p[1] !== "point") {
    res.writeHead(400, H);
    return res.end(JSON.stringify({ error: "use /v2/point/<lat>/<lon>/<radius_nm>" }));
  }
  const a = p[2], o = p[3], n = Math.min(parseInt(p[4], 10) || 50, 250);
  if (isNaN(parseFloat(a)) || isNaN(parseFloat(o))) {
    res.writeHead(400, H);
    return res.end(JSON.stringify({ error: "bad coordinates" }));
  }
  const key = a + "/" + o + "/" + n;
  if (cache.key === key && Date.now() - cache.t < 5000) { res.writeHead(200, H); return res.end(cache.body); }
  const tried = [];
  for (const f of SOURCES) {
    const u = f.b(a, o, n), h = new URL(u).hostname;
    try {
      const r = await fetch(u, {
        signal: AbortSignal.timeout(8000),
        headers: { "user-agent": "R4D4RVU-feed-proxy/1.0 (+https://github.com/RadDad87/R4D4RVU)" },
      });
      if (!r.ok) { tried.push(h + " " + r.status); continue; }
      const d = await r.json(), ac = f.m(d);
      if (!Array.isArray(ac)) { tried.push(h + " bad-shape"); continue; }
      const body = JSON.stringify({ ac, now: Date.now(), total: ac.length, src: h });
      cache = { t: Date.now(), key, body };
      res.writeHead(200, H);
      return res.end(body);
    } catch (e) { tried.push(h + " " + (e.name || "error")); }
  }
  res.writeHead(502, H);
  res.end(JSON.stringify({ error: "no upstream answered", tried }));
}).listen(PORT, "127.0.0.1", () => console.log("radar-feed proxy listening on http://127.0.0.1:" + PORT));