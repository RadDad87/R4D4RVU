# R4D4RVU — Offline SDR setup

Run R4D4RVU entirely from your own RTL-SDR dongle, no internet required. Pick the
path that matches your situation.

---

## Option A — One-command Docker stack (recommended)

Best if you have a dongle and Docker but no decoder yet. This brings up the
decoder (**readsb**) and the radar together, wired so the browser can read the
feed offline.

1. Install [Docker](https://docs.docker.com/engine/install/) and plug in your RTL-SDR dongle.
2. Grab the four files from this repo into one folder: `docker-compose.yml`, `nginx.conf`, `.env.example`, and `index.html`.
3. Copy the env file and set your receiver location:
   ```bash
   cp .env.example .env
   nano .env          # set LAT, LON, TZ
   ```
4. Start it:
   ```bash
   docker compose up -d
   ```
5. Open **http://localhost:8078/** (or `http://<host-ip>:8078/`). It launches straight
   into **Local SDR** mode. Open the in-app gear once and set your latitude/longitude
   so the scope is centered on you (saved in the browser).

The `radar` service (nginx) serves the app and proxies `/data/aircraft.json` from the
`readsb` container, so everything is same-origin — no CORS or mixed-content problems.

**Tuning:** edit `.env` for `GAIN` (e.g. `49.6` or `autogain`) and `RTLSDR_SERIAL`.
To see the decoder's own map for debugging, uncomment the `ports: ["8080:8080"]` block
in `docker-compose.yml` and visit `http://localhost:8080/`.

---

## Option B — You already run dump1090-fa / PiAware / tar1090

Drop the app next to your existing decoder's web UI so it's served same-origin:

```bash
curl -fsSL https://raw.githubusercontent.com/RadDad87/R4D4RVU/main/install-on-dump1090fa.sh | sudo bash
```

The script copies the app to your decoder's web folder and prints the URL to open
(something like `http://<pi>/skyaware/r4d4rvu.html?source=sdr&sdr=/skyaware/data/aircraft.json`).
Then set your location once in the in-app gear.

---

## Option C — Point the hosted app at your feed manually

If your feed already sends permissive CORS headers, you can use the public site:
open https://raddad87.github.io/R4D4RVU/, go to **⚙ → Data source → Local SDR**, and
paste your `aircraft.json` URL. Note: most browsers block an `https://` page from
reading `http://localhost`, so this only works if your feed is served over HTTPS or
you accept the mixed-content prompt. Options A and B avoid this entirely.

---

## What works offline

Everything on the scope: type-specific symbols, altitude colors, military/responder
detection (from the feed's `dbFlags`), trails, sweep, sound, themes, and range. The
only online-only extras are the per-aircraft **airline / route / photo** lookups
(adsbdb + planespotters) — those simply show "—" with no internet.

## Feed format

R4D4RVU reads the standard `readsb`/`dump1090` `aircraft.json` shape
(`{ "aircraft": [ { "hex", "flight", "lat", "lon", "alt_baro", "gs", "track",
"baro_rate", "squawk", "category", "dbFlags", "t", "r" } ] }`). It fetches the full
list and filters to your selected range locally.
