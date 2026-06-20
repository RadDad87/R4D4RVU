# R4D4RVU — SDR & offline setup guide

This guide covers every way to feed R4D4RVU from your own radio instead of the
internet — RTL-SDR or HackRF One, online or fully offline, with or without
installing anything. Pick the path that matches your gear and how much you want
to set up.

---

## 0. Which path should I use?

| You have… | and you want… | Use |
| --- | --- | --- |
| An **RTL-SDR** dongle, Chrome/Edge desktop | nothing installed | **Path A — In-browser (WebUSB)** |
| Any SDR + **Docker** | one command, rock solid | **Path B — Docker stack** |
| An existing **dump1090-fa / PiAware / tar1090** | reuse it | **Path C — Existing decoder** |
| A **HackRF One** (incl. PortaPack) | to use it | **Path E — HackRF** (then point R4D4RVU at it) |
| To run it **off an SSD with no internet** | fully portable | **Path F — Offline / from a drive** |

The app has **three data sources** (⚙ → *Set location manually / options* → *Data source*):

- **Online — airplanes.live** — the default; internet, no key.
- **Local SDR (offline)** — reads any decoder's `aircraft.json`.
- **RTL-SDR (USB) — in browser** — decodes a dongle directly in the page (WebUSB).

> **Important — your location vs. the receiver location.** ADS-B positions are
> absolute, so the scope plots real lat/lon no matter where your receiver is. You
> still must tell **R4D4RVU** where *you* are (gear menu → latitude/longitude, or
> "Use my location") so it can center the scope and compute range/bearing.

---

## 1. Antenna & reception basics (read this first)

ADS-B is **1090 MHz**. Reception quality is mostly about the antenna:

- Use a **1090 MHz tuned antenna** (a 69 mm quarter-wave whip, or a proper ADS-B
  collinear). The little telescopic antennas in RTL-SDR kits work but are weak.
- **Height and a clear sky view matter more than gain.** Put the antenna by a
  window or outside; metal and walls block 1090 MHz.
- A short, good coax run helps. An **LNA/filter** (1090 MHz SAW filter + amp)
  noticeably improves range if you have RF noise.
- Expect ~100–250 mi line-of-sight in good conditions; much less indoors.

If you see **no aircraft**, it's almost always the antenna/placement or the gain
setting — not the software.

---

## Path A — In-browser, nothing installed (WebUSB) ✨

The simplest path for an **RTL-SDR**: open the site and plug in the dongle.

