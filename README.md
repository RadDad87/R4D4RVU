# R4D4RVU

**A classic round radar that sweeps the skies above you — powered by live [OpenSky Network](https://opensky-network.org) air-traffic data.**

R4D4RVU centers a vintage CRT-style radar scope on your current location and plots every aircraft within range as a glowing blip, complete with a continuously rotating sweep hand, phosphor-style fade, callsigns, altitudes, and a clickable contact readout. It's a single self-contained `index.html` — no build step, no dependencies, no server.

> Inspired by [AnthonySturdy/micro-radar](https://github.com/AnthonySturdy/micro-radar).

---

## ✈️ Features

- **Authentic radar look** — circular scope, range rings, compass spokes, N/E/S/W cardinals, and a sweeping hand with a fading trail.
- **Your location, your sky** — uses the browser Geolocation API to center the scope on you (or set coordinates manually).
- **Live data** — pulls the OpenSky `/states/all` feed for a bounding box around you and converts each aircraft's lat/lon into a bearing + distance blip.
- **Phosphor fade** — blips flare bright as the sweep passes their bearing, then dim like a real radar tube.
- **Click any contact** — see callsign, ICAO24 address, country of origin, altitude, ground speed, heading, vertical speed, and range/bearing.
- **Selectable range** — 25, 50, 100, 250, or 500 km.
- **Three modes** — `LIVE` (your OpenSky credentials), anonymous (no credentials, rate-limited), and `DEMO` (a simulated fleet so it works offline).
- **Zero install** — one HTML file you can open locally or host on GitHub Pages.

---

## 🚀 Quick start

### Option A — just open it
1. Download `index.html`.
2. Open it in a modern browser (Chrome, Edge, Firefox, Safari).
3. Click **Use my location** and allow the location prompt.

> Opening via `file://` works, but some browsers restrict geolocation on `file://`. If location is blocked, either host the file (Option C) or enter coordinates manually under **⚙ OpenSky credentials & manual position**.

### Option B — run a local web server (recommended)
```bash
# from the folder containing index.html
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Option C — GitHub Pages (free hosting)
Because the whole app is a single `index.html` at the repo root, GitHub Pages can serve it directly:

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Set **Branch** to `main` and the folder to **`/ (root)`**, then **Save**.
4. After a minute your radar is live at
   `https://<your-username>.github.io/R4D4RVU/` (for this repo: https://raddad87.github.io/R4D4RVU/).

---

## 🔑 Getting OpenSky API credentials

As of 2025 OpenSky uses **OAuth2 client-credentials** (the old username/password basic auth is retired). To get reliable, higher-rate live data:

1. Create a free account at [opensky-network.org](https://opensky-network.org).
2. Open your [account page](https://opensky-network.org/my-opensky/account) and create an **API client**.
3. Copy the **`client_id`** and **`client_secret`**.
4. In R4D4RVU, open **⚙ OpenSky credentials & manual position**, paste both values, and click **Save & connect**. Or just click **Import OpenSky JSON file** and pick the credentials file OpenSky gave you — it fills both fields automatically.

Credentials are stored **only in your browser** (`localStorage`) and are sent **directly to OpenSky** from your machine. They are never transmitted anywhere else.

Behind the scenes the app:
- POSTs to `https://auth.opensky-network.org/.../token` with `grant_type=client_credentials` to get a 30-minute bearer token (auto-refreshed),
- calls `https://opensky-network.org/api/states/all?lamin=...&lomin=...&lamax=...&lomax=...` with that token,
- filters results to your selected range and plots them.

Leave the credentials blank to try **anonymous** access — it works but OpenSky rate-limits anonymous callers aggressively, so updates may stall.

### ⚠️ A note on security & CORS
- Because this is a pure browser app, your `client_secret` lives in the page. That's fine for a **personal hobby tool on your own machine**. Do **not** deploy a public site with your secret baked in.
- Some networks/browsers may block the cross-origin token request (CORS). If LIVE mode shows `ERR · Network/CORS error`, the data endpoint may still work anonymously, or use **DEMO mode**. For a hardened setup, proxy the token request through a tiny serverless function and keep the secret server-side.

---

## 🎛️ Controls

| Control | What it does |
| --- | --- |
| **Scope range** | Sets the radar radius (25–500 km) and the OpenSky query box. |
| **Use my location** | Requests GPS/geolocation and re-centers the scope. |
| **Pause / Resume** | Freezes the sweep and data polling. |
| **Save & connect** | Stores credentials + manual coordinates and switches to LIVE. |
| **Demo mode** | Runs a simulated fleet — great offline or without an account. |
| **Click a blip** | Opens the **Contact** readout for that aircraft. |

The **Status** panel shows the current mode, contact count, range, your position, last update time, and a countdown to the next OpenSky ping.

---

## 🧭 How the radar math works

- **Distance** from you to each aircraft uses the haversine formula on the WGS-84 sphere.
- **Bearing** uses the standard great-circle initial-bearing formula (0° = North, clockwise).
- A blip is drawn at `distance / range` of the scope radius, rotated to its bearing — north is up.
- Aircraft glyphs are little triangles rotated to the reported track/heading.
- Brightness is a function of how recently the sweep line passed each blip's bearing, mimicking a phosphor tube.

Altitudes are converted from meters to feet, speeds from m/s to knots, and vertical rate to feet-per-minute for display.

---

## ⏱️ Rate limits

OpenSky limits how often you can poll. R4D4RVU pings every **12 seconds** by default (`CFG.refreshMs` in `index.html`). Authenticated users get a larger daily credit allowance than anonymous users. Be a good citizen — don't crank the refresh interval down.

---

## 🛠️ Configuration knobs

All in the `CFG` object near the top of the `<script>` in `index.html`:

```js
const CFG = {
  refreshMs: 12000,      // how often to query OpenSky (ms)
  sweepPeriodMs: 4000,   // one full sweep revolution (ms)
};
```

---

## 📦 Project structure

```
R4D4RVU/
├── index.html    # the entire app (HTML + CSS + JS)
├── README.md     # this file
└── LICENSE       # MIT
```

---

## ⚖️ Disclaimer

Positions are approximate, can be delayed, and depend on community ADS-B coverage. **R4D4RVU is for hobby and educational use only — never for navigation or any safety-critical purpose.** Air-traffic data is © The OpenSky Network and subject to their [terms of use](https://opensky-network.org/about/terms-of-use).

## 📄 License

[MIT](LICENSE) — do what you like, no warranty.
