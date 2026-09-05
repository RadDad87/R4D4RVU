// R4D4RVU feed proxy — runs on this machine, adds CORS, fetches from your own IP.
// The community ADS-B feeds refuse Cloudflare Worker egress, so the proxy lives here.
//
// Optional shared secret: put a token in key.txt next to this file (or set
// RADAR_FEED_KEY) and every request must be /<token>/v2/point/<lat>/<lon>/<nm>.
// Anything else gets a bare 404, so a stranger who finds the tunnel hostname
// sees nothing. The token is stable; only the tunnel hostname rotates, so the
// hostname can be published while the token stays in your browser's settings.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.RADAR_FEED_PORT || 8787);
let KEY = process.env.RADAR_FEED_KEY || "";
if (!KEY) {
  try { KEY = fs.readFileSync(path.join(__dirname, "key.txt"), "utf8").trim(); } catch (e) { KEY = ""; }
}

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

// Constant-time-ish compare so the token can't be probed a character at a time.
function sameToken(given) {
  if (given.length !== KEY.length) return false;
  let diff = 0;
  for (let i = 0; i < KEY.length; i++) diff |= given.charCodeAt(i) ^ KEY.charCodeAt(i);
  return diff === 0;
}
const notFound = res => { res.writeHead(404, { "content-type": "text/plain" }); res.end("Not Found"); };

http.createServer(async (req, res) => {
  let p = req.url.split("?")[0].split("/").filter(Boolean);
  if (KEY) {
    if (p.length === 0 || !sameToken(p[0])) return notFound(res);
    p = p.slice(1);
  }
  if (req.method === "OPTIONS") { res.writeHead(204, H); return res.end(); }
  if (p.length !== 5 || p[0] !== "v2" || p[1] !== "point") {
    // Shape is wrong but the token was right, so this is our own caller: say why.
    res.writeHead(400, H);
    return res.end(JSON.stringify({ error: "use /v2/point/<lat>/<lon>/<radius_nm>" }));
  }
  const a = p[2], o = p[3], n = Math.min(parseInt(p[4], 10) || 50, 250);
  if (isNaN(parseFloat(a)) || isNaN(parseFloat(o))) {
    res.writeHead(400, H);
    return res.end(JSON.stringify({ error: "bad coordinates" }));
  }
  const ck = a + "/" + o + "/" + n;
  if (cache.key === ck && Date.now() - cache.t < 5000) { res.writeHead(200, H); return res.end(cache.body); }
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
      cache = { t: Date.now(), key: ck, body };
      res.writeHead(200, H);
      return res.end(body);
    } catch (e) { tried.push(h + " " + (e.name || "error")); }
  }
  res.writeHead(502, H);
  res.end(JSON.stringify({ error: "no upstream answered", tried }));
}).listen(PORT, "127.0.0.1", () =>
  console.log("radar-feed proxy on http://127.0.0.1:" + PORT + (KEY ? " (token required)" : " (open)")));