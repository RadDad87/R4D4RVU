# R4D4RVU

**A classic round radar that sweeps the skies above you — powered by live community ADS-B air-traffic data.**

R4D4RVU centers a vintage CRT-style radar scope on your location and plots every aircraft within range as a glowing blip, with a continuously rotating sweep hand, phosphor-style fade, callsigns, altitudes, and a clickable contact readout. It's a single self-contained `index.html` — no build step, no dependencies, no server, **and no API key**.

> Inspired by [AnthonySturdy/micro-radar](https://github.com/AnthonySturdy/micro-radar).

**Live demo:** https://raddad87.github.io/R4D4RVU/

---

## ✈️ Features

- **Authentic radar look** — circular scope, range rings, compass spokes, N/E/S/W cardinals, and a sweeping hand with a fading trail.
- **Your location, your sky** — uses the browser Geolocation API to center the scope on you (or set coordinates manually).
- **Live data, no key** — pulls aircraft near you from [airplanes.live](https://airplanes.live) and converts each position into a bearing + distance blip.
- **Phosphor fade** — blips flare bright as the sweep passes their bearing, then dim like a real radar tube.
- **Rich contact info on click** — callsign, **airline name & route (origin → destination)** via [adsbdb](https://www.adsbdb.com), a **real photo** of the aircraft via [planespotters.net](https://www.planespotters.net), plus ICAO24 hex, type & registration, altitude, speed, heading, vertical speed, squawk, and range/bearing.
- **Altitude colour-coding** — blips are coloured by altitude band (ground · <10k · 10–20k · 20–30k · 30k+) with a legend.
- **Threat & responder highlighting** — emergency squawks (7500/7600/7700) flash **pink**; **military, police, coast guard, and first-responder** aircraft are **bright red** with a ring (detected from military flags and callsigns/squawks); **government / special** aircraft (privacy-address, LADD, flagged operators) are **purple**.
- **Type-specific symbols** — jets get a winged silhouette, light aircraft a small triangle, helicopters a rotor glyph, drones a diamond, gliders a slim dart, and ground vehicles a square (from the ADS-B emitter category).
- **Hide ground traffic** — declutter the scope by hiding parked/taxiing aircraft (on by default); the contact count shows how many are hidden, e.g. `9 (+14 gnd)`.
- **Works on mobile** — responsive layout, finger-sized tap targets, and the circle is sized to fit your screen; tap any blip for details.
- **Track a plane** — lock onto any aircraft and the scope draws a homing line and a pulsing ring that follow it, with its details pinned in the panel even across refreshes (shows "signal lost" if it leaves coverage).
- **Scope HUD** — live closest / highest / fastest aircraft, plus an **"overhead" alert** when a plane passes within 1.5 mi of you.
- **Sonar ping & trails** — optional retro 'ping' as the sweep passes each contact (pitch rises with altitude), and fading breadcrumb trails showing each plane's recent track.
- **Sound presets** — choose between Sonar, Sub, Blip, and Soft ping voices.
- **Themes** — recolour the whole scope: Green, Amber, Ice, or Alert.
- **Shareable flight links** — copy a link that opens the radar on your location and locks onto the selected aircraft for whoever you send it to.
- **Miles** — selectable range of 15, 30, 60, 150, or 300 miles.
- **Demo mode** — a simulated fleet so it works offline or with location disabled.

---

## 🚀 Quick start

**Just open the live demo:** https://raddad87.github.io/R4D4RVU/ — click **Use my location** and allow the prompt. That's it.

To run it yourself:

```bash
# from the folder containing index.html
python3 -m http.server 8000
# then visit http://localhost:8000
```

Opening the file directly (`file://`) also works, though some browsers restrict geolocation there — if so, use the **⚙ Set location manually** panel to type coordinates.

### Deploy to GitHub Pages (free)
Because the whole app is a single `index.html` at the repo root:

1. **Settings → Pages**.
2. **Source → Deploy from a branch**, branch `main`, folder **`/ (root)`**, then **Save**.
3. Live at `https://<your-username>.github.io/R4D4RVU/`.

---

## 🎛️ Controls

| Control | What it does |
| --- | --- |
| **Scope range** | Radar radius: 15–300 miles. |
| **Use my location** | Requests geolocation and re-centers the scope. |
| **Pause / Resume** | Freezes the sweep and data polling. |
| **⚙ Set location manually** | Type latitude/longitude if you'd rather not share GPS. |
| **Save & connect** | Stores your manual coordinates and goes live. |
| **🔊 Ping** | Toggles a sonar beep as the sweep passes each contact (off by default). |
| **✦ Trails** | Toggles fading position trails behind each aircraft. |
| **🛬 Ground** | Show or hide aircraft on the ground (hidden by default). |
| **🎯 Track this aircraft** | Lock onto the selected plane — homing line, pulsing ring, pinned details. Tap again to release. |
| **🔗 Share** | Copy a link that re-opens the radar tracking the selected flight. |
| **🎨 Theme** | Cycle the colour scheme: Green → Amber → Ice → Alert. |
| **🔉 Sound preset** | Cycle the ping voice: Sonar → Sub → Blip → Soft. |
| **Demo mode** | Runs a simulated fleet (incl. a military & an emergency aircraft) — works offline. |
| **Click a blip** | Opens the **Contact** readout for that aircraft. |

The **Status** panel shows mode, contact count, range, your position, last update, and a countdown to the next refresh.

---

## 🛰️ Data source & why not OpenSky

This app uses **[airplanes.live](https://airplanes.live)**, a free community ADS-B network whose API allows direct browser requests (proper CORS headers) and needs no key.

It originally targeted the **OpenSky Network**, but OpenSky's `/states/all` data endpoint only returns CORS headers for `opensky-network.org` itself — so a static site hosted anywhere else (GitHub Pages, localhost, `file://`) is blocked by the browser from reading it, even with valid OAuth2 credentials. Using OpenSky from the browser would require a small server-side proxy to relay the request. airplanes.live avoids that entirely.

---

## 🧭 How the radar math works

- **Distance** from you to each aircraft uses the haversine formula on the WGS-84 sphere, shown in **miles**.
- **Bearing** uses the standard great-circle initial-bearing formula (0° = North, clockwise).
- A blip is drawn at `distance / range` of the scope radius, rotated to its bearing — north is up.
- Aircraft glyphs are triangles rotated to the reported track.
- Brightness is a function of how recently the sweep passed each blip's bearing, mimicking a phosphor tube.

Altitude (feet), ground speed (knots), and vertical rate (feet/min) come straight from the ADS-B feed.

---

## 🛠️ Configuration

In the `CFG` object near the top of the `<script>` in `index.html`:

```js
const CFG = {
  dataUrl: "https://api.airplanes.live/v2/point/", // {lat}/{lon}/{radius_nm}
  refreshMs: 12000,      // how often to refresh (ms)
  sweepPeriodMs: 4000,   // one full sweep revolution (ms)
};
```

Please respect airplanes.live's [usage guidance](https://airplanes.live/api-guide/) — keep the refresh interval reasonable (the default polls once every 12 seconds).

---

## 📦 Project structure

```
R4D4RVU/
├── index.html    # the entire app (HTML + CSS + JS)
├── README.md     # this file
└── LICENSE       # MIT
```

## ⚖️ Disclaimer

Positions are approximate, can be delayed, and depend on community ADS-B coverage. **R4D4RVU is for hobby and educational use only — never for navigation or any safety-critical purpose.**

## 📄 License

[MIT](LICENSE) — do what you like, no warranty.
