/* R4D4RVU — in-browser RTL-SDR ADS-B decoder (EXPERIMENTAL).
 *
 * Talks to an RTL-SDR dongle directly over WebUSB and decodes 1090 MHz Mode-S
 * (ADS-B) in the browser — no Docker, no terminal, nothing installed.
 *
 * Radio layer:  rtlsdrjs by Sandeep Mistry (Apache-2.0), loaded at runtime.
 * Demodulator:  mode-s-demodulator + mode-s-decoder by Thomas Watson (MIT).
 *
 * Requires desktop Chrome/Edge (WebUSB). On Linux you may need to unload the
 * dvb_usb_rtl28xxu kernel module once so the browser can claim the device.
 *
 * Exposes window.R4SDR: { supported, status, start(onStatus), stop(), getAircraft() }.
 */
(function () {
  "use strict";

  var GH = "https://cdn.jsdelivr.net/gh/sandeepmistry/rtlsdrjs@master/lib/";
  var FILES = { usb: "web-usb.js", rtlcom: "rtlcom.js", r820t: "r820t.js", rtl2832u: "rtl2832u.js", rtlsdr: "rtlsdr.js" };

  var _mods = {}, _cache = {}, RtlSdr = null, Demodulator = null;

  // Load the CommonJS rtlsdrjs files and wire them together with a tiny require shim.
  async function loadRtlSdr() {
    if (RtlSdr) return RtlSdr;
    var srcs = {};
    await Promise.all(Object.keys(FILES).map(async function (k) {
      var r = await fetch(GH + FILES[k]);
      if (!r.ok) throw new Error("Failed to load radio driver (" + FILES[k] + ")");
      srcs[k] = await r.text();
    }));
    for (var k in srcs) _mods[k] = new Function("require", "module", "exports", srcs[k]);
    function req(name) {
      name = name.replace(/^\.\//, "");
      if (_cache[name]) return _cache[name].exports;
      var m = { exports: {} };
      _cache[name] = m;
      _mods[name](req, m, m.exports);
      return m.exports;
    }
    RtlSdr = req("rtlsdr");
    return RtlSdr;
  }

  async function loadDemod() {
    if (Demodulator) return Demodulator;
    var m = await import("https://esm.sh/mode-s-demodulator@1");
    Demodulator = m.default || m;
    return Demodulator;
  }

  // ---------- CPR (Compact Position Reporting) global airborne decode ----------
  function cprMod(a, b) { var r = a % b; return r < 0 ? r + b : r; }
  function cprNL(lat) {
    if (lat === 0) return 59;
    if (Math.abs(lat) >= 87) return Math.abs(lat) === 87 ? 2 : 1;
    var nz = 15, a = 1 - Math.cos(Math.PI / (2 * nz));
    var b = Math.pow(Math.cos((Math.PI / 180) * Math.abs(lat)), 2);
    return Math.floor((2 * Math.PI) / Math.acos(1 - a / b));
  }
  function decodeCPR(ac) {
    var even = ac.even, odd = ac.odd;
    if (!even || !odd) return null;
    var dlat0 = 360 / 60, dlat1 = 360 / 59;
    var lat0 = even.lat, lat1 = odd.lat, lon0 = even.lon, lon1 = odd.lon;
    var j = Math.floor((59 * lat0 - 60 * lat1) / 131072 + 0.5);
    var rlat0 = dlat0 * (cprMod(j, 60) + lat0 / 131072);
    var rlat1 = dlat1 * (cprMod(j, 59) + lat1 / 131072);
    if (rlat0 >= 270) rlat0 -= 360;
    if (rlat1 >= 270) rlat1 -= 360;
    if (cprNL(rlat0) !== cprNL(rlat1)) return null;
    var lat, lon, nl, ni, m, dlon;
    if (ac.evenTime > ac.oddTime) {
      nl = cprNL(rlat0); ni = Math.max(nl, 1); dlon = 360 / ni;
      m = Math.floor((lon0 * (nl - 1) - lon1 * nl) / 131072 + 0.5);
      lon = dlon * (cprMod(m, ni) + lon0 / 131072); lat = rlat0;
    } else {
      nl = cprNL(rlat1); ni = Math.max(nl - 1, 1); dlon = 360 / ni;
      m = Math.floor((lon0 * (nl - 1) - lon1 * nl) / 131072 + 0.5);
      lon = dlon * (cprMod(m, ni) + lon1 / 131072); lat = rlat1;
    }
    if (lon > 180) lon -= 360;
    if (lat < -90 || lat > 90) return null;
    return { lat: lat, lon: lon };
  }

  // ---------- per-aircraft state from decoded messages ----------
  var planes = {};
  function handle(mm) {
    if (!mm || !mm.icao) return;
    var hex = (mm.icao >>> 0).toString(16).padStart(6, "0");
    var ac = planes[hex] || (planes[hex] = { hex: hex });
    ac.seen = Date.now();
    var df = mm.msgtype;
    if (df === 17 || df === 18) {
      if (mm.metype >= 1 && mm.metype <= 4 && mm.callsign) ac.flight = mm.callsign;
      else if (mm.metype >= 9 && mm.metype <= 18) {
        if (mm.altitude != null) ac.alt_baro = mm.altitude;
        var cpr = { lat: mm.rawLatitude, lon: mm.rawLongitude };
        if (mm.fflag) { ac.odd = cpr; ac.oddTime = Date.now(); } else { ac.even = cpr; ac.evenTime = Date.now(); }
        if (ac.even && ac.odd && Math.abs((ac.evenTime || 0) - (ac.oddTime || 0)) < 10000) {
          var pos = decodeCPR(ac);
          if (pos) { ac.lat = pos.lat; ac.lon = pos.lon; ac.posTime = Date.now(); }
        }
      } else if (mm.metype === 19) {
        if (mm.speed != null) ac.gs = mm.speed;
        if (mm.heading != null) ac.track = mm.heading;
        if (mm.vertRate != null) { var vr = (mm.vertRate - 1) * 64; ac.baro_rate = mm.vertRateSign ? -vr : vr; }
      }
    } else if (df === 0 || df === 4 || df === 16 || df === 20) {
      if (mm.altitude != null) ac.alt_baro = mm.altitude;
    } else if (df === 5 || df === 21) {
      if (mm.identity != null && mm.identity !== 0) ac.squawk = String(mm.identity).padStart(4, "0");
    }
  }

  // ---------- public API ----------
  var sdr = null, running = false, status = "idle", onStatusCb = null;
  function setStatus(s) { status = s; if (onStatusCb) try { onStatusCb(s); } catch (e) {} }

  async function loop() {
    var demod = new Demodulator({ aggressive: true });
    var CHUNK = 128 * 1024; // samples per read
    while (running) {
      var buf;
      try { buf = await sdr.readSamples(CHUNK); }
      catch (e) { setStatus("USB read error — is the dongle still plugged in?"); break; }
      if (!buf) continue;
      var data = new Uint8Array(buf);
      try { demod.process(data, data.length, handle); } catch (e) { /* keep going */ }
      // prune stale aircraft (>60s) and let the UI breathe
      var now = Date.now();
      for (var h in planes) if (now - (planes[h].seen || 0) > 60000) delete planes[h];
      await new Promise(function (r) { setTimeout(r, 0); });
    }
  }

  window.R4SDR = {
    supported: typeof navigator !== "undefined" && !!navigator.usb,
    get status() { return status; },
    set onStatus(fn) { onStatusCb = fn; },

    async start(onStatus) {
      onStatusCb = onStatus || onStatusCb;
      if (!this.supported) { setStatus("WebUSB unsupported — use desktop Chrome or Edge"); throw new Error(status); }
      try {
        setStatus("loading decoder…");
        await Promise.all([loadRtlSdr(), loadDemod()]);
        setStatus("select your RTL-SDR dongle…");
        sdr = await RtlSdr.requestDevice();          // shows the browser USB picker (needs a click)
        setStatus("starting radio…");
        await sdr.open({ ppm: 0.5 });
        await sdr.setSampleRate(2000000);            // 2 MS/s — required by the demodulator
        await sdr.setCenterFrequency(1090000000);    // 1090 MHz ADS-B
        await sdr.resetBuffer();
        running = true;
        setStatus("decoding");
        loop();
        return true;
      } catch (e) {
        running = false;
        var msg = (e && e.message) || String(e);
        if (/No device selected/i.test(msg)) setStatus("no dongle selected");
        else if (/unsupported tuner/i.test(msg)) setStatus("unsupported tuner (needs R820T/R820T2)");
        else if (/claim|access|SecurityError|protected/i.test(msg)) setStatus("could not claim device (close other SDR apps; on Linux unload dvb_usb_rtl28xxu)");
        else setStatus("error: " + msg);
        throw e;
      }
    },

    async stop() {
      running = false;
      try { if (sdr) await sdr.close(); } catch (e) {}
      sdr = null; setStatus("stopped");
    },

    // Returns aircraft with a known position, in the same raw shape the app
    // already parses from airplanes.live / readsb.
    getAircraft() {
      var out = [], now = Date.now();
      for (var h in planes) {
        var a = planes[h];
        if (a.lat == null || a.lon == null) continue;
        if (now - (a.posTime || a.seen || 0) > 60000) continue;
        out.push({
          hex: a.hex, flight: (a.flight || "").trim(),
          lat: a.lat, lon: a.lon, alt_baro: a.alt_baro != null ? a.alt_baro : null,
          gs: a.gs != null ? a.gs : null, track: a.track != null ? a.track : null,
          baro_rate: a.baro_rate != null ? a.baro_rate : null,
          squawk: a.squawk || null, category: null, dbFlags: 0, t: null, r: null
        });
      }
      return out;
    }
  };
})();