1. Use **desktop Chrome or Edge** (WebUSB isn't in Safari/Firefox or on phones).
2. Plug your RTL-SDR (R820T/R820T2 tuner) into the computer.
3. **Windows:** the dongle must use the **WinUSB** driver. If the browser can't
   open it, install [Zadig](https://zadig.akeo.ie/), select your "Bulk-In,
   Interface (Interface 0)" device, and replace its driver with **WinUSB**.
   (This is the same step Airspy/SDR# users do.)
   **Linux:** unload the TV-tuner kernel driver once so the browser can claim the
   device: `sudo modprobe -r dvb_usb_rtl28xxu` (add it to a blacklist to persist).
   **macOS:** no driver step needed.
4. Open https://raddad87.github.io/R4D4RVU/ → **⚙ → Data source → "RTL-SDR (USB) —
   in browser"**, then pick your dongle in the browser's USB prompt.
5. Set your location in the same gear menu. Aircraft appear as they're decoded.

This decodes 1090 MHz Mode-S in the browser (rtlsdrjs + a JS demodulator). It's
**experimental** — close any other program using the dongle first, and if no
messages decode, check the antenna and try again. Heavy on the CPU; a real
computer (not a phone) is recommended.

---

## Path B — One-command Docker stack (rock solid)

Best if you have a dongle (RTL-SDR — see Path E for HackRF) and Docker. Brings up
the decoder (**readsb**) and the radar together, wired so the browser can read the
feed offline.

1. Install [Docker](https://docs.docker.com/engine/install/); plug in the dongle.
2. Get `docker-compose.yml`, `nginx.conf`, `.env.example`, and `index.html` in one folder.
3. Set your receiver location:
   ```bash
   cp .env.example .env
   nano .env          # set LAT, LON, TZ (and GAIN if you like)
   ```
4. Start it:
   ```bash
   docker compose up -d
   ```
   …or just **double-click a launcher** (no terminal): `start-radar.command`
   (macOS), `start-radar.bat` (Windows), or `start-radar.sh` (Linux). It copies
   `.env`, brings the stack up, and opens the radar.
5. Open **http://localhost:8078/** — it launches straight into **Local SDR** mode.
   Set your latitude/longitude once in the gear menu.

The `radar` service (nginx) serves the app and proxies `/data/aircraft.json` from
the `readsb` container, so everything is same-origin — no CORS or mixed-content
problems. Tune `GAIN` (`autogain` or e.g. `49.6`) and `RTLSDR_SERIAL` in `.env`.
To see the decoder's own debug map, uncomment the `ports: ["8080:8080"]` block and
visit `http://localhost:8080/`.

---

## Path C — You already run dump1090-fa / PiAware / tar1090

Drop the app next to your existing decoder's web UI so it's served same-origin:

```bash
curl -fsSL https://raw.githubusercontent.com/RadDad87/R4D4RVU/main/install-on-dump1090fa.sh | sudo bash
```

The script finds your decoder's web folder, copies the app in, and prints the URL
(e.g. `http://<pi>/skyaware/r4d4rvu.html?source=sdr&sdr=/skyaware/data/aircraft.json`).
Set your location once in the gear menu.

---

## Path D — Point the hosted app at your feed manually

If your feed already sends permissive CORS headers, use the public site: open
https://raddad87.github.io/R4D4RVU/ → **⚙ → Data source → Local SDR**, paste your
`aircraft.json` URL, set your location, **Save & connect**.

> Browsers block an `https://` page from reading `http://localhost`. So the hosted
> (https) site can only read an **https** feed. For a plain local feed, serve the
> app from the same machine over `http` (Paths B, C, or F) — that's same-origin and
> just works.

---

## Path E — HackRF One (and PortaPack H4M)

**Local SDR** mode reads whatever a decoder publishes, so **any SDR that decodes
1090 MHz works** — RTL-SDR, **HackRF One**, Airspy, SDRplay, LimeSDR, etc. The
HackRF isn't an RTL-SDR, so it uses a HackRF-capable **host decoder** (the
in-browser WebUSB mode is RTL-SDR-only — see the note below).

### HackRF One — step by step

1. Plug the HackRF One into the computer by USB.
   - **Windows:** install the HackRF WinUSB driver via [Zadig](https://zadig.akeo.ie/)
     if needed; grab the HackRF tools from the [Great Scott Gadgets releases](https://github.com/greatscottgadgets/hackrf/releases).
     Verify with `hackrf_info` (should print the board + serial).
   - **macOS:** `brew install hackrf` → `hackrf_info`.
   - **Linux:** `sudo apt install hackrf` (or build from source) → `hackrf_info`.
2. Run a **HackRF-capable ADS-B decoder** that serves `aircraft.json`:
   - **[dump1090_sdrplus](https://github.com/itemir/dump1090_sdrplus)** — a dump1090
     fork supporting RTL-SDR, **HackRF**, Airspy, SDRplay, or
   - **dump1090 / readsb built with HackRF support** (via **SoapySDR + SoapyHackRF**).

   Example (a dump1090 build with HackRF):
   ```bash
   # serves the web UI + aircraft.json on :8080
   ./dump1090 --device-type hackrf --net
   # (readsb + Soapy: readsb --device-type soapy --device "driver=hackrf" --net ...)
   ```
   HackRF tips for 1090: sample rate **2 MS/s**, gains roughly **LNA 32–40 / VGA
   20–40 / amp off** to start, and a 1090 MHz antenna. Adjust gains down if you see
   lots of bad CRCs.
3. In R4D4RVU choose **⚙ → Data source → Local SDR**, enter the feed URL (e.g.
   `http://localhost:8080/data/aircraft.json`), set your location, **Save & connect**.
   Serve the app same-origin / over `http` (Paths B, C, or F) so the browser can read it.

### PortaPack H4M (Mayhem firmware)

A PortaPack (H4M and similar) running **Mayhem** has its own on-device **ADS-B RX**
app that decodes aircraft on its screen — great standalone, but it does **not**
publish a network `aircraft.json` feed. To use the radio with R4D4RVU, connect the
HackRF to a computer and run a host decoder as above (the PortaPack can stay
attached; the HackRF acts as a normal USB SDR to the computer).

> **Why no in-browser HackRF (yet)?** The in-browser **RTL-SDR (USB)** mode speaks
> the RTL2832U USB protocol. HackRF uses a completely different USB command set.
> A WebUSB HackRF decoder is technically possible (libraries like `hackrf.js` and
> `hackrf-sweep-webusb` exist) but is a separate, hardware-specific build — for now
> the HackRF uses the host-decoder route, which works on every OS and gives the
> full feature set.

---

## Path F — Run fully offline / from an SSD (portable)

Yes — R4D4RVU can run with **no internet** straight off a USB stick or SSD.

**What makes it offline-capable:** the in-browser SDR decoder's libraries are
**vendored in the repo** (`rtlsdr.bundle.js`, `mode-s-demodulator.bundle.js`), so
nothing is fetched from the internet to decode your dongle.

1. Copy the whole repo folder to your SSD.
2. Serve it locally and open it. WebUSB and local feeds need a **secure context**
   (`http://localhost` or `https`), so serve the folder rather than relying on
   `file://`:
   - Double-click **`serve-offline.command`** (macOS), **`serve-offline.bat`**
     (Windows), or **`serve-offline.sh`** (Linux). It starts a tiny static server
     on `http://localhost:8099/` and opens your browser. (Uses Python or Node if
     present — most systems already have one.)
   - Or, if you use the Docker/launcher path (B), that already serves over
     `localhost` and works offline once the images are pulled.
3. Choose your data source:
   - **RTL-SDR (USB)** — plug in the dongle; it decodes in the browser, fully offline.
   - **Local SDR** — point at your local decoder's `aircraft.json` (HackRF, readsb, etc.).
   - **Demo mode** — a simulated fleet, no hardware needed.

**What works with zero internet:** the entire scope — type-specific symbols,
altitude colours, military/responder detection (from the feed's `dbFlags`), trails,
sweep, sound, themes, range, and either in-browser RTL-SDR decoding or a local feed.

**What needs internet:** only the per-aircraft **airline / route / photo** lookups
(adsbdb + planespotters) and the **online airplanes.live** source. Offline, those
extras simply show "—"; everything else is fully functional.

---

## Verifying your feed

Whatever decoder you run, confirm it's producing data before blaming the app:

```bash
curl http://localhost:8080/data/aircraft.json | head -c 300
```

You should see `{"now":…,"aircraft":[{"hex":…}]}` with entries that have `lat`/`lon`.
If `aircraft` is empty, it's reception (antenna/gain/placement), not R4D4RVU.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Browser USB prompt is empty | Dongle not in WinUSB driver (run Zadig) / Linux `dvb_usb_rtl28xxu` still loaded (`modprobe -r`) / another app has the dongle. |
| "could not claim device" | Close other SDR software; on Linux unload the kernel driver. |
| WebUSB option greyed/absent | You're not on desktop Chrome/Edge, or the page isn't a secure context (use `https`/`localhost`, not `file://`). |
| Connects but no planes | Antenna/placement/gain. Try a real 1090 MHz antenna near a window; lower gain if CRC errors are high. |
| Local SDR shows "SDR unreachable" | Wrong URL, decoder not running, or https→http mixed-content (serve the app over the same `http`/localhost origin). |
| HackRF: `hackrf_info` fails | Driver not installed (Zadig on Windows) / cable / it's busy in the PortaPack UI. |
| Airline/route/photo show "—" | Expected with no internet, or the lookup APIs are rate-limiting. |

---

## Feed format

R4D4RVU reads the standard `readsb`/`dump1090` `aircraft.json` shape:

```json
{ "aircraft": [ { "hex", "flight", "lat", "lon", "alt_baro", "gs", "track",
  "baro_rate", "squawk", "category", "dbFlags", "t", "r" } ] }
```

It fetches the full list and filters to your selected range locally, so it works
with any decoder that emits this format.
