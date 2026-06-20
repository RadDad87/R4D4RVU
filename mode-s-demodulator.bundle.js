var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/mode-s-msglen/index.js
var require_mode_s_msglen = __commonJS({
  "node_modules/mode-s-msglen/index.js"(exports, module) {
    "use strict";
    var LONG_MSG_BITS = 112;
    var SHORT_MSG_BITS = 56;
    module.exports = msgLen;
    msgLen.LONG_MSG_BITS = LONG_MSG_BITS;
    msgLen.SHORT_MSG_BITS = SHORT_MSG_BITS;
    function msgLen(type) {
      return type & 16 ? LONG_MSG_BITS : SHORT_MSG_BITS;
    }
  }
});

// node_modules/mode-s-decoder/index.js
var require_mode_s_decoder = __commonJS({
  "node_modules/mode-s-decoder/index.js"(exports, module) {
    "use strict";
    var msgLen = require_mode_s_msglen();
    var LONG_MSG_BYTES = msgLen.LONG_MSG_BITS / 8;
    var ICAO_CACHE_LEN = 1024;
    var ICAO_CACHE_TTL = 60;
    var AIS_CHARSET = "?ABCDEFGHIJKLMNOPQRSTUVWXYZ????? ???????????????0123456789??????";
    var UNIT_FEET = 0;
    var UNIT_METERS = 1;
    var CHECKSUM_TABLE = new Uint32Array([
      3749354,
      1874677,
      15841150,
      7920575,
      12818395,
      10367465,
      11592432,
      5796216,
      2898108,
      1449054,
      724527,
      16416019,
      8569997,
      12490818,
      6245409,
      13655060,
      6827530,
      3413765,
      15069574,
      7534787,
      13010533,
      10271030,
      5135515,
      14210121,
      9670688,
      4835344,
      2417672,
      1208836,
      604418,
      302209,
      16626756,
      8313378,
      4156689,
      14699660,
      7349830,
      3674915,
      14939029,
      9307086,
      4653543,
      14449399,
      9553791,
      11999675,
      10778329,
      11387240,
      5693620,
      2846810,
      1423405,
      16066066,
      8033033,
      12759936,
      6379968,
      3189984,
      1594992,
      797496,
      398748,
      199374,
      99687,
      16726199,
      8414815,
      12568875,
      10493585,
      11531596,
      5765798,
      2882899,
      15336621,
      9107538,
      4553769,
      14500880,
      7250440,
      3625220,
      1812610,
      906305,
      16322596,
      8161298,
      4080649,
      14735360,
      7367680,
      3683840,
      1841920,
      920960,
      460480,
      230240,
      115120,
      57560,
      28780,
      14390,
      7195,
      16774153,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]);
    module.exports = Decoder;
    Decoder.UNIT_FEET = UNIT_FEET;
    Decoder.UNIT_METERS = UNIT_METERS;
    function Decoder(opts) {
      if (!(this instanceof Decoder)) return new Decoder(opts);
      if (!opts) opts = {};
      this._fixErrors = opts.fixErrors !== false;
      this._aggressive = opts.aggressive || false;
      this._icaoCache = new Uint32Array(ICAO_CACHE_LEN * 2);
    }
    Decoder.prototype.parse = function(msg, crcOnly) {
      const mm = new Message();
      mm.msg = msg;
      mm.msgtype = msg[0] >> 3;
      mm.msgbits = msgLen(mm.msgtype);
      mm.crc = msgcrc(msg, mm.msgbits);
      const crc = checksum(msg, mm.msgbits);
      mm.crcOk = mm.crc === crc;
      if (!mm.crcOk && this._fixErrors && (mm.msgtype === 11 || mm.msgtype === 17)) {
        if ((mm.errorbit = fixSingleBitErrors(msg, mm.msgbits)) !== -1) {
          mm.crc = checksum(msg, mm.msgbits);
          mm.crcOk = true;
        } else if (this._aggressive && mm.msgtype === 17 && (mm.errorbit = fixTwoBitsErrors(msg, mm.msgbits)) !== -1) {
          mm.crc = checksum(msg, mm.msgbits);
          mm.crcOk = true;
        }
      }
      if (crcOnly) return mm;
      mm.ca = msg[0] & 7;
      mm.icao = msg[1] << 16 | msg[2] << 8 | msg[3];
      mm.metype = msg[4] >> 3;
      mm.mesub = msg[4] & 7;
      mm.fs = msg[0] & 7;
      mm.dr = msg[1] >> 3 & 31;
      mm.um = (msg[1] & 7) << 3 | // Request extraction of downlink request.
      msg[2] >> 5;
      {
        const a = (msg[3] & 128) >> 5 | (msg[2] & 2) >> 0 | (msg[2] & 8) >> 3;
        const b = (msg[3] & 2) << 1 | (msg[3] & 8) >> 2 | (msg[3] & 32) >> 5;
        const c = (msg[2] & 1) << 2 | (msg[2] & 4) >> 1 | (msg[2] & 16) >> 4;
        const d = (msg[3] & 1) << 2 | (msg[3] & 4) >> 1 | (msg[3] & 16) >> 4;
        mm.identity = a * 1e3 + b * 100 + c * 10 + d;
      }
      if (mm.msgtype !== 11 && mm.msgtype !== 17) {
        if (this._bruteForceAp(msg, mm)) {
          mm.crcOk = true;
        } else {
          mm.crcOk = false;
        }
      } else {
        if (mm.crcOk && mm.errorbit === -1) {
          this._addRecentlySeenIcaoAddr(mm.icao);
        }
      }
      if (mm.msgtype === 0 || mm.msgtype === 4 || mm.msgtype === 16 || mm.msgtype === 20) {
        const r = decodeAc13Field(msg);
        mm.altitude = r[0];
        mm.unit = r[1];
      }
      if (mm.msgtype === 17) {
        if (mm.metype >= 1 && mm.metype <= 4) {
          mm.aircraftType = mm.metype - 1;
          mm.callsign = (AIS_CHARSET[msg[5] >> 2] + AIS_CHARSET[(msg[5] & 3) << 4 | msg[6] >> 4] + AIS_CHARSET[(msg[6] & 15) << 2 | msg[7] >> 6] + AIS_CHARSET[msg[7] & 63] + AIS_CHARSET[msg[8] >> 2] + AIS_CHARSET[(msg[8] & 3) << 4 | msg[9] >> 4] + AIS_CHARSET[(msg[9] & 15) << 2 | msg[10] >> 6] + AIS_CHARSET[msg[10] & 63]).trim();
        } else if (mm.metype >= 9 && mm.metype <= 18) {
          mm.fflag = msg[6] & 1 << 2;
          mm.tflag = msg[6] & 1 << 3;
          const r = decodeAc12Field(msg);
          if (r) {
            mm.altitude = r[0];
            mm.unit = r[1];
          }
          mm.rawLatitude = (msg[6] & 3) << 15 | msg[7] << 7 | msg[8] >> 1;
          mm.rawLongitude = (msg[8] & 1) << 16 | msg[9] << 8 | msg[10];
        } else if (mm.metype === 19 && mm.mesub >= 1 && mm.mesub <= 4) {
          if (mm.mesub === 1 || mm.mesub === 2) {
            mm.ewDir = (msg[5] & 4) >> 2;
            mm.ewVelocity = (msg[5] & 3) << 8 | msg[6];
            mm.nsDir = (msg[7] & 128) >> 7;
            mm.nsVelocity = (msg[7] & 127) << 3 | (msg[8] & 224) >> 5;
            mm.vertRateSource = (msg[8] & 16) >> 4;
            mm.vertRateSign = (msg[8] & 8) >> 3;
            mm.vertRate = (msg[8] & 7) << 6 | (msg[9] & 252) >> 2;
            mm.speed = Math.sqrt(mm.nsVelocity * mm.nsVelocity + mm.ewVelocity * mm.ewVelocity);
            if (mm.speed) {
              let ewv = mm.ewVelocity;
              let nsv = mm.nsVelocity;
              let heading;
              if (mm.ewDir) ewv *= -1;
              if (mm.nsDir) nsv *= -1;
              heading = Math.atan2(ewv, nsv);
              mm.heading = heading * 360 / (Math.PI * 2);
              if (mm.heading < 0) mm.heading += 360;
            } else {
              mm.heading = 0;
            }
          } else if (mm.mesub === 3 || mm.mesub === 4) {
            mm.headingIsValid = msg[5] & 1 << 2;
            mm.heading = 360 / 128 * ((msg[5] & 3) << 5 | // TODO: Should we ignore remainder
            msg[6] >> 3);
          }
        }
      }
      mm.phaseCorrected = false;
      return mm;
    };
    Decoder.prototype._bruteForceAp = function(msg, mm) {
      if (mm.msgtype === 0 || // Short air surveillance
      mm.msgtype === 4 || // Surveillance, altitude reply
      mm.msgtype === 5 || // Surveillance, identity reply
      mm.msgtype === 16 || // Long Air-Air survillance
      mm.msgtype === 20 || // Comm-A, altitude request
      mm.msgtype === 21 || // Comm-A, identity request
      mm.msgtype === 24) {
        const aux = new Uint8Array(LONG_MSG_BYTES);
        const lastbyte = mm.msgbits / 8 - 1;
        let addr, crc;
        memcpy(aux, 0, msg, 0, mm.msgbits / 8);
        crc = checksum(aux, mm.msgbits);
        aux[lastbyte] ^= crc & 255;
        aux[lastbyte - 1] ^= crc >> 8 & 255;
        aux[lastbyte - 2] ^= crc >> 16 & 255;
        addr = aux[lastbyte] | aux[lastbyte - 1] << 8 | aux[lastbyte - 2] << 16;
        if (this._icaoAddrWasRecentlySeen(addr)) {
          mm.icao = addr;
          return true;
        }
      }
      return false;
    };
    Decoder.prototype._icaoAddrWasRecentlySeen = function(addr) {
      const h = icaoCacheHasAddr(addr);
      const a = this._icaoCache[h * 2];
      const t = this._icaoCache[h * 2 + 1];
      const time = Date.now() / 1e3 >> 0;
      return a && a === addr && time - t <= ICAO_CACHE_TTL;
    };
    Decoder.prototype._addRecentlySeenIcaoAddr = function(addr) {
      const h = icaoCacheHasAddr(addr);
      this._icaoCache[h * 2] = addr;
      const time = Date.now() / 1e3 >> 0;
      this._icaoCache[h * 2 + 1] = time;
    };
    function Message() {
      this.msg = null;
      this.msgbits = null;
      this.msgtype = null;
      this.crcOk = false;
      this.crc = null;
      this.errorbit = -1;
      this.icao = 0;
      this.phaseCorrected = false;
      this.ca = null;
      this.metype = null;
      this.mesub = null;
      this.headingIsValid = null;
      this.heading = null;
      this.aircraftType = null;
      this.fflag = null;
      this.tflag = null;
      this.rawLatitude = null;
      this.rawLongitude = null;
      this.callsign = "";
      this.ewDir = null;
      this.ewVelocity = null;
      this.nsDir = null;
      this.nsVelocity = null;
      this.vertRateSource = null;
      this.vertRateSign = null;
      this.vertRate = null;
      this.speed = null;
      this.fs = null;
      this.dr = null;
      this.um = null;
      this.identity = null;
      this.altitude = null;
      this.unit = null;
    }
    function msgcrc(msg, msgbits) {
      return msg[msgbits / 8 - 3] << 16 | msg[msgbits / 8 - 2] << 8 | msg[msgbits / 8 - 1];
    }
    function decodeAc12Field(msg) {
      const qBit = msg[5] & 1;
      if (qBit) {
        const n = msg[5] >> 1 << 4 | (msg[6] & 240) >> 4;
        return [n * 25 - 1e3, UNIT_FEET];
      }
    }
    function decodeAc13Field(msg) {
      const mBit = msg[3] & 1 << 6;
      const qBit = msg[3] & 1 << 4;
      let unit;
      if (!mBit) {
        unit = UNIT_FEET;
        if (qBit) {
          const n = (msg[2] & 31) << 6 | (msg[3] & 128) >> 2 | (msg[3] & 32) >> 1 | msg[3] & 15;
          return [n * 25 - 1e3, unit];
        } else {
        }
      } else {
        unit = UNIT_METERS;
      }
      return [0, unit];
    }
    function icaoCacheHasAddr(a) {
      a = ((a >>> 16 ^ a) * 73244475 & 4294967295) >>> 0;
      a = ((a >>> 16 ^ a) * 73244475 & 4294967295) >>> 0;
      a = ((a >>> 16 ^ a) & 4294967295) >>> 0;
      return a & ICAO_CACHE_LEN - 1;
    }
    function fixTwoBitsErrors(msg, bits) {
      const aux = new Uint8Array(LONG_MSG_BYTES);
      for (let j = 0; j < bits; j++) {
        const byte1 = j / 8 >> 0;
        const bitmask1 = 1 << 7 - j % 8;
        for (let i = j + 1; i < bits; i++) {
          const byte2 = i / 8 >> 0;
          const bitmask2 = 1 << 7 - i % 8;
          let crc1, crc2;
          memcpy(aux, 0, msg, 0, bits / 8);
          aux[byte1] ^= bitmask1;
          aux[byte2] ^= bitmask2;
          crc1 = aux[bits / 8 - 3] << 16 | aux[bits / 8 - 2] << 8 | aux[bits / 8 - 1];
          crc2 = checksum(aux, bits);
          if (crc1 === crc2) {
            memcpy(msg, 0, aux, 0, bits / 8);
            return j | i << 8;
          }
        }
      }
      return -1;
    }
    function fixSingleBitErrors(msg, bits) {
      const aux = new Uint8Array(LONG_MSG_BYTES);
      for (let j = 0; j < bits; j++) {
        const byte = j / 8 >> 0;
        const bitmask = 1 << 7 - j % 8;
        memcpy(aux, 0, msg, 0, bits / 8);
        aux[byte] ^= bitmask;
        const crc1 = aux[bits / 8 - 3] << 16 | aux[bits / 8 - 2] << 8 | aux[bits / 8 - 1];
        const crc2 = checksum(aux, bits);
        if (crc1 === crc2) {
          memcpy(msg, 0, aux, 0, bits / 8);
          return j;
        }
      }
      return -1;
    }
    function checksum(msg, bits) {
      let crc = 0;
      const offset = bits === 112 ? 0 : 112 - 56;
      for (let j = 0; j < bits; j++) {
        const byte = j / 8 >> 0;
        const bit = j % 8;
        const bitmask = 1 << 7 - bit;
        if (msg[byte] & bitmask) crc ^= CHECKSUM_TABLE[j + offset];
      }
      return crc;
    }
    function memcpy(dst, dstOffset, src, srcOffset, length) {
      for (let i = srcOffset; i < length; i++) {
        dst[dstOffset + i] = src[i];
      }
    }
  }
});

