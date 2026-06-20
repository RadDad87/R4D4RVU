/* R4D4RVU — in-browser SDR ADS-B decoder (EXPERIMENTAL).
 *
 * Talks to an SDR dongle directly over WebUSB and decodes 1090 MHz Mode-S
 * (ADS-B) in the browser — no Docker, no terminal, nothing installed.
 *
 *   • RTL-SDR  — via rtlsdrjs (Apache-2.0, Sandeep Mistry).
 *   • HackRF One (EXPERIMENTAL, unverified) — minimal WebUSB driver based on
 *     the libhackrf USB protocol (see mildsunrise/hackrf.js, MIT).
 *
 * Demodulation: mode-s-demodulator + mode-s-decoder (Thomas Watson, MIT).
 * Both vendored locally (rtlsdr.bundle.js / mode-s-demodulator.bundle.js) so
 * the in-browser decoder works fully offline; falls back to CDN if missing.
 *
 * Desktop Chrome/Edge only (WebUSB). On Linux you may need to unload the
 * dvb_usb_rtl28xxu kernel module (RTL-SDR) or install the WinUSB driver
 * (HackRF, via Zadig on Windows) so the browser can claim the device.
 *
 * Exposes window.R4SDR: { supported, status, start(kind,onStatus), stop(), getAircraft() }
 *   kind = "rtl" (default) | "hackrf".
 */
