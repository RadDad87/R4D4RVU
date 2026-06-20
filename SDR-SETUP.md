# R4D4RVU — Offline SDR setup

Run R4D4RVU entirely from your own RTL-SDR dongle, no internet required. Pick the
path that matches your situation.

---

## Option A — In-browser, nothing installed (WebUSB) ✨

The simplest possible path: just open the hosted radar and plug in a dongle.

1. Use **desktop Chrome or Edge** (WebUSB isn't available in Safari/Firefox or on phones).
2. Plug your RTL-SDR (R820T/R820T2) into the computer.
3. Open https://raddad87.github.io/R4D4RVU/ → **⚙ → Data source → "RTL-SDR (USB) — in browser"**.
4. Pick your dongle in the browser's USB prompt. It decodes ADS-B right in the page.
5. Set your location once in the same gear menu so the scope centers on you.

**Experimental**, and with real caveats: Chrome/Edge desktop only; on **Linux** you may need to unload the kernel driver once so the browser can claim the device:
```bash
sudo modprobe -r dvb_usb_rtl28xxu
```
and close any other SDR app using the dongle. If WebUSB won't cooperate, use Option B — it's bulletproof.

---

## Option B — One-command Docker stack (rock solid)

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
   …or just **double-click a launcher** (no terminal): `start-radar.command` (macOS), `start-radar.bat` (Windows), or `start-radar.sh` (Linux). It copies `.env`, brings the stack up, and opens the radar.
5. Open **http://localhost:8078/** (or `http://<host-ip>:8078/`). It launches straight
   into **Local SDR** mode. Open the in-app gear once and set your latitude/longitude
   so the scope is centered on you (saved in the browser).

The `radar` service (nginx) serves the app and proxies `/data/aircraft.json` from the
`readsb` container, so everything is same-origin — no CORS or mixed-content problems.

**Tuning:** edit `.env` for `GAIN` (e.g. `49.6` or `autogain`) and `RTLSDR_SERIAL`.
To see the decoder's own map for debugging, uncomment the `ports: ["8080:8080"]` block
in `docker-compose.yml` and visit `http://localhost:8080/`.

---

## Option C — You already run dump1090-fa / PiAware / tar1090

Drop the app next to your existing decoder's web UI so it's served same-origin:

```bash
curl -fsSL https://raw.githubusercontent.com/RadDad87/R4D4RVU/main/install-on-dump1090fa.sh | sudo bash
```

The script copies the app to your decoder's web folder and prints the URL to open
(something like `http://<pi>/skyaware/r4d4rvu.html?source=sdr&sdr=/skyaware/data/aircraft.json`).
Then set your location once in the in-app gear.

---

## Option D — Point the hosted app at your feed manually

If your feed already sends permissive CORS headers, you can use the public site:
open https://raddad87.github.io/R4D4RVU/, go to **⚙ → Data source → Local SDR**, and
paste your `aircraft.json` URL. Note: most browsers block an `https://` page from
reading `http://localhost`, so this only works if your feed is served over HTTPS or
you accept the mixed-content prompt. Options A and B avoid this entirely.

---

## Supported SDRs — RTL-SDR, HackRF One, and more

**Local SDR** mode reads whatever your decoder publishes, so **any SDR that can decode 1090 MHz ADS-B works** — RTL-SDR, **HackRF One**, Airspy, SDRplay, LimeSDR, etc. Use a decoder that supports your radio and outputs `aircraft.json`, then point R4D4RVU at it.

### HackRF One

1. Connect the HackRF One to a computer by USB.
2. Run a HackRF-capable decoder that serves `aircraft.json` — for example:
   - **[dump1090_sdrplus](https://github.com/itemir/dump1090_sdrplus)** (supports RTL-SDR, HackRF, Airspy, SDRplay), or
   - **dump1090 / readsb built with HackRF support** (via SoapySDR + SoapyHackRF).

   ```bash
   # a dump1090 fork with HackRF support — serves the web UI + aircraft.json on :8080
   ./dump1090 --device-type hackrf --net
   ```
3. In R4D4RVU choose **⚙ → Data source → Local SDR**, enter the feed URL
   (e.g. `http://localhost:8080/data/aircraft.json`), set your location, and **Save & connect**.
   Serve the app same-origin / over `http` (Options B or C) so the browser can read the feed.

### PortaPack H4M (Mayhem firmware)

A PortaPack (H4M and similar) running Mayhem has its own on-device **ADS-B RX** app that decodes
aircraft on its screen — great standalone, but it does not publish a network `aircraft.json` feed.
To use the radio with R4D4RVU, connect the HackRF to a computer and run a host decoder as above
(the PortaPack can stay attached; the HackRF acts as a normal USB SDR to the computer).

> The in-browser **RTL-SDR (USB)** mode is RTL-SDR-only (it speaks the RTL2832U USB protocol).
> HackRF / PortaPack use the host-decoder route here.

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