// node_modules/mode-s-demodulator/index.js
var require_mode_s_demodulator = __commonJS({
  "node_modules/mode-s-demodulator/index.js"(exports, module) {
    "use strict";
    var msgLen = require_mode_s_msglen();
    var Decoder = require_mode_s_decoder();
    var PREAMBLE_US = 8;
    var FULL_LEN = PREAMBLE_US + msgLen.LONG_MSG_BITS;
    var MAG_LUT = new Uint16Array(129 * 129 * 2);
    for (let i = 0; i <= 128; i++) {
      for (let q = 0; q <= 128; q++) {
        MAG_LUT[i * 129 + q] = Math.round(Math.sqrt(i * i + q * q) * 360);
      }
    }
    module.exports = Demodulator;
    Demodulator.UNIT_FEET = Decoder.UNIT_FEET;
    Demodulator.UNIT_METERS = Decoder.UNIT_METERS;
    function Demodulator(opts) {
      if (!(this instanceof Demodulator)) return new Demodulator(opts);
      if (!opts) opts = {};
      this._aggressive = opts.aggressive !== false;
      this._checkCrc = opts.checkCrc || true;
      this._crcOnly = opts.crcOnly || false;
      this._mag = opts.mag || null;
      this._decoder = new Decoder(opts);
    }
    Demodulator.prototype.process = function(data, size, onMsg) {
      if (!this._mag) this._mag = new Uint16Array(size / 2);
      this.computeMagnitudeVector(data, this._mag, size);
      this.detectMessage(this._mag, size / 2, onMsg);
    };
    Demodulator.prototype.computeMagnitudeVector = function(data, mag, size, signedInt) {
      if (signedInt) {
        for (let j = 0; j < size; j += 2) {
          let i = data.readInt8(j);
          let q = data.readInt8(j + 1);
          if (i < 0) i = -i;
          if (q < 0) q = -q;
          mag[j / 2] = MAG_LUT[i * 129 + q];
        }
      } else {
        for (let j = 0; j < size; j += 2) {
          let i = data[j] - 127;
          let q = data[j + 1] - 127;
          if (i < 0) i = -i;
          if (q < 0) q = -q;
          mag[j / 2] = MAG_LUT[i * 129 + q];
        }
      }
    };
    Demodulator.prototype.detectMessage = function(mag, maglen, onMsg) {
      const bits = new Uint8Array(msgLen.LONG_MSG_BITS);
      const msg = new Uint8Array(msgLen.LONG_MSG_BITS / 2);
      const aux = new Uint16Array(msgLen.LONG_MSG_BITS * 2);
      let useCorrection = false;
      for (let j = 0; j < maglen - FULL_LEN * 2; j++) {
        let low, high, delta, i, errors;
        let goodMessage = false;
        if (useCorrection) {
          memcpy(aux, 0, mag, j + PREAMBLE_US * 2, aux.length);
          if (j && detectOutOfPhase(mag, j)) {
            applyPhaseCorrection(mag, j);
          }
        } else {
          if (!(mag[j] > mag[j + 1] && mag[j + 1] < mag[j + 2] && mag[j + 2] > mag[j + 3] && mag[j + 3] < mag[j] && mag[j + 4] < mag[j] && mag[j + 5] < mag[j] && mag[j + 6] < mag[j] && mag[j + 7] > mag[j + 8] && mag[j + 8] < mag[j + 9] && mag[j + 9] > mag[j + 6])) {
            continue;
          }
          high = (mag[j] + mag[j + 2] + mag[j + 7] + mag[j + 9]) / 6;
          if (mag[j + 4] >= high || mag[j + 5] >= high) {
            continue;
          }
          if (mag[j + 11] >= high || mag[j + 12] >= high || mag[j + 13] >= high || mag[j + 14] >= high) {
            continue;
          }
        }
        errors = 0;
        for (i = 0; i < msgLen.LONG_MSG_BITS * 2; i += 2) {
          low = mag[j + i + PREAMBLE_US * 2];
          high = mag[j + i + PREAMBLE_US * 2 + 1];
          delta = low - high;
          if (delta < 0) delta = -delta;
          if (i > 0 && delta < 256) {
            bits[i / 2] = bits[i / 2 - 1];
          } else if (low === high) {
            bits[i / 2] = 2;
            if (i < msgLen.SHORT_MSG_BITS * 2) errors++;
          } else if (low > high) {
            bits[i / 2] = 1;
          } else {
            bits[i / 2] = 0;
          }
        }
        if (useCorrection) {
          memcpy(mag, j + PREAMBLE_US * 2, aux, 0, aux.length);
        }
        for (i = 0; i < msgLen.LONG_MSG_BITS; i += 8) {
          msg[i / 8] = bits[i] << 7 | bits[i + 1] << 6 | bits[i + 2] << 5 | bits[i + 3] << 4 | bits[i + 4] << 3 | bits[i + 5] << 2 | bits[i + 6] << 1 | bits[i + 7];
        }
        const msgtype = msg[0] >> 3;
        const msglen = msgLen(msgtype) / 8;
        delta = 0;
        for (i = 0; i < msglen * 8 * 2; i += 2) {
          delta += Math.abs(mag[j + i + PREAMBLE_US * 2] - mag[j + i + PREAMBLE_US * 2 + 1]);
        }
        delta /= msglen * 4;
        if (delta < 10 * 255) {
          useCorrection = false;
          continue;
        }
        if (errors === 0 || this._aggressive && errors < 3) {
          const mm = this._decoder.parse(msg, this._crcOnly);
          if (mm.crcOk) {
            j += (PREAMBLE_US + msglen * 8) * 2;
            goodMessage = true;
            if (useCorrection) mm.phaseCorrected = true;
          }
          if (mm.crcOk || !this._checkCrc) onMsg(mm);
        }
        if (!goodMessage && !useCorrection) {
          j--;
          useCorrection = true;
        } else {
          useCorrection = false;
        }
      }
    };
    function detectOutOfPhase(mag, offset) {
      if (mag[offset + 3] > mag[offset + 2] / 3) return 1;
      if (mag[offset + 10] > mag[offset + 9] / 3) return 1;
      if (mag[offset + 6] > mag[offset + 7] / 3) return -1;
      if (mag[offset + -1] > mag[offset + 1] / 3) return -1;
      return 0;
    }
    function applyPhaseCorrection(mag, offset) {
      for (let j = 16; j < (msgLen.LONG_MSG_BITS - 1) * 2; j += 2) {
        if (mag[offset + j] > mag[offset + j + 1]) {
          mag[offset + j + 2] = mag[offset + j + 2] * 5 / 4;
        } else {
          mag[offset + j + 2] = mag[offset + j + 2] * 4 / 5;
        }
      }
    }
    function memcpy(dst, dstOffset, src, srcOffset, length) {
      for (let i = srcOffset; i < length; i++) {
        dst[dstOffset + i] = src[i];
      }
    }
  }
});

// entry.js
var import_mode_s_demodulator = __toESM(require_mode_s_demodulator());
var entry_default = import_mode_s_demodulator.default;
export {
  entry_default as default
};