(function () {
  "use strict";

  // ---------------- shared demodulator + aircraft pipeline ----------------
  var Demodulator = null;
  async function loadDemod() {
    if (Demodulator) return Demodulator;
    try { var lm = await import("./mode-s-demodulator.bundle.js"); Demodulator = lm.default || lm; if (Demodulator) return Demodulator; } catch (e) {}
    var m = await import("https://esm.sh/mode-s-demodulator@1");
    Demodulator = m.default || m;
    return Demodulator;
  }

  // CPR global airborne position decode
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

  var running = false, status = "idle", onStatusCb = null, activeStop = null;
  function setStatus(s) { status = s; if (onStatusCb) try { onStatusCb(s); } catch (e) {} }

  // readChunk() must resolve to a Uint8Array of interleaved I/Q bytes that the
  // demodulator expects (unsigned, centered ~127).
  async function runLoop(readChunk) {
    var demod = new Demodulator({ aggressive: true });
    while (running) {
      var data;
      try { data = await readChunk(); }
      catch (e) { setStatus("USB read error — is the device still connected?"); break; }
      if (!data || !data.length) continue;
      try { demod.process(data, data.length, handle); } catch (e) { /* keep going */ }
      var now = Date.now();
      for (var h in planes) if (now - (planes[h].seen || 0) > 60000) delete planes[h];
      await new Promise(function (r) { setTimeout(r, 0); });
    }
  }

  // ---------------- RTL-SDR backend (rtlsdrjs) ----------------
  var GH = "https://cdn.jsdelivr.net/gh/sandeepmistry/rtlsdrjs@master/lib/";
  var FILES = { usb: "web-usb.js", rtlcom: "rtlcom.js", r820t: "r820t.js", rtl2832u: "rtl2832u.js", rtlsdr: "rtlsdr.js" };
  var _mods = {}, _cache = {}, RtlSdr = null;
  function loadScript(src) { return new Promise(function (res, rej) { var sc = document.createElement("script"); sc.src = src; sc.onload = res; sc.onerror = function () { rej(new Error("load " + src)); }; document.head.appendChild(sc); }); }
  async function loadRtlSdr() {
    if (RtlSdr) return RtlSdr;
    if (window.RtlSdr) { RtlSdr = window.RtlSdr; return RtlSdr; }
    try { await loadScript("./rtlsdr.bundle.js"); if (window.RtlSdr) { RtlSdr = window.RtlSdr; return RtlSdr; } } catch (e) {}
    var srcs = {};
    await Promise.all(Object.keys(FILES).map(async function (k) {
      var r = await fetch(GH + FILES[k]);
      if (!r.ok) throw new Error("Failed to load radio driver (" + FILES[k] + ")");
      srcs[k] = await r.text();
    }));
    for (var k in srcs) _mods[k] = new Function("require", "module", "exports", srcs[k]);
    function req(name) { name = name.replace(/^\.\//, ""); if (_cache[name]) return _cache[name].exports; var m = { exports: {} }; _cache[name] = m; _mods[name](req, m, m.exports); return m.exports; }
    RtlSdr = req("rtlsdr");
    return RtlSdr;
  }

  async function startRtl() {
    setStatus("loading decoder…");
    await Promise.all([loadRtlSdr(), loadDemod()]);
    setStatus("select your RTL-SDR dongle…");
    var sdr = await RtlSdr.requestDevice();
    setStatus("starting radio…");
    await sdr.open({ ppm: 0.5 });
    await sdr.setSampleRate(2000000);
    await sdr.setCenterFrequency(1090000000);
    await sdr.resetBuffer();
    running = true; setStatus("decoding");
    activeStop = async function () { try { await sdr.close(); } catch (e) {} };
    runLoop(async function () { return new Uint8Array(await sdr.readSamples(128 * 1024)); });
  }

  // ---------------- HackRF One backend (EXPERIMENTAL WebUSB) ----------------
  // Vendor requests (libhackrf): see mildsunrise/hackrf.js / great scott gadgets.
  var HRF = { VID: 0x1d50, PIDS: [0x6089, 0x604b, 0xcc15],
    SET_TRANSCEIVER_MODE: 1, SAMPLE_RATE_SET: 6, BASEBAND_FILTER_BANDWIDTH_SET: 7,
    SET_FREQ: 16, AMP_ENABLE: 17, SET_LNA_GAIN: 19, SET_VGA_GAIN: 20, MODE_OFF: 0, MODE_RX: 1 };
  function u32le(v) { return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]; }
  async function startHackrf() {
    setStatus("loading decoder…");
    await loadDemod();
    setStatus("select your HackRF…");
    var dev = await navigator.usb.requestDevice({ filters: HRF.PIDS.map(function (p) { return { vendorId: HRF.VID, productId: p }; }) });
    setStatus("starting HackRF…");
    await dev.open();
    if (dev.configuration === null) await dev.selectConfiguration(1);
    await dev.claimInterface(0);
    function out(request, value, index, data) {
      return dev.controlTransferOut({ requestType: "vendor", recipient: "device", request: request, value: value & 0xffff, index: index & 0xffff }, data || new Uint8Array(0));
    }
    function inn(request, value, index, length) {
      return dev.controlTransferIn({ requestType: "vendor", recipient: "device", request: request, value: value & 0xffff, index: index & 0xffff }, length);
    }
    // sample rate 2 MHz (freq=2000000, divider=1)
    await out(HRF.SAMPLE_RATE_SET, 0, 0, new Uint8Array(u32le(2000000).concat(u32le(1))));
    // baseband filter 1.75 MHz
    var bw = 1750000; await out(HRF.BASEBAND_FILTER_BANDWIDTH_SET, bw & 0xffff, (bw >>> 16) & 0xffff);
    // tune 1090 MHz  (freq_mhz=1090, freq_hz=0)
    await out(HRF.SET_FREQ, 0, 0, new Uint8Array(u32le(1090).concat(u32le(0))));
    // gains: LNA 32 dB (step 8, ≤40), VGA 48 dB (step 2, ≤62), amp off
    await inn(HRF.SET_LNA_GAIN, 0, 32, 1);
    await inn(HRF.SET_VGA_GAIN, 0, 48, 1);
    await out(HRF.AMP_ENABLE, 0, 0);
    // RX on
    await out(HRF.SET_TRANSCEIVER_MODE, HRF.MODE_RX, 0);
    running = true; setStatus("decoding");
    activeStop = async function () {
      try { await out(HRF.SET_TRANSCEIVER_MODE, HRF.MODE_OFF, 0); } catch (e) {}
      try { await dev.releaseInterface(0); } catch (e) {}
      try { await dev.close(); } catch (e) {}
    };
    var LEN = 256 * 1024;
    runLoop(async function () {
      var r = await dev.transferIn(1, LEN);              // bulk IN endpoint 1
      if (!r || r.status !== "ok" || !r.data) return new Uint8Array(0);
      var b = new Uint8Array(r.data.buffer, r.data.byteOffset, r.data.byteLength);
      // HackRF samples are signed int8; convert to offset-binary uint8 (XOR sign bit)
      var o = new Uint8Array(b.length);
      for (var i = 0; i < b.length; i++) o[i] = b[i] ^ 0x80;
      return o;
    });
  }

  // ---------------- public API ----------------
  window.R4SDR = {
    supported: typeof navigator !== "undefined" && !!navigator.usb,
    get status() { return status; },
    set onStatus(fn) { onStatusCb = fn; },

    async start(kind, onStatus) {
      onStatusCb = onStatus || onStatusCb;
      if (!this.supported) { setStatus("WebUSB unsupported — use desktop Chrome or Edge"); throw new Error(status); }
      try {
        if (kind === "hackrf") await startHackrf();
        else await startRtl();
        return true;
      } catch (e) {
        running = false;
        var msg = (e && e.message) || String(e);
        if (/No device selected/i.test(msg)) setStatus("no device selected");
        else if (/unsupported tuner/i.test(msg)) setStatus("unsupported tuner (RTL needs R820T/R820T2)");
        else if (/claim|access|SecurityError|protected|interface/i.test(msg)) setStatus("could not claim device (close other SDR apps; Win: WinUSB via Zadig; Linux: unload kernel driver)");
        else setStatus("error: " + msg);
        throw e;
      }
    },

    async stop() {
      running = false;
      if (activeStop) { try { await activeStop(); } catch (e) {} activeStop = null; }
      setStatus("stopped");
    },

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
