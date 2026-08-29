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

// node_modules/fft.js/lib/fft.js
var require_fft = __commonJS({
  "node_modules/fft.js/lib/fft.js"(exports2, module2) {
    "use strict";
    function FFT2(size) {
      this.size = size | 0;
      if (this.size <= 1 || (this.size & this.size - 1) !== 0)
        throw new Error("FFT size must be a power of two and bigger than 1");
      this._csize = size << 1;
      var table = new Array(this.size * 2);
      for (var i = 0; i < table.length; i += 2) {
        const angle = Math.PI * i / this.size;
        table[i] = Math.cos(angle);
        table[i + 1] = -Math.sin(angle);
      }
      this.table = table;
      var power = 0;
      for (var t = 1; this.size > t; t <<= 1)
        power++;
      this._width = power % 2 === 0 ? power - 1 : power;
      this._bitrev = new Array(1 << this._width);
      for (var j = 0; j < this._bitrev.length; j++) {
        this._bitrev[j] = 0;
        for (var shift = 0; shift < this._width; shift += 2) {
          var revShift = this._width - shift - 2;
          this._bitrev[j] |= (j >>> shift & 3) << revShift;
        }
      }
      this._out = null;
      this._data = null;
      this._inv = 0;
    }
    module2.exports = FFT2;
    FFT2.prototype.fromComplexArray = function fromComplexArray(complex, storage) {
      var res = storage || new Array(complex.length >>> 1);
      for (var i = 0; i < complex.length; i += 2)
        res[i >>> 1] = complex[i];
      return res;
    };
    FFT2.prototype.createComplexArray = function createComplexArray() {
      const res = new Array(this._csize);
      for (var i = 0; i < res.length; i++)
        res[i] = 0;
      return res;
    };
    FFT2.prototype.toComplexArray = function toComplexArray(input, storage) {
      var res = storage || this.createComplexArray();
      for (var i = 0; i < res.length; i += 2) {
        res[i] = input[i >>> 1];
        res[i + 1] = 0;
      }
      return res;
    };
    FFT2.prototype.completeSpectrum = function completeSpectrum(spectrum) {
      var size = this._csize;
      var half = size >>> 1;
      for (var i = 2; i < half; i += 2) {
        spectrum[size - i] = spectrum[i];
        spectrum[size - i + 1] = -spectrum[i + 1];
      }
    };
    FFT2.prototype.transform = function transform(out, data) {
      if (out === data)
        throw new Error("Input and output buffers must be different");
      this._out = out;
      this._data = data;
      this._inv = 0;
      this._transform4();
      this._out = null;
      this._data = null;
    };
    FFT2.prototype.realTransform = function realTransform(out, data) {
      if (out === data)
        throw new Error("Input and output buffers must be different");
      this._out = out;
      this._data = data;
      this._inv = 0;
      this._realTransform4();
      this._out = null;
      this._data = null;
    };
    FFT2.prototype.inverseTransform = function inverseTransform(out, data) {
      if (out === data)
        throw new Error("Input and output buffers must be different");
      this._out = out;
      this._data = data;
      this._inv = 1;
      this._transform4();
      for (var i = 0; i < out.length; i++)
        out[i] /= this.size;
      this._out = null;
      this._data = null;
    };
    FFT2.prototype._transform4 = function _transform4() {
      var out = this._out;
      var size = this._csize;
      var width = this._width;
      var step = 1 << width;
      var len = size / step << 1;
      var outOff;
      var t;
      var bitrev = this._bitrev;
      if (len === 4) {
        for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
          const off = bitrev[t];
          this._singleTransform2(outOff, off, step);
        }
      } else {
        for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
          const off = bitrev[t];
          this._singleTransform4(outOff, off, step);
        }
      }
      var inv = this._inv ? -1 : 1;
      var table = this.table;
      for (step >>= 2; step >= 2; step >>= 2) {
        len = size / step << 1;
        var quarterLen = len >>> 2;
        for (outOff = 0; outOff < size; outOff += len) {
          var limit = outOff + quarterLen;
          for (var i = outOff, k = 0; i < limit; i += 2, k += step) {
            const A = i;
            const B = A + quarterLen;
            const C = B + quarterLen;
            const D = C + quarterLen;
            const Ar = out[A];
            const Ai = out[A + 1];
            const Br = out[B];
            const Bi = out[B + 1];
            const Cr = out[C];
            const Ci = out[C + 1];
            const Dr = out[D];
            const Di = out[D + 1];
            const MAr = Ar;
            const MAi = Ai;
            const tableBr = table[k];
            const tableBi = inv * table[k + 1];
            const MBr = Br * tableBr - Bi * tableBi;
            const MBi = Br * tableBi + Bi * tableBr;
            const tableCr = table[2 * k];
            const tableCi = inv * table[2 * k + 1];
            const MCr = Cr * tableCr - Ci * tableCi;
            const MCi = Cr * tableCi + Ci * tableCr;
            const tableDr = table[3 * k];
            const tableDi = inv * table[3 * k + 1];
            const MDr = Dr * tableDr - Di * tableDi;
            const MDi = Dr * tableDi + Di * tableDr;
            const T0r = MAr + MCr;
            const T0i = MAi + MCi;
            const T1r = MAr - MCr;
            const T1i = MAi - MCi;
            const T2r = MBr + MDr;
            const T2i = MBi + MDi;
            const T3r = inv * (MBr - MDr);
            const T3i = inv * (MBi - MDi);
            const FAr = T0r + T2r;
            const FAi = T0i + T2i;
            const FCr = T0r - T2r;
            const FCi = T0i - T2i;
            const FBr = T1r + T3i;
            const FBi = T1i - T3r;
            const FDr = T1r - T3i;
            const FDi = T1i + T3r;
            out[A] = FAr;
            out[A + 1] = FAi;
            out[B] = FBr;
            out[B + 1] = FBi;
            out[C] = FCr;
            out[C + 1] = FCi;
            out[D] = FDr;
            out[D + 1] = FDi;
          }
        }
      }
    };
    FFT2.prototype._singleTransform2 = function _singleTransform2(outOff, off, step) {
      const out = this._out;
      const data = this._data;
      const evenR = data[off];
      const evenI = data[off + 1];
      const oddR = data[off + step];
      const oddI = data[off + step + 1];
      const leftR = evenR + oddR;
      const leftI = evenI + oddI;
      const rightR = evenR - oddR;
      const rightI = evenI - oddI;
      out[outOff] = leftR;
      out[outOff + 1] = leftI;
      out[outOff + 2] = rightR;
      out[outOff + 3] = rightI;
    };
    FFT2.prototype._singleTransform4 = function _singleTransform4(outOff, off, step) {
      const out = this._out;
      const data = this._data;
      const inv = this._inv ? -1 : 1;
      const step2 = step * 2;
      const step3 = step * 3;
      const Ar = data[off];
      const Ai = data[off + 1];
      const Br = data[off + step];
      const Bi = data[off + step + 1];
      const Cr = data[off + step2];
      const Ci = data[off + step2 + 1];
      const Dr = data[off + step3];
      const Di = data[off + step3 + 1];
      const T0r = Ar + Cr;
      const T0i = Ai + Ci;
      const T1r = Ar - Cr;
      const T1i = Ai - Ci;
      const T2r = Br + Dr;
      const T2i = Bi + Di;
      const T3r = inv * (Br - Dr);
      const T3i = inv * (Bi - Di);
      const FAr = T0r + T2r;
      const FAi = T0i + T2i;
      const FBr = T1r + T3i;
      const FBi = T1i - T3r;
      const FCr = T0r - T2r;
      const FCi = T0i - T2i;
      const FDr = T1r - T3i;
      const FDi = T1i + T3r;
      out[outOff] = FAr;
      out[outOff + 1] = FAi;
      out[outOff + 2] = FBr;
      out[outOff + 3] = FBi;
      out[outOff + 4] = FCr;
      out[outOff + 5] = FCi;
      out[outOff + 6] = FDr;
      out[outOff + 7] = FDi;
    };
    FFT2.prototype._realTransform4 = function _realTransform4() {
      var out = this._out;
      var size = this._csize;
      var width = this._width;
      var step = 1 << width;
      var len = size / step << 1;
      var outOff;
      var t;
      var bitrev = this._bitrev;
      if (len === 4) {
        for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
          const off = bitrev[t];
          this._singleRealTransform2(outOff, off >>> 1, step >>> 1);
        }
      } else {
        for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
          const off = bitrev[t];
          this._singleRealTransform4(outOff, off >>> 1, step >>> 1);
        }
      }
      var inv = this._inv ? -1 : 1;
      var table = this.table;
      for (step >>= 2; step >= 2; step >>= 2) {
        len = size / step << 1;
        var halfLen = len >>> 1;
        var quarterLen = halfLen >>> 1;
        var hquarterLen = quarterLen >>> 1;
        for (outOff = 0; outOff < size; outOff += len) {
          for (var i = 0, k = 0; i <= hquarterLen; i += 2, k += step) {
            var A = outOff + i;
            var B = A + quarterLen;
            var C = B + quarterLen;
            var D = C + quarterLen;
            var Ar = out[A];
            var Ai = out[A + 1];
            var Br = out[B];
            var Bi = out[B + 1];
            var Cr = out[C];
            var Ci = out[C + 1];
            var Dr = out[D];
            var Di = out[D + 1];
            var MAr = Ar;
            var MAi = Ai;
            var tableBr = table[k];
            var tableBi = inv * table[k + 1];
            var MBr = Br * tableBr - Bi * tableBi;
            var MBi = Br * tableBi + Bi * tableBr;
            var tableCr = table[2 * k];
            var tableCi = inv * table[2 * k + 1];
            var MCr = Cr * tableCr - Ci * tableCi;
            var MCi = Cr * tableCi + Ci * tableCr;
            var tableDr = table[3 * k];
            var tableDi = inv * table[3 * k + 1];
            var MDr = Dr * tableDr - Di * tableDi;
            var MDi = Dr * tableDi + Di * tableDr;
            var T0r = MAr + MCr;
            var T0i = MAi + MCi;
            var T1r = MAr - MCr;
            var T1i = MAi - MCi;
            var T2r = MBr + MDr;
            var T2i = MBi + MDi;
            var T3r = inv * (MBr - MDr);
            var T3i = inv * (MBi - MDi);
            var FAr = T0r + T2r;
            var FAi = T0i + T2i;
            var FBr = T1r + T3i;
            var FBi = T1i - T3r;
            out[A] = FAr;
            out[A + 1] = FAi;
            out[B] = FBr;
            out[B + 1] = FBi;
            if (i === 0) {
              var FCr = T0r - T2r;
              var FCi = T0i - T2i;
              out[C] = FCr;
              out[C + 1] = FCi;
              continue;
            }
            if (i === hquarterLen)
              continue;
            var ST0r = T1r;
            var ST0i = -T1i;
            var ST1r = T0r;
            var ST1i = -T0i;
            var ST2r = -inv * T3i;
            var ST2i = -inv * T3r;
            var ST3r = -inv * T2i;
            var ST3i = -inv * T2r;
            var SFAr = ST0r + ST2r;
            var SFAi = ST0i + ST2i;
            var SFBr = ST1r + ST3i;
            var SFBi = ST1i - ST3r;
            var SA = outOff + quarterLen - i;
            var SB = outOff + halfLen - i;
            out[SA] = SFAr;
            out[SA + 1] = SFAi;
            out[SB] = SFBr;
            out[SB + 1] = SFBi;
          }
        }
      }
    };
    FFT2.prototype._singleRealTransform2 = function _singleRealTransform2(outOff, off, step) {
      const out = this._out;
      const data = this._data;
      const evenR = data[off];
      const oddR = data[off + step];
      const leftR = evenR + oddR;
      const rightR = evenR - oddR;
      out[outOff] = leftR;
      out[outOff + 1] = 0;
      out[outOff + 2] = rightR;
      out[outOff + 3] = 0;
    };
    FFT2.prototype._singleRealTransform4 = function _singleRealTransform4(outOff, off, step) {
      const out = this._out;
      const data = this._data;
      const inv = this._inv ? -1 : 1;
      const step2 = step * 2;
      const step3 = step * 3;
      const Ar = data[off];
      const Br = data[off + step];
      const Cr = data[off + step2];
      const Dr = data[off + step3];
      const T0r = Ar + Cr;
      const T1r = Ar - Cr;
      const T2r = Br + Dr;
      const T3r = inv * (Br - Dr);
      const FAr = T0r + T2r;
      const FBr = T1r;
      const FBi = -T3r;
      const FCr = T0r - T2r;
      const FDr = T1r;
      const FDi = T3r;
      out[outOff] = FAr;
      out[outOff + 1] = 0;
      out[outOff + 2] = FBr;
      out[outOff + 3] = FBi;
      out[outOff + 4] = FCr;
      out[outOff + 5] = 0;
      out[outOff + 6] = FDr;
      out[outOff + 7] = FDi;
    };
  }
});

// node_modules/signalsmith-stretch/SignalsmithStretch.mjs
var module = {};
var exports = {};
var SignalsmithStretch = (() => {
  var _scriptName = typeof document != "undefined" ? document.currentScript?.src : void 0;
  return (function(moduleArg = {}) {
    var moduleRtn;
    var Module = moduleArg;
    var readyPromiseResolve, readyPromiseReject;
    var readyPromise = new Promise((resolve, reject) => {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string" && process.type != "renderer";
    var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
    var crypto = globalThis?.crypto || { getRandomValues: (array) => {
      for (var i = 0; i < array.length; i++) array[i] = Math.random() * 256 | 0;
    } };
    var performance2 = globalThis?.performance || { now: (_) => Date.now() };
    var moduleOverrides = Object.assign({}, Module);
    var arguments_ = [];
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var scriptDirectory = "";
    var readAsync, readBinary;
    if (ENVIRONMENT_IS_SHELL) {
      readBinary = (f) => {
        if (typeof readbuffer == "function") {
          return new Uint8Array(readbuffer(f));
        }
        let data = read(f, "binary");
        assert(typeof data == "object");
        return data;
      };
      readAsync = (f) => new Promise((resolve, reject) => {
        setTimeout(() => resolve(readBinary(f)));
      });
      globalThis.clearTimeout ??= (id) => {
      };
      globalThis.setTimeout ??= (f) => f();
      arguments_ = globalThis.arguments || globalThis.scriptArgs;
      if (typeof quit == "function") {
        quit_ = (status, toThrow) => {
          setTimeout(() => {
            if (!(toThrow instanceof ExitStatus)) {
              let toLog = toThrow;
              if (toThrow && typeof toThrow == "object" && toThrow.stack) {
                toLog = [toThrow, toThrow.stack];
              }
              err(`exiting due to exception: ${toLog}`);
            }
            quit(status);
          });
          throw toThrow;
        };
      }
      if (typeof print != "undefined") {
        globalThis.console ??= {};
        console.log = print;
        console.warn = console.error = globalThis.printErr ?? print;
      }
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptName) {
        scriptDirectory = _scriptName;
      }
      if (scriptDirectory.startsWith("blob:")) {
        scriptDirectory = "";
      } else {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      }
      {
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(xhr.response);
          };
        }
        readAsync = (url) => fetch(url, { credentials: "same-origin" }).then((response) => {
          if (response.ok) {
            return response.arrayBuffer();
          }
          return Promise.reject(new Error(response.status + " : " + response.url));
        });
      }
    } else {
    }
    var out = console.log.bind(console);
    var err = console.error.bind(console);
    Object.assign(Module, moduleOverrides);
    moduleOverrides = null;
    var wasmBinary;
    if (typeof atob == "undefined") {
      if (typeof global != "undefined" && typeof globalThis == "undefined") {
        globalThis = global;
      }
      globalThis.atob = function(input) {
        var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        do {
          enc1 = keyStr.indexOf(input.charAt(i++));
          enc2 = keyStr.indexOf(input.charAt(i++));
          enc3 = keyStr.indexOf(input.charAt(i++));
          enc4 = keyStr.indexOf(input.charAt(i++));
          chr1 = enc1 << 2 | enc2 >> 4;
          chr2 = (enc2 & 15) << 4 | enc3 >> 2;
          chr3 = (enc3 & 3) << 6 | enc4;
          output = output + String.fromCharCode(chr1);
          if (enc3 !== 64) {
            output = output + String.fromCharCode(chr2);
          }
          if (enc4 !== 64) {
            output = output + String.fromCharCode(chr3);
          }
        } while (i < input.length);
        return output;
      };
    }
    function intArrayFromBase64(s) {
      var decoded = atob(s);
      var bytes = new Uint8Array(decoded.length);
      for (var i = 0; i < decoded.length; ++i) {
        bytes[i] = decoded.charCodeAt(i);
      }
      return bytes;
    }
    function tryParseAsDataURI(filename) {
      if (!isDataURI(filename)) {
        return;
      }
      return intArrayFromBase64(filename.slice(dataURIPrefix.length));
    }
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module["HEAP8"] = HEAP8 = new Int8Array(b);
      HEAP16 = new Int16Array(b);
      HEAPU8 = new Uint8Array(b);
      HEAPU16 = new Uint16Array(b);
      HEAP32 = new Int32Array(b);
      HEAPU32 = new Uint32Array(b);
      HEAPF32 = new Float32Array(b);
      HEAPF64 = new Float64Array(b);
    }
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATMAIN__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    function preRun() {
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      runtimeInitialized = true;
      callRuntimeCallbacks(__ATINIT__);
    }
    function preMain() {
      callRuntimeCallbacks(__ATMAIN__);
    }
    function postRun() {
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    function addRunDependency(id) {
      runDependencies++;
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var dataURIPrefix = "data:application/octet-stream;base64,";
    var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
    function findWasmBinary() {
      var f = "data:application/octet-stream;base64,AGFzbQEAAAABeBVgAX8AYAJ/fwBgAABgAX8Bf2ACf38Bf2ADf39/AGAAAX9gAX0BfWAEf39/fwBgAXwBfWABfAF8YAl/f39/f39/f38AYAF9AGAHf39/f39/fwBgAn9/AX1gAn1/AGACfX0AYAJ/fQBgAnx/AXxgAn1/AX9gAn98AAIZBAFhAWEABAFhAWIAAwFhAWMABQFhAWQAAgM8OwAEAQMBBwcJCQICCAMKEgULCwwAAQgCBQMHCgUTDQ0BAQEBBgQCAwAABAAAARQMDw8QEAgAERECBgYGBAUBcAEFBQUGAQEIgIACBggBfwFB4LgECwdVFQFlAgABZgAaAWcBAAFoACgBaQAnAWoAPgFrAD0BbAA8AW0AOwFuADoBbwA5AXAANwFxADYBcgA1AXMANAF0ADMBdQAyAXYAMQF3ADABeAAuAXkALQkKAQBBAQsEOC8sKwqfzQM73gsBB38CQCAARQ0AIABBCGsiAyAAQQRrKAIAIgJBeHEiAGohBQJAIAJBAXENACACQQJxRQ0BIAMgAygCACIEayIDQfA0KAIASQ0BIAAgBGohAAJAAkACQEH0NCgCACADRwRAIAMoAgwhASAEQf8BTQRAIAEgAygCCCICRw0CQeA0QeA0KAIAQX4gBEEDdndxNgIADAULIAMoAhghBiABIANHBEAgAygCCCICIAE2AgwgASACNgIIDAQLIAMoAhQiAgR/IANBFGoFIAMoAhAiAkUNAyADQRBqCyEEA0AgBCEHIAIiAUEUaiEEIAEoAhQiAg0AIAFBEGohBCABKAIQIgINAAsgB0EANgIADAMLIAUoAgQiAkEDcUEDRw0DQeg0IAA2AgAgBSACQX5xNgIEIAMgAEEBcjYCBCAFIAA2AgAPCyACIAE2AgwgASACNgIIDAILQQAhAQsgBkUNAAJAIAMoAhwiBEECdEGQN2oiAigCACADRgRAIAIgATYCACABDQFB5DRB5DQoAgBBfiAEd3E2AgAMAgsCQCADIAYoAhBGBEAgBiABNgIQDAELIAYgATYCFAsgAUUNAQsgASAGNgIYIAMoAhAiAgRAIAEgAjYCECACIAE2AhgLIAMoAhQiAkUNACABIAI2AhQgAiABNgIYCyADIAVPDQAgBSgCBCIEQQFxRQ0AAkACQAJAAkAgBEECcUUEQEH4NCgCACAFRgRAQfg0IAM2AgBB7DRB7DQoAgAgAGoiADYCACADIABBAXI2AgQgA0H0NCgCAEcNBkHoNEEANgIAQfQ0QQA2AgAPC0H0NCgCACAFRgRAQfQ0IAM2AgBB6DRB6DQoAgAgAGoiADYCACADIABBAXI2AgQgACADaiAANgIADwsgBEF4cSAAaiEAIAUoAgwhASAEQf8BTQRAIAUoAggiAiABRgRAQeA0QeA0KAIAQX4gBEEDdndxNgIADAULIAIgATYCDCABIAI2AggMBAsgBSgCGCEGIAEgBUcEQCAFKAIIIgIgATYCDCABIAI2AggMAwsgBSgCFCICBH8gBUEUagUgBSgCECICRQ0CIAVBEGoLIQQDQCAEIQcgAiIBQRRqIQQgASgCFCICDQAgAUEQaiEEIAEoAhAiAg0ACyAHQQA2AgAMAgsgBSAEQX5xNgIEIAMgAEEBcjYCBCAAIANqIAA2AgAMAwtBACEBCyAGRQ0AAkAgBSgCHCIEQQJ0QZA3aiICKAIAIAVGBEAgAiABNgIAIAENAUHkNEHkNCgCAEF+IAR3cTYCAAwCCwJAIAUgBigCEEYEQCAGIAE2AhAMAQsgBiABNgIUCyABRQ0BCyABIAY2AhggBSgCECICBEAgASACNgIQIAIgATYCGAsgBSgCFCICRQ0AIAEgAjYCFCACIAE2AhgLIAMgAEEBcjYCBCAAIANqIAA2AgAgA0H0NCgCAEcNAEHoNCAANgIADwsgAEH/AU0EQCAAQXhxQYg1aiECAn9B4DQoAgAiBEEBIABBA3Z0IgBxRQRAQeA0IAAgBHI2AgAgAgwBCyACKAIICyEAIAIgAzYCCCAAIAM2AgwgAyACNgIMIAMgADYCCA8LQR8hASAAQf///wdNBEAgAEEmIABBCHZnIgJrdkEBcSACQQF0a0E+aiEBCyADIAE2AhwgA0IANwIQIAFBAnRBkDdqIQQCfwJAAn9B5DQoAgAiB0EBIAF0IgJxRQRAQeQ0IAIgB3I2AgAgBCADNgIAQRghAUEIDAELIABBGSABQQF2a0EAIAFBH0cbdCEBIAQoAgAhBANAIAQiAigCBEF4cSAARg0CIAFBHXYhBCABQQF0IQEgAiAEQQRxaiIHKAIQIgQNAAsgByADNgIQQRghASACIQRBCAshACADIgIMAQsgAigCCCIEIAM2AgwgAiADNgIIQRghAEEIIQFBAAshByABIANqIAQ2AgAgAyACNgIMIAAgA2ogBzYCAEGANUGANSgCAEEBayIAQX8gABs2AgALC9gCAQJ/AkAgAUUNACAAQQA6AAAgACABaiICQQFrQQA6AAAgAUEDSQ0AIABBADoAAiAAQQA6AAEgAkEDa0EAOgAAIAJBAmtBADoAACABQQdJDQAgAEEAOgADIAJBBGtBADoAACABQQlJDQAgAEEAIABrQQNxIgNqIgJBADYCACACIAEgA2tBfHEiA2oiAUEEa0EANgIAIANBCUkNACACQQA2AgggAkEANgIEIAFBCGtBADYCACABQQxrQQA2AgAgA0EZSQ0AIAJBADYCGCACQQA2AhQgAkEANgIQIAJBADYCDCABQRBrQQA2AgAgAUEUa0EANgIAIAFBGGtBADYCACABQRxrQQA2AgAgAyACQQRxQRhyIgNrIgFBIEkNACACIANqIQIDQCACQgA3AxggAkIANwMQIAJCADcDCCACQgA3AwAgAkEgaiECIAFBIGsiAUEfSw0ACwsgAAv/AQEHfyABIAAoAggiAiAAKAIEIgNrQQJ1TQRAIAAgAQR/IAMgAUECdCIAEAUgAGoFIAMLNgIEDwsCQCADIAAoAgAiBWtBAnUiByABaiIEQYCAgIAESQRAQf////8DIAIgBWsiAkEBdSIIIAQgBCAISRsgAkH8////B08bIgQEQCAEQYCAgIAETw0CIARBAnQQByEGCyAHQQJ0IAZqIgIgAUECdCIBEAUgAWohASADIAVHBEADQCACQQRrIgIgA0EEayIDKgIAOAIAIAMgBUcNAAsLIAAgBiAEQQJ0ajYCCCAAIAE2AgQgACACNgIAIAUEQCAFEAQLDwsQDQALEA4ACzoBAn9BASAAIABBAU0bIQEDQAJAIAEQKiIADQBB0DgoAgAiAkUNACACEQIADAELCyAARQRAECkLIAALhgIBB38gASAAKAIIIgIgACgCBCIDa0EDdU0EQCAAIAEEfyADIAFBA3QiABAFIABqBSADCzYCBA8LAkAgAyAAKAIAIgRrQQN1IgcgAWoiBUGAgICAAkkEQEH/////ASACIARrIgJBAnUiCCAFIAUgCEkbIAJB+P///wdPGyIFBEAgBUGAgICAAk8NAiAFQQN0EAchBgsgB0EDdCAGaiICIAFBA3QiARAFIAFqIQEgAyAERwRAA0AgAkEIayICIANBCGsiAykCADcCACADIARHDQALIAAoAgAhBAsgACAGIAVBA3RqNgIIIAAgATYCBCAAIAI2AgAgBARAIAQQBAsPCxANAAsQDgALgAMCAXwDfyMAQRBrIgQkAAJAIAC8IgNB/////wdxIgJB2p+k+gNNBEAgAkGAgIDMA0kNASAAuxALIQAMAQsgAkHRp+2DBE0EQCAAuyEBIAJB45fbgARNBEAgA0EASARAIAFEGC1EVPsh+T+gEAyMIQAMAwsgAUQYLURU+yH5v6AQDCEADAILRBgtRFT7IQnARBgtRFT7IQlAIANBAE4bIAGgmhALIQAMAQsgAkHV44iHBE0EQCACQd/bv4UETQRAIAC7IQEgA0EASARAIAFE0iEzf3zZEkCgEAwhAAwDCyABRNIhM3982RLAoBAMjCEADAILRBgtRFT7IRlARBgtRFT7IRnAIANBAEgbIAC7oBALIQAMAQsgAkGAgID8B08EQCAAIACTIQAMAQsgACAEQQhqECAhAiAEKwMIIQECQAJAAkACQCACQQNxQQFrDgMBAgMACyABEAshAAwDCyABEAwhAAwCCyABmhALIQAMAQsgARAMjCEACyAEQRBqJAAgAAvmAgIDfwF8IwBBEGsiAyQAAn0gALwiAkH/////B3EiAUHan6T6A00EQEMAAIA/IAFBgICAzANJDQEaIAC7EAwMAQsgAUHRp+2DBE0EQCABQeSX24AETwRARBgtRFT7IQlARBgtRFT7IQnAIAJBAEgbIAC7oBAMjAwCCyAAuyEEIAJBAEgEQCAERBgtRFT7Ifk/oBALDAILRBgtRFT7Ifk/IAShEAsMAQsgAUHV44iHBE0EQCABQeDbv4UETwRARBgtRFT7IRlARBgtRFT7IRnAIAJBAEgbIAC7oBAMDAILIAJBAEgEQETSITN/fNkSwCAAu6EQCwwCCyAAu0TSITN/fNkSwKAQCwwBCyAAIACTIAFBgICA/AdPDQAaIAAgA0EIahAgIQEgAysDCCEEAkACQAJAAkAgAUEDcUEBaw4DAQIDAAsgBBAMDAMLIASaEAsMAgsgBBAMjAwBCyAEEAsLIANBEGokAAtLAQJ8IAAgACAAoiIBoiICIAEgAaKiIAFEp0Y7jIfNxj6iRHTnyuL5ACq/oKIgAiABRLL7bokQEYE/okR3rMtUVVXFv6CiIACgoLYLTwEBfCAAIACiIgAgACAAoiIBoiAARGlQ7uBCk/k+okQnHg/oh8BWv6CiIAFEQjoF4VNVpT+iIABEgV4M/f//37+iRAAAAAAAAPA/oKCgtgsFABADAAsFABANAAuxAgEDfyAAKAIIIgQgACgCACIFa0ECdSADTwRAIAMgACgCBCIEIAVrIgZBAnVLBEAgBCAFRwRAIAUgASAGEBMgACgCBCEECyACIAEgBmoiAWshAyABIAJHBEAgBCABIAMQEwsgACADIARqNgIEDwsgAiABayEDIAEgAkcEQCAFIAEgAxATCyAAIAMgBWo2AgQPCyAFBEAgACAFNgIEIAUQBCAAQQA2AgggAEIANwIAQQAhBAsCQCADQYCAgIAETw0AQf////8DIARBAXUiBSADIAMgBUkbIARB/P///wdPGyIDQYCAgIAETw0AIAAgA0ECdCIEEAciAzYCBCAAIAM2AgAgACADIARqNgIIIAIgAWshBCABIAJHBEAgAyABIAQQHwsgACADIARqNgIEDwsQDQALTwECf0HwLygCACIBIABBB2pBeHEiAmohAAJAIAJBACAAIAFNG0UEQCAAPwBBEHRNDQEgABABDQELQdw0QTA2AgBBfw8LQfAvIAA2AgAgAQu5BAMDfAN/An4CfAJAIAC9QjSIp0H/D3EiBUHJB2tBP0kEQCAFIQQMAQsgBUHJB0kEQCAARAAAAAAAAPA/oA8LIAVBiQhJDQBEAAAAAAAAAAAgAL0iB0KAgICAgICAeFENARogBUH/D08EQCAARAAAAAAAAPA/oA8LIAdCAFMEQCMAQRBrIgREAAAAAAAAABA5AwggBCsDCEQAAAAAAAAAEKIPCyMAQRBrIgREAAAAAAAAAHA5AwggBCsDCEQAAAAAAAAAcKIPCyAAQYAfKwMAokGIHysDACIBoCICIAGhIgFBmB8rAwCiIAFBkB8rAwCiIACgoCIBIAGiIgAgAKIgAUG4HysDAKJBsB8rAwCgoiAAIAFBqB8rAwCiQaAfKwMAoKIgAr0iB6dBBHRB8A9xIgVB8B9qKwMAIAGgoKAhASAFQfgfaikDACAHQi2GfCEIIARFBEACfCAHQoCAgIAIg1AEQCAIQoCAgICAgICIP32/IgAgAaIgAKBEAAAAAAAAAH+iDAELIAhCgICAgICAgPA/fL8iAiABoiIBIAKgIgNEAAAAAAAA8D9jBHwjAEEQayIEIARCgICAgICAgAg3AwggBCsDCEQAAAAAAAAQAKI5AwhEAAAAAAAAAAAgA0QAAAAAAADwP6AiACABIAIgA6GgIANEAAAAAAAA8D8gAKGgoKBEAAAAAAAA8L+gIgAgAEQAAAAAAAAAAGEbBSADC0QAAAAAAAAQAKILDwsgCL8iACABoiAAoAsLqAEAAkAgAUGACE4EQCAARAAAAAAAAOB/oiEAIAFB/w9JBEAgAUH/B2shAQwCCyAARAAAAAAAAOB/oiEAQf0XIAEgAUH9F08bQf4PayEBDAELIAFBgXhKDQAgAEQAAAAAAABgA6IhACABQbhwSwRAIAFByQdqIQEMAQsgAEQAAAAAAABgA6IhAEHwaCABIAFB8GhNG0GSD2ohAQsgACABQf8Haq1CNIa/ogvUAgECfwJAIAAgAUYNACABIAAgAmoiBGtBACACQQF0a00EQCAAIAEgAhAfDwsgACABc0EDcSEDAkACQCAAIAFJBEAgAw0CIABBA3FFDQEDQCACRQ0EIAAgAS0AADoAACABQQFqIQEgAkEBayECIABBAWoiAEEDcQ0ACwwBCwJAIAMNACAEQQNxBEADQCACRQ0FIAAgAkEBayICaiIDIAEgAmotAAA6AAAgA0EDcQ0ACwsgAkEDTQ0AA0AgACACQQRrIgJqIAEgAmooAgA2AgAgAkEDSw0ACwsgAkUNAgNAIAAgAkEBayICaiABIAJqLQAAOgAAIAINAAsMAgsgAkEDTQ0AA0AgACABKAIANgIAIAFBBGohASAAQQRqIQAgAkEEayICQQNLDQALCyACRQ0AA0AgACABLQAAOgAAIABBAWohACABQQFqIQEgAkEBayICDQALCwvNAQEEfSABQQdLBEAgACABQQJ2IAJBAnQgAyAEIAcgCCAFIAYQFCAAIAEgAiAHIAggBSAGECEPCyABQQRHBEAgAgRAQQAhAQNAIAQgAUECdCIAaioCACEJIAQgASACakECdCIHaioCACEKIAAgBWogAyAHaioCACILIAAgA2oqAgAiDJI4AgAgACAGaiAKIAmSOAIAIAUgB2ogDCALkzgCACAGIAdqIAkgCpM4AgAgAUEBaiIBIAJHDQALCw8LIABBBCACIAMgBCAFIAYQIQvNAQEEfSABQQdLBEAgACABQQJ2IAJBAnQgAyAEIAcgCCAFIAYQFSAAIAEgAiAHIAggBSAGECIPCyABQQRHBEAgAgRAQQAhAQNAIAQgAUECdCIAaioCACEJIAQgASACakECdCIHaioCACEKIAAgBWogAyAHaioCACILIAAgA2oqAgAiDJI4AgAgACAGaiAKIAmSOAIAIAUgB2ogDCALkzgCACAGIAdqIAkgCpM4AgAgAUEBaiIBIAJHDQALCw8LIABBBCACIAMgBCAFIAYQIgvuBQIMfwF9QYQyQQA2AgBB9DFBrDIoAgAiAzYCAEH4MSgCACIBQfwxKAIAIgJHBEAgASACIAFrQQRrQXxxQQRqEAUaC0GIMigCACIBQYwyKAIAIgJHBEAgASACIAFrQQRrQXxxQQRqEAUaC0HcMigCACIBQeAyKAIAIgJHBEAgASACIAFrQQhrQXhxQQhqEAUaC0GUMigCACIEQZgyKAIAIgtGIgxFBEAgBCALIARrQQRrQXxxQQRqEAUaC0H0MkEANgIAAkBB2DIoAgBB1DIoAgBrIgUgA2oiASADIAEgA0gbIgcgBUEAIAVBAEobIgFMDQAgAUEBaiECQcgyKAIAIQZBvDIoAgAhCUGwMigCALMhDSAHIAFrQQFxBEAgBCABQQJ0IghqIgogCSABIAVrQQJ0aioCACANlCAGIAhqKgIAlCAKKgIAkjgCACACIQELIAIgB0YNAANAIAQgAUECdCICaiIIIAkgASAFa0ECdGoqAgAgDZQgAiAGaioCAJQgCCoCAJI4AgAgBCABQQFqIgJBAnQiCGoiCiAJIAIgBWtBAnRqKgIAIA2UIAYgCGoqAgCUIAoqAgCSOAIAIAFBAmoiASAHRw0ACwsCQCADQbgyKAIAIgdBf3NqIgJBAEgNACAEIAdBAnRqIQUgAiEBIAMgB2tBA3EiBgRAQQAhAwNAIAQgAUECdCIJaiIIIAgqAgAgBSAJaioCAJI4AgAgAUEBayEBIANBAWoiAyAGRw0ACwsgAkECTQ0AA0AgBCABQQJ0IgJqIgMgAyoCACACIAVqKgIAkjgCACAEIAJBBGsiA2oiBiAGKgIAIAMgBWoqAgCSOAIAIAQgAkEIayICaiIDIAMqAgAgAiAFaioCAJI4AgAgBCABQQNrIgJBAnQiA2oiBiAGKgIAIAMgBWoqAgCSOAIAIAFBBGshASACDQALCyAMRQRAA0AgBCAEKgIAIACUQ2BCog2SOAIAIARBBGoiBCALRw0ACwsgBxAXC4kJAQ9/QawyKAIAIg1BhDIoAgAiDmsiDyAAIAAgD0siARshCQJAAkBBpDIoAgAiDEUNAEGIMigCACEHIAkEQCAJQQJ0IQogDUECdCELIA5BAnQhAyABBEAgAyAHaiEGIAAgCWtBAnQhAiAHIAMgCmogC2tqIQhBACEBIAxBBE8EQCAMQXxxIQcDQCAGIAEgC2wiA2ogChAFGiADIAhqIAIQBRogBiALIAFBAXJsIgNqIAoQBRogAyAIaiACEAUaIAYgCyABQQJybCIDaiAKEAUaIAMgCGogAhAFGiAGIAsgAUEDcmwiA2ogChAFGiADIAhqIAIQBRogAUEEaiEBIARBBGoiBCAHRw0ACwsgDEEDcSIDRQ0CA0AgBiABIAtsIgRqIAoQBRogBCAIaiACEAUaIAFBAWohASAFQQFqIgUgA0cNAAsMAgsgAyAHaiEEQQAhASAMQQRPBEAgDEF8cSEFQQAhBwNAIAQgASALbGogChAFGiAEIAsgAUEBcmxqIAoQBRogBCALIAFBAnJsaiAKEAUaIAQgCyABQQNybGogChAFGiABQQRqIQEgB0EEaiIHIAVHDQALCyAMQQNxIgVFDQEDQCAEIAEgC2xqIAoQBRogAUEBaiEBIAhBAWoiCCAFRw0ACwwBCyAAIA9NDQEgAEECdCEDIA1BAnQhBCAHIA4gDWtBAnRqIQUgDEEETwRAIAxBfHEhAUEAIQcDQCAFIAIgBGxqIAMQBRogBSAEIAJBAXJsaiADEAUaIAUgBCACQQJybGogAxAFGiAFIAQgAkEDcmxqIAMQBRogAkEEaiECIAdBBGoiByABRw0ACwsgDEEDcSIBRQ0AA0AgBSACIARsaiADEAUaIAJBAWohAiAIQQFqIgggAUcNAAsLIAlFDQBBlDIoAgAgDkECdGohBEEAIQFBACECIAlBCE8EQCAJQXhxIQVBACEIA0AgBCACQQJ0aiIDQuCEie2AzJDRDTcCACADQuCEie2AzJDRDTcCCCADQuCEie2AzJDRDTcCECADQuCEie2AzJDRDTcCGCACQQhqIQIgCEEIaiIIIAVHDQALCyAJQQdxIgVFDQADQCAEIAJBAnRqQeCEie0ANgIAIAJBAWohAiABQQFqIgEgBUcNAAsLAkAgACAPTQ0AQZQyKAIAIA4gDWtBAnRqIQYgACAJIgFrQQdxIgUEQEEAIQIDQCAGIAFBAnRqQeCEie0ANgIAIAFBAWohASACQQFqIgIgBUcNAAsLIAkgAGtBeEsNACAGQRxqIQggBkEYaiEPIAZBFGohByAGQRBqIQMgBkEMaiEEIAZBCGohBSAGQQRqIQkDQCAGIAFBAnQiAmpB4ISJ7QA2AgAgAiAJakHghIntADYCACACIAVqQeCEie0ANgIAIAIgBGpB4ISJ7QA2AgAgAiADakHghIntADYCACACIAdqQeCEie0ANgIAIAIgD2pB4ISJ7QA2AgAgAiAIakHghIntADYCACABQQhqIgEgAEcNAAsLQYQyIAAgDmogDXA2AgBB9DJB9DIoAgAgAGo2AgALkA4BHH8CQCABIAAoAgQoAgBrIgIgACgCACIKKALAAiAKKAK0AmoiBSACIAVIGyIHIAooArQDIAooArADIgVrQQJ1IgJLBEAgCkGwA2ogByACaxAGDAELIAIgB00NACAKIAUgB0ECdGo2ArQDCwJAIAooArwDIhVBAEwEQCAKKAKwAiERIAooAvwBIRsMAQsgCigCsAIiESAKKAL8ASIbIBFwIhZrIhcgByAHIBdLGyEFIBYgEWshGiAKKAKAAiEYIAooArADIQQgB0EASgRAIAAoAggoAgAhDSAFQfz///8HcSEQIAVBA3EhHCAHQfz///8HcSELIAdBA3EhHSAHIAVrQQNxIRIgASAHa0ECdCEOIAdBBEkhEyAFIAdrQXxLIQ8DQCANIBlBAnRqKAIAIA5qIQZBACECQQAhDCATRQRAA0AgBCACQQJ0IglqIAYgCWoqAgA4AgAgBCAJQQRyIgNqIAMgBmoqAgA4AgAgBCAJQQhyIgNqIAMgBmoqAgA4AgAgBCAJQQxyIgNqIAMgBmoqAgA4AgAgAkEEaiECIAxBBGoiDCALRw0ACwtBACEIIB0EQANAIAQgAkECdCIDaiADIAZqKgIAOAIAIAJBAWohAiAIQQFqIgggHUcNAAsLIBggESAZbEECdGohBgJAIAVFDQAgBiAWQQJ0aiEUQQAhDEEAIQJBACEJIAVBBE8EQANAIBQgAkECdCIIaiAEIAhqKgIAOAIAIBQgCEEEciIDaiADIARqKgIAOAIAIBQgCEEIciIDaiADIARqKgIAOAIAIBQgCEEMciIDaiADIARqKgIAOAIAIAJBBGohAiAJQQRqIgkgEEcNAAsLIBxFDQADQCAUIAJBAnQiA2ogAyAEaioCADgCACACQQFqIQIgDEEBaiIMIBxHDQALCwJAIAcgF00NACAGIBpBAnRqIQZBACEIIAUhAiASBEADQCAGIAJBAnQiA2ogAyAEaioCADgCACACQQFqIQIgCEEBaiIIIBJHDQALCyAPDQADQCAGIAJBAnQiCWogBCAJaioCADgCACAGIAlBBGoiA2ogAyAEaioCADgCACAGIAlBCGoiA2ogAyAEaioCADgCACAGIAlBDGoiA2ogAyAEaioCADgCACACQQRqIgIgB0kNAAsLIBlBAWoiGSAVRw0ACwwBCyAFRQRAIAcgF00NASAYIBpBAnRqIQ8gB0F8cSEDIAdBA3EhEwNAIA8gDSARbEECdGohDkEAIQtBACEMA0AgDiALQQJ0IgJqIAIgBGoqAgA4AgAgDiACQQRyIgVqIAQgBWoqAgA4AgAgDiACQQhyIgVqIAQgBWoqAgA4AgAgDiACQQxyIgVqIAQgBWoqAgA4AgAgC0EEaiELIAxBBGoiDCADRw0AC0EAIQIgEwRAA0AgDiALQQJ0IgVqIAQgBWoqAgA4AgAgC0EBaiELIAJBAWoiAiATRw0ACwsgDUEBaiINIBVHDQALDAELIAcgF0sEQCAFQXxxIQsgBUEDcSENIAcgBWtBA3EhECAFQQRJIQ4gBSAHa0F8SyETA0AgGCAJIBFsQQJ0aiIPIBZBAnRqIRJBACECQQAhDCAORQRAA0AgEiACQQJ0IgZqIAQgBmoqAgA4AgAgEiAGQQRyIgNqIAMgBGoqAgA4AgAgEiAGQQhyIgNqIAMgBGoqAgA4AgAgEiAGQQxyIgNqIAMgBGoqAgA4AgAgAkEEaiECIAxBBGoiDCALRw0ACwtBACEIIA0EQANAIBIgAkECdCIDaiADIARqKgIAOAIAIAJBAWohAiAIQQFqIgggDUcNAAsLIA8gGkECdGohBkEAIQggBSECIBAEQANAIAYgAkECdCIDaiADIARqKgIAOAIAIAJBAWohAiAIQQFqIgggEEcNAAsLIBNFBEADQCAGIAJBAnQiD2ogBCAPaioCADgCACAGIA9BBGoiA2ogAyAEaioCADgCACAGIA9BCGoiA2ogAyAEaioCADgCACAGIA9BDGoiA2ogAyAEaioCADgCACACQQRqIgIgB0kNAAsLIAlBAWoiCSAVRw0ACwwBCyAFQXxxIRMgBUEDcSEOIBggFkECdGohDwNAIA8gDSARbEECdGohEEEAIQJBACEMIAVBA0sEQANAIBAgAkECdCILaiAEIAtqKgIAOAIAIBAgC0EEciIDaiADIARqKgIAOAIAIBAgC0EIciIDaiADIARqKgIAOAIAIBAgC0EMciIDaiADIARqKgIAOAIAIAJBBGohAiAMQQRqIgwgE0cNAAsLQQAhCCAOBEADQCAQIAJBAnQiA2ogAyAEaioCADgCACACQQFqIQIgCEEBaiIIIA5HDQALCyANQQFqIg0gFUcNAAsLIAogByAbaiARcDYC/AEgCiAKKAKAAyAHajYCgAMgACgCBCABNgIAC74OAQV/IwBBIGsiBiQAQbQzIAA2AgBB+C8gAzoAACACQQFqIQVBrDIgATYCAEGkMiAANgIAQaAyIAA2AgBBECABQQFqQQF2QQFqQQF2IgQgBEEQTxshB0EBIQMDQCADIgBBAXQhAyAAIAdJDQALA0AgACIDQQF0IQAgA0EDdCAESQ0AC0GwMiADQQggAyAEakEBayADbiIAIABBB0YbbEECdCIANgIAQcQwIAAQJkG0MkGwMigCAEEBdjYCAEGoMkGsMigCACIAIAVqIgM2AgACQEGgMigCACADbCIDQfwxKAIAQfgxKAIAIgVrQQJ1IgRLBEBB+DEgAyAEaxAGQawyKAIAIQAMAQsgAyAETw0AQfwxIAUgA0ECdGo2AgALAkBBpDIoAgAgAGwiA0GMMigCAEGIMigCACIFa0ECdSIESwRAQYgyIAMgBGsQBkGsMigCACEADAELIAMgBE8NAEGMMiAFIANBAnRqNgIACwJAQZgyKAIAQZQyKAIAIgRrQQJ1IgMgAEkEQEGUMiAAIANrEAYMAQsgACADTw0AQZgyIAQgAEECdGo2AgALAkBBtDIoAgBBoDIoAgAiAEGkMigCACIDIAAgA0sbbCIAQeAyKAIAQdwyKAIAIgRrQQN1IgNLBEBB3DIgACADaxAIDAELIAAgA08NAEHgMiAEIABBA3RqNgIACwJAQbAyKAIAIgBB7DIoAgBB6DIoAgAiBGtBAnUiA0sEQEHoMiAAIANrEAYMAQsgACADTw0AQewyIAQgAEECdGo2AgALAkBBrDIoAgAiAEHAMigCAEG8MigCACIEa0ECdSIDSwRAQbwyIAAgA2sQBkGsMigCACEADAELIAAgA08NAEHAMiAEIABBAnRqNgIACwJAQcwyKAIAQcgyKAIAIgRrQQJ1IgMgAEkEQEHIMiAAIANrEAYMAQsgACADTw0AQcwyIAQgAEECdGo2AgALIAFBAnZBARAkQwAAgD8QFiACQQIQJEPNzMw9EBZB/DJB9DEoAgA2AgBBgDNB+DEoAgAiAEH8MSgCACIDIAMgAGtBAnUQD0GMM0GEMigCADYCAEGQM0GIMigCACIAQYwyKAIAIgMgAyAAa0ECdRAPQZwzQZQyKAIAIgBBmDIoAgAiAyADIABrQQJ1EA8CQCABIAJqIgBBrDMoAgBBqDMoAgAiAmtBAnUiAUsEQEGoMyAAIAFrEAYMAQsgACABTw0AQawzIAIgAEECdGo2AgALQbgzQbQyKAIAIgA2AgBBtDMoAgAhASAGQQA2AhggBkIANwMQIAZCADcDCCAGQgA3AwAgACABbCAGECUCQAJAQbgzKAIAIgNBAm0iAkHcMygCAEHUMygCACIBa0EDdU0NACACQYCAgIACTw0BQdgzKAIAIQAgAkEDdCICEAciBCACaiEFIAQgACABa2oiBCECIAAgAUcEQANAIAJBCGsiAiAAQQhrIgApAgA3AgAgACABRw0ACwtB3DMgBTYCAEHYMyAENgIAQdQzIAI2AgAgAUUNACABEARBuDMoAgAhAwsCQEHkMygCAEHgMygCACIBa0ECdSIAIANJBEBB4DMgAyAAaxAGQbgzKAIAIQMMAQsgACADTQ0AQeQzIAEgA0ECdGo2AgALAkBB8DMoAgBB7DMoAgAiAWtBAnUiACADSQRAQewzIAMgAGsQBkG4MygCACEDDAELIAAgA00NAEHwMyABIANBAnRqNgIACwJAQfwzKAIAQfgzKAIAIgFrQQN1IgAgA0kEQEH4MyADIABrEAhBuDMoAgAhAwwBCyAAIANNDQBB/DMgASADQQN0ajYCAAsCQCADQbQzKAIAbCIBQYg0KAIAIgBBhDQoAgAiBGtBDG0iAksEQEEAIQQCQCABIAJrIgNBjDQoAgAiBSAAa0EMbU0EQEGINCADBH8gACADQQxsQQxrIgAgAEEMcGtBDGoiABAFIABqBSAACzYCAAwBCwJAIABBhDQoAgAiAWtBDG0iByADaiICQdaq1aoBSQRAQdWq1aoBIAUgAWtBDG0iBUEBdCIIIAIgAiAISRsgBUGq1arVAE8bIgUEQCAFQdaq1aoBTw0CIAVBDGwQByEECyAHQQxsIARqIgIgA0EMbEEMayIDIANBDHBrQQxqIgMQBSADaiEDIAAgAUcEQANAIAJBDGsiAiAAQQxrIgApAgA3AgAgAiAAKAIINgIIIAAgAUcNAAtBhDQoAgAhAQtBjDQgBCAFQQxsajYCAEGINCADNgIAQYQ0IAI2AgAgAQRAIAEQBAsMAgsQDQALEA4AC0G4MygCACEDDAELIAEgAk8NAEGINCAEIAFBDGxqNgIAC0GAMEIANwMAQfwvQX82AgBBiDBCADcDAAJAIANBAmoiAEGsNCgCAEGoNCgCACICa0ECdSIBSwRAQag0IAAgAWsQBgwBCyAAIAFPDQBBrDQgAiAAQQJ0ajYCAAsgBkEgaiQADwsQDQAL/goCC38BfiMAQRBrIgckAEGAMEIANwMAQfwvQX82AgBB+C9BADoAAEG8MEKAgID8g4CAwD83AgBBuDBBADoAAEGwMEEANgIAQZgwQoCAgPyDgICAPzcDAEGUMEEBOgAAQZAwQQA2AgBBiDBBADYCAEGgMUHUABAFGkHEMEHUABAFQZgxQgE3AwBBABAmQZwyQQA2AgBBlDJCADcCAEGMMkIANwIAQYQyQgA3AgBB/DFCADcCAEH0MUIANwIAQbgyQYQBEAUaQcQzQYCAgPwDNgIAQcAzQQA6AABBvDNBfzYCAEHIM0HIABAFGiAHQRAQByICNgIEIAdCjICAgICCgICAfzcCCCACQYgIKAAANgAIIAJBgAgpAAA3AAAgAkEAOgAMIwBBEGsiCCQAIwBBIGsiACQAAn8gB0EEaiICLQALQQd2BEAgAigCAAwBCyACCyEBIAACfyACLQALQQd2BEAgAigCBAwBCyACLQALQf8AcQs2AhwgACABNgIYIABBgAg2AhAgAEGACBAcNgIUIAAgACkCGDcDCCAAIAApAhA3AwAjAEEQayIEJAAgACgCDCAAKAIERgRAIAQgACkCACILNwMAIAQgCzcDCCMAQRBrIgYkACAGIAAoAgw2AgwgBiAEKAIENgIIIwBBEGsiASQAIAZBCGoiAygCACAGQQxqIgUoAgBJIQkgAUEQaiQAIAMgBSAJGygCACEBAkACfyAAKAIIIQMgBCgCACEFAkACQCABQQRPBEAgAyAFckEDcQ0BA0AgAygCACAFKAIARw0CIAVBBGohBSADQQRqIQMgAUEEayIBQQNLDQALCyABRQ0BCwNAIAMtAAAiCSAFLQAAIgpGBEAgBUEBaiEFIANBAWohAyABQQFrIgENAQwCCwsgCSAKawwBC0EACyIBDQBBACEBIAAoAgwiAyAEKAIEIgVGDQBBf0EBIAMgBUkbIQELIAZBEGokACABRSEDCyAEQRBqJAAgAEEgaiQAIANFBEAjAEEQayIFJABBuggQHCEEAn8gAi0AC0EHdgRAIAIoAgQMAQsgAi0AC0H/AHELIQMCfwJ/IwBBEGsiByQAIAhBBGohASADIARqIgBB9////wdNBEACQCAAQQtJBEAgAUIANwIAIAFBADYCCCABIAEtAAtBgAFxIABB/wBxcjoACyABIAEtAAtB/wBxOgALDAELIABBC08EfyAAQQhqQXhxIgYgBkEBayIGIAZBC0YbBUEKC0EBaiIGEAchCCABIAEoAghBgICAgHhxIAZB/////wdxcjYCCCABIAEoAghBgICAgHhyNgIIIAEgCDYCACABIAA2AgQLIAdBEGokACABDAELEA0ACyIALQALQQd2BEAgACgCAAwBCyAACyIAQboIIAQQGyAAIARqIgACfyACLQALQQd2BEAgAigCAAwBCyACCyADEBsgACADaiECIwBBEGsiACQAIABBADoAD0EBIQQDQCAEBEAgAiAALQAPOgAAIARBAWshBCACQQFqIQIMAQsLIABBEGokACAFQRBqJAACfyABLQALQQd2BEAgASgCAAwBC0EACxoQDgALIAhBEGokACAHLAAPQQBIBEAgBygCBBAECyMAQRBrIgIkACMAQRBrIgEkACACQQxqQQQQACIABH9B3DQgADYCAEF/BUEACyABKAIMGiABQRBqJAAEQEHcNCgCABoQDgALIAIoAgwhASACQRBqJABBkDRBASABQf////8HcCICIAJBAU0bNgIAQZw0QgA3AgBBlDRCADcCAEGoNEIANwMAQbA0QgA3AwAgB0EQaiQAQbg0QgA3AgBBwDRBADYCAEHENEIANwIAQcw0QQA2AgBB0DRCADcCAEHYNEEANgIAC+gBAQR/IwBBEGsiBiQAIwBBIGsiAyQAIwBBEGsiBCQAIAQg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";
      return f;
    }
    var wasmBinaryFile;
    function getBinarySync(file) {
      if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary);
      }
      var binary = tryParseAsDataURI(file);
      if (binary) {
        return binary;
      }
      if (readBinary) {
        return readBinary(file);
      }
      throw "both async and sync fetching of the wasm failed";
    }
    function getBinaryPromise(binaryFile) {
      return Promise.resolve().then(() => getBinarySync(binaryFile));
    }
    function instantiateArrayBuffer(binaryFile, imports, receiver) {
      return getBinaryPromise(binaryFile).then((binary) => WebAssembly.instantiate(binary, imports)).then(receiver, (reason) => {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        abort(reason);
      });
    }
    function instantiateAsync(binary, binaryFile, imports, callback) {
      return instantiateArrayBuffer(binaryFile, imports, callback);
    }
    function getWasmImports() {
      return { a: wasmImports };
    }
    function createWasm() {
      function receiveInstance(instance, module2) {
        wasmExports = instance.exports;
        wasmMemory = wasmExports["e"];
        updateMemoryViews();
        addOnInit(wasmExports["f"]);
        removeRunDependency("wasm-instantiate");
        return wasmExports;
      }
      addRunDependency("wasm-instantiate");
      function receiveInstantiationResult(result) {
        receiveInstance(result["instance"]);
      }
      var info = getWasmImports();
      wasmBinaryFile ??= findWasmBinary();
      instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
      return {};
    }
    class ExitStatus {
      name = "ExitStatus";
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }
    var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module);
      }
    };
    var __abort_js = () => abort("");
    var __emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);
    var getHeapMax = () => 2147483648;
    var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
    var abortOnCannotGrowMemory = (requestedSize) => {
      abort("OOM");
    };
    var growMemory = (size) => {
      var b = wasmMemory.buffer;
      var pages = (size - b.byteLength + 65535) / 65536 | 0;
      try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1;
      } catch (e) {
      }
    };
    var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        abortOnCannotGrowMemory(requestedSize);
      }
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.5 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      abortOnCannotGrowMemory(requestedSize);
    };
    var initRandomFill = () => {
      if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
        return (view) => crypto.getRandomValues(view);
      } else abort("initRandomDevice");
    };
    var randomFill = (view) => (randomFill = initRandomFill())(view);
    var _random_get = (buffer, size) => {
      randomFill(HEAPU8.subarray(buffer, buffer + size));
      return 0;
    };
    var keepRuntimeAlive = () => true;
    var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
    var exitJS = (status, implicit) => {
      EXITSTATUS = status;
      _proc_exit(status);
    };
    var handleException = (e) => {
      if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS;
      }
      quit_(1, e);
    };
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
    var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    };
    var UTF8ToString = (ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    var wasmImports = { d: __abort_js, c: __emscripten_memcpy_js, b: _emscripten_resize_heap, a: _random_get };
    var wasmExports = createWasm();
    var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["f"])();
    var _setBuffers = Module["_setBuffers"] = (a0, a1) => (_setBuffers = Module["_setBuffers"] = wasmExports["h"])(a0, a1);
    var _blockSamples = Module["_blockSamples"] = () => (_blockSamples = Module["_blockSamples"] = wasmExports["i"])();
    var _intervalSamples = Module["_intervalSamples"] = () => (_intervalSamples = Module["_intervalSamples"] = wasmExports["j"])();
    var _inputLatency = Module["_inputLatency"] = () => (_inputLatency = Module["_inputLatency"] = wasmExports["k"])();
    var _outputLatency = Module["_outputLatency"] = () => (_outputLatency = Module["_outputLatency"] = wasmExports["l"])();
    var _reset = Module["_reset"] = () => (_reset = Module["_reset"] = wasmExports["m"])();
    var _presetDefault = Module["_presetDefault"] = (a0, a1) => (_presetDefault = Module["_presetDefault"] = wasmExports["n"])(a0, a1);
    var _presetCheaper = Module["_presetCheaper"] = (a0, a1) => (_presetCheaper = Module["_presetCheaper"] = wasmExports["o"])(a0, a1);
    var _configure = Module["_configure"] = (a0, a1, a2, a3) => (_configure = Module["_configure"] = wasmExports["p"])(a0, a1, a2, a3);
    var _setTransposeFactor = Module["_setTransposeFactor"] = (a0, a1) => (_setTransposeFactor = Module["_setTransposeFactor"] = wasmExports["q"])(a0, a1);
    var _setTransposeSemitones = Module["_setTransposeSemitones"] = (a0, a1) => (_setTransposeSemitones = Module["_setTransposeSemitones"] = wasmExports["r"])(a0, a1);
    var _setFormantFactor = Module["_setFormantFactor"] = (a0, a1) => (_setFormantFactor = Module["_setFormantFactor"] = wasmExports["s"])(a0, a1);
    var _setFormantSemitones = Module["_setFormantSemitones"] = (a0, a1) => (_setFormantSemitones = Module["_setFormantSemitones"] = wasmExports["t"])(a0, a1);
    var _setFormantBase = Module["_setFormantBase"] = (a0) => (_setFormantBase = Module["_setFormantBase"] = wasmExports["u"])(a0);
    var _seek = Module["_seek"] = (a0, a1) => (_seek = Module["_seek"] = wasmExports["v"])(a0, a1);
    var _process = Module["_process"] = (a0, a1) => (_process = Module["_process"] = wasmExports["w"])(a0, a1);
    var _flush = Module["_flush"] = (a0) => (_flush = Module["_flush"] = wasmExports["x"])(a0);
    var _main = Module["_main"] = (a0, a1) => (_main = Module["_main"] = wasmExports["y"])(a0, a1);
    Module["UTF8ToString"] = UTF8ToString;
    var calledRun;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function callMain() {
      var entryFunction = _main;
      var argc = 0;
      var argv = 0;
      try {
        var ret = entryFunction(argc, argv);
        exitJS(ret, true);
        return ret;
      } catch (e) {
        return handleException(e);
      }
    }
    function run() {
      if (runDependencies > 0) {
        return;
      }
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        preMain();
        readyPromiseResolve(Module);
        if (shouldRunNow) callMain();
        postRun();
      }
      {
        doRun();
      }
    }
    var shouldRunNow = true;
    run();
    moduleRtn = readyPromise;
    return moduleRtn;
  });
})();
if (typeof exports === "object" && typeof module === "object")
  module.exports = SignalsmithStretch;
else if (typeof define === "function" && define["amd"])
  define([], () => SignalsmithStretch);
function registerWorkletProcessor(Module, audioNodeKey) {
  class WasmProcessor extends AudioWorkletProcessor {
    constructor(options) {
      super(options);
      this.wasmReady = false;
      this.wasmModule = null;
      this.channels = 0;
      this.buffersIn = [];
      this.buffersOut = [];
      this.audioBuffers = [];
      this.audioBuffersStart = 0;
      this.audioBuffersEnd = 0;
      this.timeIntervalSamples = sampleRate * 0.1;
      this.timeIntervalCounter = 0;
      this.timeMap = [{
        active: false,
        input: 0,
        output: 0,
        rate: 1,
        semitones: 0,
        tonalityHz: 8e3,
        formantSemitones: 0,
        formantCompensation: false,
        formantBaseHz: 0,
        /* 0 = attempt to detect */
        loopStart: 0,
        loopEnd: 0
      }];
      let remoteMethods = {
        configure: (config) => {
          Object.assign(this.config, config);
          this.configure();
        },
        latency: (_) => {
          return this.inputLatencySeconds + this.outputLatencySeconds;
        },
        setUpdateInterval: (seconds) => {
          this.timeIntervalSamples = sampleRate * seconds;
        },
        stop: (when) => {
          if (typeof when !== "number") when = currentTime;
          return remoteMethods.schedule({ active: false, output: when });
        },
        start: (when, offset, duration, rate, semitones) => {
          if (typeof when === "object") {
            if (!("active" in when)) when.active = true;
            return remoteMethods.schedule(when);
          }
          let obj = { active: true, input: 0, output: currentTime + this.outputLatencySeconds };
          if (typeof when === "number") obj.output = when;
          if (typeof offset === "number") obj.input = offset;
          if (typeof rate === "number") obj.rate = rate;
          if (typeof semitones === "number") obj.semitones = semitones;
          let result = remoteMethods.schedule(obj);
          if (typeof duration === "number") {
            remoteMethods.stop(obj.output + duration);
            obj.output += duration;
            obj.active = false;
            remoteMethods.schedule(obj);
          }
          return result;
        },
        schedule: (objIn, adjustPrevious) => {
          let outputTime = "outputTime" in objIn ? objIn.outputTime : currentTime;
          let latestSegment = this.timeMap[this.timeMap.length - 1];
          while (this.timeMap.length && this.timeMap[this.timeMap.length - 1].output >= outputTime) {
            latestSegment = this.timeMap.pop();
          }
          let obj = Object.assign({}, latestSegment);
          Object.assign(obj, {
            input: null,
            output: outputTime
          });
          Object.assign(obj, objIn);
          if (obj.input === null) {
            let rate2 = latestSegment.active ? latestSegment.rate : 0;
            obj.input = latestSegment.input + (obj.output - latestSegment.output) * rate2;
          }
          this.timeMap.push(obj);
          if (adjustPrevious && this.timeMap.length > 1) {
            let previous = this.timeMap[this.timeMap.length - 2];
            if (previous.output < currentTime) {
              let rate2 = previous.active ? previous.rate : 0;
              previous.input += (currentTime - previous.output) * rate2;
              previous.output = currentTime;
            }
            previous.rate = (obj.input - previous.input) / (obj.output - previous.output);
          }
          let currentMapSegment = this.timeMap[0];
          while (this.timeMap.length > 1 && this.timeMap[1].output <= outputTime) {
            this.timeMap.shift();
            currentMapSegment = this.timeMap[0];
          }
          let rate = currentMapSegment.active ? currentMapSegment.rate : 0;
          let inputTime = currentMapSegment.input + (outputTime - currentMapSegment.output) * rate;
          this.timeIntervalCounter = this.timeIntervalSamples;
          this.port.postMessage(["time", inputTime]);
          return obj;
        },
        dropBuffers: (toSeconds) => {
          if (typeof toSeconds !== "number") {
            let buffers = this.audioBuffers.flat(1).map((b) => b.buffer);
            this.audioBuffers = [];
            this.audioBuffersStart = this.audioBuffersEnd = 0;
            return {
              value: { start: 0, end: 0 },
              transfer: buffers
            };
          }
          let transfer = [];
          while (this.audioBuffers.length) {
            let first = this.audioBuffers[0];
            let length = first[0].length;
            let endSamples = this.audioBuffersStart + length;
            let endSeconds = endSamples / sampleRate;
            if (endSeconds > toSeconds) break;
            this.audioBuffers.shift().forEach((b) => transfer.push(b.buffer));
            this.audioBuffersStart += length;
          }
          return {
            value: {
              start: this.audioBuffersStart / sampleRate,
              end: this.audioBuffersEnd / sampleRate
            },
            transfer
          };
        },
        addBuffers: (sampleBuffers) => {
          sampleBuffers = [].concat(sampleBuffers);
          this.audioBuffers.push(sampleBuffers);
          let length = sampleBuffers[0].length;
          this.audioBuffersEnd += length;
          return this.audioBuffersEnd / sampleRate;
        }
      };
      let pendingMessages = [];
      this.port.onmessage = (event) => pendingMessages.push(event);
      Module().then((wasmModule) => {
        this.wasmModule = wasmModule;
        this.wasmReady = true;
        wasmModule._main();
        this.channels = options.numberOfOutputs ? options.outputChannelCount[0] : 2;
        this.configure();
        this.port.onmessage = (event) => {
          let data = event.data;
          let messageId = data.shift();
          let method = data.shift();
          let result = remoteMethods[method](...data);
          if (result?.transfer) {
            this.port.postMessage([messageId, result.value], result.transfer);
          } else {
            this.port.postMessage([messageId, result]);
          }
        };
        let methodArgCounts = {};
        for (let key in remoteMethods) {
          methodArgCounts[key] = remoteMethods[key].length;
        }
        this.port.postMessage(["ready", methodArgCounts]);
        pendingMessages.forEach(this.port.onmessage);
        pendingMessages = null;
      });
    }
    config = {
      preset: "default"
    };
    configure() {
      if (this.config.blockMs) {
        let blockSamples = Math.round(this.config.blockMs / 1e3 * sampleRate);
        let intervalSamples = Math.round((this.config.intervalMs || this.config.blockMs * 0.25) / 1e3 * sampleRate);
        let splitComputation = this.config.splitComputation;
        this.wasmModule._configure(this.channels, blockSamples, intervalSamples, splitComputation);
        this.wasmModule._reset();
      } else if (this.config.preset == "cheaper") {
        this.wasmModule._presetCheaper(this.channels, sampleRate);
      } else {
        this.wasmModule._presetDefault(this.channels, sampleRate);
      }
      this.updateBuffers();
      this.inputLatencySeconds = this.wasmModule._inputLatency() / sampleRate;
      this.outputLatencySeconds = this.wasmModule._outputLatency() / sampleRate;
    }
    updateBuffers() {
      let wasmModule = this.wasmModule;
      this.bufferLength = wasmModule._inputLatency() + wasmModule._outputLatency();
      let lengthBytes = this.bufferLength * 4;
      let bufferPointer = wasmModule._setBuffers(this.channels, this.bufferLength);
      this.buffersIn = [];
      this.buffersOut = [];
      for (let c = 0; c < this.channels; ++c) {
        this.buffersIn.push(bufferPointer + lengthBytes * c);
        this.buffersOut.push(bufferPointer + lengthBytes * (c + this.channels));
      }
    }
    process(inputList, outputList, parameters) {
      if (!this.wasmReady) {
        outputList.forEach((output) => {
          output.forEach((channel) => {
            channel.fill(0);
          });
        });
        return true;
      }
      if (!outputList[0]?.length) return false;
      let outputTime = currentTime + this.outputLatencySeconds;
      while (this.timeMap.length > 1 && this.timeMap[1].output <= outputTime) {
        this.timeMap.shift();
      }
      let currentMapSegment = this.timeMap[0];
      let wasmModule = this.wasmModule;
      wasmModule._setTransposeSemitones(currentMapSegment.semitones, currentMapSegment.tonalityHz / sampleRate);
      wasmModule._setFormantSemitones(currentMapSegment.formantSemitones, currentMapSegment.formantCompensation);
      wasmModule._setFormantBase(currentMapSegment.formantBaseHz / sampleRate);
      if (outputList[0].length != this.channels) {
        this.channels = outputList[0]?.length || 0;
        configure();
      }
      let outputBlockSize = outputList[0][0].length;
      let memory = wasmModule.exports ? wasmModule.exports.memory.buffer : wasmModule.HEAP8.buffer;
      let inputs = inputList[0];
      if (!currentMapSegment.active) {
        outputList[0].forEach((_, c) => {
          let channelBuffer = inputs[c % inputs.length];
          let buffer = new Float32Array(memory, this.buffersIn[c], outputBlockSize);
          buffer.fill(0);
        });
        wasmModule._process(outputBlockSize, outputBlockSize);
      } else if (inputs?.length) {
        outputList[0].forEach((_, c) => {
          let channelBuffer = inputs[c % inputs.length];
          let buffer = new Float32Array(memory, this.buffersIn[c], outputBlockSize);
          if (channelBuffer) {
            buffer.set(channelBuffer);
          } else {
            buffer.fill(0);
          }
        });
        wasmModule._process(outputBlockSize, outputBlockSize);
      } else {
        let inputTime = currentMapSegment.input + (outputTime - currentMapSegment.output) * currentMapSegment.rate;
        let loopLength = currentMapSegment.loopEnd - currentMapSegment.loopStart;
        if (loopLength > 0 && inputTime >= currentMapSegment.loopEnd) {
          currentMapSegment.input -= loopLength;
          inputTime -= loopLength;
        }
        inputTime += this.inputLatencySeconds;
        let inputSamplesEnd = Math.round(inputTime * sampleRate);
        let buffers = outputList[0].map((_, c) => new Float32Array(memory, this.buffersIn[c], this.bufferLength));
        let blockSamples = 0;
        let audioBufferIndex = 0;
        let audioSamples = this.audioBuffersStart;
        let inputSamples = inputSamplesEnd - this.bufferLength;
        if (inputSamples < audioSamples) {
          blockSamples = audioSamples - inputSamples;
          buffers.forEach((b) => b.fill(0, 0, blockSamples));
          inputSamples = audioSamples;
        }
        while (audioBufferIndex < this.audioBuffers.length && audioSamples < inputSamplesEnd) {
          let audioBuffer = this.audioBuffers[audioBufferIndex];
          let startIndex = inputSamples - audioSamples;
          let bufferEnd = audioSamples + audioBuffer[0].length;
          let count = Math.min(audioBuffer[0].length - startIndex, inputSamplesEnd - inputSamples);
          if (count > 0) {
            buffers.forEach((buffer, c) => {
              let channelBuffer = audioBuffer[c % audioBuffer.length];
              buffer.subarray(blockSamples).set(channelBuffer.subarray(startIndex, startIndex + count));
            });
            audioSamples += count;
            blockSamples += count;
          } else {
            audioSamples += audioBuffer[0].length;
          }
          ++audioBufferIndex;
        }
        if (blockSamples < this.bufferLength) {
          buffers.forEach((buffer) => buffer.subarray(blockSamples).fill(0));
        }
        wasmModule._seek(this.bufferLength, currentMapSegment.rate);
        wasmModule._process(0, outputBlockSize);
        this.timeIntervalCounter -= outputBlockSize;
        if (this.timeIntervalCounter <= 0) {
          this.timeIntervalCounter = this.timeIntervalSamples;
          this.port.postMessage(["time", inputTime]);
        }
      }
      memory = wasmModule.exports ? wasmModule.exports.memory.buffer : wasmModule.HEAP8.buffer;
      outputList[0].forEach((channelBuffer, c) => {
        let buffer = new Float32Array(memory, this.buffersOut[c], outputBlockSize);
        channelBuffer.set(buffer);
      });
      return true;
    }
  }
  registerProcessor(audioNodeKey, WasmProcessor);
}
SignalsmithStretch = ((Module, audioNodeKey) => {
  if (typeof AudioWorkletProcessor === "function" && typeof registerProcessor === "function") {
    registerWorkletProcessor(Module, audioNodeKey);
    return {};
  }
  let promiseKey = /* @__PURE__ */ Symbol();
  let createNode = async function(audioContext, options) {
    let audioNode;
    options = options || {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    };
    try {
      audioNode = new AudioWorkletNode(audioContext, audioNodeKey, options);
    } catch (e) {
      if (!audioContext[promiseKey]) {
        let moduleUrl = createNode.moduleUrl;
        if (!moduleUrl) {
          let moduleCode = `(${registerWorkletProcessor})((_scriptName=>${Module})(),${JSON.stringify(audioNodeKey)})`;
          moduleUrl = URL.createObjectURL(new Blob([moduleCode], { type: "text/javascript" }));
        }
        audioContext[promiseKey] = audioContext.audioWorklet.addModule(moduleUrl);
      }
      await audioContext[promiseKey];
      audioNode = new AudioWorkletNode(audioContext, audioNodeKey, options);
    }
    let requestMap = {};
    let idCounter = 0;
    let timeUpdateCallback = null;
    let post = (transfer, ...data) => {
      let id = idCounter++;
      return new Promise((resolve) => {
        requestMap[id] = resolve;
        audioNode.port.postMessage([id].concat(data), transfer);
      });
    };
    audioNode.inputTime = 0;
    audioNode.port.onmessage = (event) => {
      let data = event.data;
      let id = data[0], value = data[1];
      if (id == "time") {
        audioNode.inputTime = value;
        if (timeUpdateCallback) timeUpdateCallback(value);
      }
      if (id in requestMap) {
        requestMap[id](value);
        delete requestMap[id];
      }
    };
    return new Promise((resolve) => {
      requestMap["ready"] = (remoteMethodKeys) => {
        Object.keys(remoteMethodKeys).forEach((key) => {
          let argCount = remoteMethodKeys[key];
          audioNode[key] = (...args) => {
            let transfer = null;
            if (args.length > argCount) {
              transfer = args.pop();
            }
            return post(transfer, key, ...args);
          };
        });
        audioNode.setUpdateInterval = (seconds, callback) => {
          timeUpdateCallback = callback;
          return post(null, "setUpdateInterval", seconds);
        };
        resolve(audioNode);
      };
    });
  };
  return createNode;
})(SignalsmithStretch, "signalsmith-stretch");
if (typeof exports === "object" && typeof module === "object") {
  module.exports = SignalsmithStretch;
} else if (typeof define === "function" && define["amd"]) {
  define([], () => SignalsmithStretch);
}
var _export = SignalsmithStretch;
var SignalsmithStretch_default = _export;

// node_modules/pitchy/index.js
var import_fft = __toESM(require_fft(), 1);
var Autocorrelator = class _Autocorrelator {
  /** @private @readonly @type {number} */
  _inputLength;
  /** @private @type {FFT} */
  _fft;
  /** @private @type {(size: number) => T} */
  _bufferSupplier;
  /** @private @type {T} */
  _paddedInputBuffer;
  /** @private @type {T} */
  _transformBuffer;
  /** @private @type {T} */
  _inverseBuffer;
  /**
   * A helper method to create an {@link Autocorrelator} using
   * {@link Float32Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {Autocorrelator<Float32Array>}
   */
  static forFloat32Array(inputLength) {
    return new _Autocorrelator(
      inputLength,
      (length) => new Float32Array(length)
    );
  }
  /**
   * A helper method to create an {@link Autocorrelator} using
   * {@link Float64Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {Autocorrelator<Float64Array>}
   */
  static forFloat64Array(inputLength) {
    return new _Autocorrelator(
      inputLength,
      (length) => new Float64Array(length)
    );
  }
  /**
   * A helper method to create an {@link Autocorrelator} using `number[]`
   * buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {Autocorrelator<number[]>}
   */
  static forNumberArray(inputLength) {
    return new _Autocorrelator(inputLength, (length) => Array(length));
  }
  /**
   * Constructs a new {@link Autocorrelator} able to handle input arrays of the
   * given length.
   *
   * @param inputLength {number} the input array length to support. This
   * `Autocorrelator` will only support operation on arrays of this length.
   * @param bufferSupplier {(length: number) => T} the function to use for
   * creating buffers, accepting the length of the buffer to create and
   * returning a new buffer of that length. The values of the returned buffer
   * need not be initialized in any particular way.
   */
  constructor(inputLength, bufferSupplier) {
    if (inputLength < 1) {
      throw new Error(`Input length must be at least one`);
    }
    this._inputLength = inputLength;
    this._fft = new import_fft.default(ceilPow2(2 * inputLength));
    this._bufferSupplier = bufferSupplier;
    this._paddedInputBuffer = this._bufferSupplier(this._fft.size);
    this._transformBuffer = this._bufferSupplier(2 * this._fft.size);
    this._inverseBuffer = this._bufferSupplier(2 * this._fft.size);
  }
  /**
   * Returns the supported input length.
   *
   * @returns {number} the supported input length
   */
  get inputLength() {
    return this._inputLength;
  }
  /**
   * Autocorrelates the given input data.
   *
   * @param input {ArrayLike<number>} the input data to autocorrelate
   * @param output {T} the output buffer into which to write the autocorrelated
   * data. If not provided, a new buffer will be created.
   * @returns {T} `output`
   */
  autocorrelate(input, output = this._bufferSupplier(input.length)) {
    if (input.length !== this._inputLength) {
      throw new Error(
        `Input must have length ${this._inputLength} but had length ${input.length}`
      );
    }
    for (let i = 0; i < input.length; i++) {
      this._paddedInputBuffer[i] = input[i];
    }
    for (let i = input.length; i < this._paddedInputBuffer.length; i++) {
      this._paddedInputBuffer[i] = 0;
    }
    this._fft.realTransform(this._transformBuffer, this._paddedInputBuffer);
    this._fft.completeSpectrum(this._transformBuffer);
    const tb = this._transformBuffer;
    for (let i = 0; i < tb.length; i += 2) {
      tb[i] = tb[i] * tb[i] + tb[i + 1] * tb[i + 1];
      tb[i + 1] = 0;
    }
    this._fft.inverseTransform(this._inverseBuffer, this._transformBuffer);
    for (let i = 0; i < input.length; i++) {
      output[i] = this._inverseBuffer[2 * i];
    }
    return output;
  }
};
function getKeyMaximumIndices(input) {
  const keyIndices = [];
  let lookingForMaximum = false;
  let max = -Infinity;
  let maxIndex = -1;
  for (let i = 1; i < input.length - 1; i++) {
    if (input[i - 1] <= 0 && input[i] > 0) {
      lookingForMaximum = true;
      maxIndex = i;
      max = input[i];
    } else if (input[i - 1] > 0 && input[i] <= 0) {
      lookingForMaximum = false;
      if (maxIndex !== -1) {
        keyIndices.push(maxIndex);
      }
    } else if (lookingForMaximum && input[i] > max) {
      max = input[i];
      maxIndex = i;
    }
  }
  return keyIndices;
}
function refineResultIndex(index, data) {
  const [x0, x1, x2] = [index - 1, index, index + 1];
  const [y0, y1, y2] = [data[x0], data[x1], data[x2]];
  const a = y0 / 2 - y1 + y2 / 2;
  const b = -(y0 / 2) * (x1 + x2) + y1 * (x0 + x2) - y2 / 2 * (x0 + x1);
  const c = y0 * x1 * x2 / 2 - y1 * x0 * x2 + y2 * x0 * x1 / 2;
  const xMax = -b / (2 * a);
  const yMax = a * xMax * xMax + b * xMax + c;
  return [xMax, yMax];
}
var PitchDetector = class _PitchDetector {
  /** @private @type {Autocorrelator<T>} */
  _autocorrelator;
  /** @private @type {T} */
  _nsdfBuffer;
  /** @private @type {number} */
  _clarityThreshold = 0.9;
  /** @private @type {number} */
  _minVolumeAbsolute = 0;
  /** @private @type {number} */
  _maxInputAmplitude = 1;
  /**
   * A helper method to create an {@link PitchDetector} using {@link Float32Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<Float32Array>}
   */
  static forFloat32Array(inputLength) {
    return new _PitchDetector(inputLength, (length) => new Float32Array(length));
  }
  /**
   * A helper method to create an {@link PitchDetector} using {@link Float64Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<Float64Array>}
   */
  static forFloat64Array(inputLength) {
    return new _PitchDetector(inputLength, (length) => new Float64Array(length));
  }
  /**
   * A helper method to create an {@link PitchDetector} using `number[]` buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<number[]>}
   */
  static forNumberArray(inputLength) {
    return new _PitchDetector(inputLength, (length) => Array(length));
  }
  /**
   * Constructs a new {@link PitchDetector} able to handle input arrays of the
   * given length.
   *
   * @param inputLength {number} the input array length to support. This
   * `PitchDetector` will only support operation on arrays of this length.
   * @param bufferSupplier {(inputLength: number) => T} the function to use for
   * creating buffers, accepting the length of the buffer to create and
   * returning a new buffer of that length. The values of the returned buffer
   * need not be initialized in any particular way.
   */
  constructor(inputLength, bufferSupplier) {
    this._autocorrelator = new Autocorrelator(inputLength, bufferSupplier);
    this._nsdfBuffer = bufferSupplier(inputLength);
  }
  /**
   * Returns the supported input length.
   *
   * @returns {number} the supported input length
   */
  get inputLength() {
    return this._autocorrelator.inputLength;
  }
  /**
   * Sets the clarity threshold used when identifying the correct pitch (the constant
   * `k` from the MPM paper). The value must be between 0 (exclusive) and 1
   * (inclusive), with the most suitable range being between 0.8 and 1.
   *
   * @param threshold {number} the clarity threshold
   */
  set clarityThreshold(threshold) {
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
      throw new Error("clarityThreshold must be a number in the range (0, 1]");
    }
    this._clarityThreshold = threshold;
  }
  /**
   * Sets the minimum detectable volume, as an absolute number between 0 and
   * `maxInputAmplitude`, inclusive, to consider in a sample when detecting the
   * pitch. If a sample fails to meet this minimum volume, `findPitch` will
   * return a clarity of 0.
   *
   * Volume is calculated as the RMS (root mean square) of the input samples.
   *
   * @param volume {number} the minimum volume as an absolute amplitude value
   */
  set minVolumeAbsolute(volume) {
    if (!Number.isFinite(volume) || volume < 0 || volume > this._maxInputAmplitude) {
      throw new Error(
        `minVolumeAbsolute must be a number in the range [0, ${this._maxInputAmplitude}]`
      );
    }
    this._minVolumeAbsolute = volume;
  }
  /**
   * Sets the minimum volume using a decibel measurement. Must be less than or
   * equal to 0: 0 indicates the loudest possible sound (see
   * `maxInputAmplitude`), -10 is a sound with a tenth of the volume of the
   * loudest possible sound, etc.
   *
   * Volume is calculated as the RMS (root mean square) of the input samples.
   *
   * @param db {number} the minimum volume in decibels, with 0 being the loudest
   * sound
   */
  set minVolumeDecibels(db) {
    if (!Number.isFinite(db) || db > 0) {
      throw new Error("minVolumeDecibels must be a number <= 0");
    }
    this._minVolumeAbsolute = this._maxInputAmplitude * 10 ** (db / 10);
  }
  /**
   * Sets the maximum amplitude of an input reading. Must be greater than 0.
   *
   * @param amplitude {number} the maximum amplitude (absolute value) of an input reading
   */
  set maxInputAmplitude(amplitude) {
    if (!Number.isFinite(amplitude) || amplitude <= 0) {
      throw new Error("maxInputAmplitude must be a number > 0");
    }
    this._maxInputAmplitude = amplitude;
  }
  /**
   * Returns the pitch detected using McLeod Pitch Method (MPM) along with a
   * measure of its clarity.
   *
   * The clarity is a value between 0 and 1 (potentially inclusive) that
   * represents how "clear" the pitch was. A clarity value of 1 indicates that
   * the pitch was very distinct, while lower clarity values indicate less
   * definite pitches.
   *
   * @param input {ArrayLike<number>} the time-domain input data
   * @param sampleRate {number} the sample rate at which the input data was
   * collected
   * @returns {[number, number]} the detected pitch, in Hz, followed by the
   * clarity. If a pitch cannot be determined from the input, such as if the
   * volume is too low (see `minVolumeAbsolute` and `minVolumeDecibels`), this
   * will be `[0, 0]`.
   */
  findPitch(input, sampleRate2) {
    if (this._belowMinimumVolume(input)) return [0, 0];
    this._nsdf(input);
    const keyMaximumIndices = getKeyMaximumIndices(this._nsdfBuffer);
    if (keyMaximumIndices.length === 0) {
      return [0, 0];
    }
    const nMax = Math.max(...keyMaximumIndices.map((i) => this._nsdfBuffer[i]));
    const resultIndex = keyMaximumIndices.find(
      (i) => this._nsdfBuffer[i] >= this._clarityThreshold * nMax
    );
    const [refinedResultIndex, clarity] = refineResultIndex(
      // @ts-expect-error resultIndex is guaranteed to be defined
      resultIndex,
      this._nsdfBuffer
    );
    return [sampleRate2 / refinedResultIndex, Math.min(clarity, 1)];
  }
  /**
   * Returns whether the input audio data is below the minimum volume allowed by
   * the pitch detector.
   *
   * @private
   * @param input {ArrayLike<number>}
   * @returns {boolean}
   */
  _belowMinimumVolume(input) {
    if (this._minVolumeAbsolute === 0) return false;
    let squareSum = 0;
    for (let i = 0; i < input.length; i++) {
      squareSum += input[i] ** 2;
    }
    return Math.sqrt(squareSum / input.length) < this._minVolumeAbsolute;
  }
  /**
   * Computes the NSDF of the input and stores it in the internal buffer. This
   * is equation (9) in the McLeod pitch method paper.
   *
   * @private
   * @param input {ArrayLike<number>}
   */
  _nsdf(input) {
    this._autocorrelator.autocorrelate(input, this._nsdfBuffer);
    let m = 2 * this._nsdfBuffer[0];
    let i;
    for (i = 0; i < this._nsdfBuffer.length && m > 0; i++) {
      this._nsdfBuffer[i] = 2 * this._nsdfBuffer[i] / m;
      m -= input[i] ** 2 + input[input.length - i - 1] ** 2;
    }
    for (; i < this._nsdfBuffer.length; i++) {
      this._nsdfBuffer[i] = 0;
    }
  }
};
function ceilPow2(v) {
  v--;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  v++;
  return v;
}

// app.mjs
var $ = (id) => document.getElementById(id);
var log = (m) => {
  const el = $("log");
  if (el) {
    el.textContent += m + "\n";
    el.scrollTop = el.scrollHeight;
  }
};
async function renderStems(sampleRate2, seconds) {
  const len = Math.floor(sampleRate2 * seconds);
  const mk = () => new OfflineAudioContext(2, len, sampleRate2);
  const padCtx = mk();
  {
    const lp = padCtx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    const g = padCtx.createGain();
    g.gain.value = 0.16;
    const lfo = padCtx.createOscillator();
    lfo.frequency.value = 0.25;
    const lfoG = padCtx.createGain();
    lfoG.gain.value = 0.05;
    lfo.connect(lfoG).connect(g.gain);
    lfo.start();
    for (const f of [110, 138.59, 164.81, 220]) {
      const o = padCtx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 12;
      o.connect(lp);
      o.start();
    }
    lp.connect(g).connect(padCtx.destination);
  }
  const rhyCtx = mk();
  {
    const noise = rhyCtx.createBuffer(1, sampleRate2, sampleRate2);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (let t = 0; t < seconds; t += 0.5) {
      const src = rhyCtx.createBufferSource();
      src.buffer = noise;
      const bp = rhyCtx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 3e3;
      bp.Q.value = 1.2;
      const g = rhyCtx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(1e-3, t + 0.12);
      src.connect(bp).connect(g).connect(rhyCtx.destination);
      src.start(t, 0, 0.15);
    }
    for (let t = 0; t < seconds; t += 0.25) {
      const o = rhyCtx.createOscillator();
      o.frequency.value = 55;
      const g = rhyCtx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(1e-3, t + 0.2);
      o.connect(g).connect(rhyCtx.destination);
      o.start(t);
      o.stop(t + 0.22);
    }
  }
  const [pad, rhythm] = await Promise.all([padCtx.startRendering(), rhyCtx.startRendering()]);
  return { pad, rhythm };
}
var TAP_CODE = `
class VoxTap extends AudioWorkletProcessor {
  constructor(){ super(); this.buf = new Float32Array(2048); this.since = 0; this.calls = 0; }
  process(inputs){
    this.calls++;
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      this.buf.copyWithin(0, ch.length);
      this.buf.set(ch, 2048 - ch.length);
      this.since += ch.length;
      if (this.since >= 1024) { this.since = 0; this.port.postMessage(this.buf.slice(0)); }
    }
    return true;
  }
}
registerProcessor("vox-tap", VoxTap);`;
var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var hzToNote = (hz) => {
  const midi = 69 + 12 * Math.log2(hz / 440);
  const r = Math.round(midi);
  return `${NOTE_NAMES[(r % 12 + 12) % 12]}${Math.floor(r / 12) - 1} ${((midi - r) * 100).toFixed(0)}c`;
};
async function startInteractive() {
  const ctx = new AudioContext();
  const report = {
    userAgent: navigator.userAgent,
    sampleRate: ctx.sampleRate,
    baseLatency: ctx.baseLatency ?? null,
    outputLatency: null,
    longTasks: 0,
    driftMs: null,
    pitchWindowsPerSec: 0,
    started: (/* @__PURE__ */ new Date()).toISOString()
  };
  log("Rendering synthetic stems\u2026");
  const { pad, rhythm } = await renderStems(ctx.sampleRate, 8);
  log("Building graph\u2026");
  const stretch = await SignalsmithStretch_default(ctx);
  const padGain = ctx.createGain(), rhyGain = ctx.createGain();
  const mkSrc = (buf, gain) => {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.connect(gain).connect(stretch);
    s.start();
    return s;
  };
  mkSrc(pad, padGain);
  mkSrc(rhythm, rhyGain);
  stretch.connect(ctx.destination);
  stretch.start();
  stretch.schedule({ active: true, semitones: parseFloat($("semi").value) });
  $("semi").oninput = () => {
    const v = parseFloat($("semi").value);
    $("semiVal").textContent = v;
    stretch.schedule({ output: ctx.currentTime, semitones: v });
  };
  $("padGain").oninput = () => padGain.gain.value = parseFloat($("padGain").value);
  $("rhyGain").oninput = () => rhyGain.gain.value = parseFloat($("rhyGain").value);
  $("micBtn").onclick = async () => {
    const ec = $("ecToggle").checked;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: ec, noiseSuppression: false, autoGainControl: false }
    });
    const applied = stream.getAudioTracks()[0].getSettings();
    log("Mic constraints applied: " + JSON.stringify(applied));
    report.micSettings = applied;
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([TAP_CODE], { type: "application/javascript" })));
    const tap = new AudioWorkletNode(ctx, "vox-tap");
    ctx.createMediaStreamSource(stream).connect(tap);
    const det = PitchDetector.forFloat32Array(2048);
    let windows = 0, t0 = performance.now();
    tap.port.onmessage = (e) => {
      windows++;
      const [hz, clarity] = det.findPitch(e.data, ctx.sampleRate);
      if (clarity > 0.8 && hz > 60 && hz < 1200) {
        $("pitch").textContent = `${hz.toFixed(1)} Hz  ${hzToNote(hz)}  (clarity ${clarity.toFixed(2)})`;
      }
      if (windows % 100 === 0) {
        report.pitchWindowsPerSec = (windows / ((performance.now() - t0) / 1e3)).toFixed(1);
      }
    };
    log("Pitch tracking live. Sing!");
  };
  if ("PerformanceObserver" in window) {
    try {
      new PerformanceObserver((l) => report.longTasks += l.getEntries().length).observe({ entryTypes: ["longtask"] });
    } catch {
    }
  }
  const wall0 = performance.now(), ctx0 = ctx.currentTime;
  setInterval(() => {
    const drift = (performance.now() - wall0) / 1e3 - (ctx.currentTime - ctx0);
    report.driftMs = (drift * 1e3).toFixed(1);
    report.outputLatency = ctx.outputLatency ?? null;
    $("stats").textContent = JSON.stringify(report, null, 2);
  }, 1e3);
  $("copyBtn").onclick = () => navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  log("Playing. Move the semitone slider; then enable mic and sing.");
}
async function runBench() {
  const out = { mode: "bench", ua: navigator.userAgent };
  const SR = 48e3, SECONDS = 60;
  const { pad, rhythm } = await renderStems(SR, 8);
  const mix = [new Float32Array(SR * SECONDS), new Float32Array(SR * SECONDS)];
  for (let c = 0; c < 2; c++) {
    const p = pad.getChannelData(c), r = rhythm.getChannelData(c), m = mix[c];
    for (let i = 0; i < m.length; i++) m[i] = p[i % p.length] + r[i % r.length];
  }
  const off = new OfflineAudioContext(2, SR * SECONDS, SR);
  const stretch = await SignalsmithStretch_default(off);
  stretch.connect(off.destination);
  await stretch.addBuffers(mix);
  stretch.schedule({ active: true, input: 0, rate: 1, semitones: 3 });
  const t0 = performance.now();
  await off.startRendering();
  const wall = (performance.now() - t0) / 1e3;
  out.stretch = {
    semitones: 3,
    audioSeconds: SECONDS,
    wallSeconds: +wall.toFixed(2),
    realtimeFactor: +(SECONDS / wall).toFixed(2)
  };
  const dur = 5, n = SR * dur, tone = new Float32Array(n);
  const f0 = 220, dev = 5, vib = 5;
  let phase = 0;
  const inst = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const f = f0 + dev * Math.sin(2 * Math.PI * vib * (i / SR));
    inst[i] = f;
    phase += 2 * Math.PI * f / SR;
    tone[i] = 0.5 * Math.sin(phase) + 0.02 * (Math.random() * 2 - 1);
  }
  const det = PitchDetector.forFloat32Array(2048);
  const win = new Float32Array(2048);
  let calls = 0, errSum = 0, errN = 0, maxErr = 0;
  const p0 = performance.now();
  for (let start = 0; start + 2048 <= n; start += 512) {
    win.set(tone.subarray(start, start + 2048));
    const [hz, clarity] = det.findPitch(win, SR);
    calls++;
    if (clarity > 0.9) {
      const ref = inst[start + 1024];
      const cents = Math.abs(1200 * Math.log2(hz / ref));
      errSum += cents;
      errN++;
      if (cents > maxErr) maxErr = cents;
    }
  }
  const pWall = (performance.now() - p0) / 1e3;
  out.pitchy = {
    windows: calls,
    wallSeconds: +pWall.toFixed(3),
    windowsPerSec: Math.round(calls / pWall),
    meanAbsCents: +(errSum / errN).toFixed(2),
    maxAbsCents: +maxErr.toFixed(2),
    clarityGated: errN
  };
  window.__benchResult = out;
  document.title = "BENCH DONE";
  if ($("stats")) $("stats").textContent = JSON.stringify(out, null, 2);
}
if (new URLSearchParams(location.search).has("bench")) {
  runBench().catch((e) => {
    window.__benchResult = { error: String(e && e.stack || e) };
    document.title = "BENCH DONE";
  });
} else {
  $("startBtn").onclick = () => {
    $("startBtn").disabled = true;
    startInteractive().catch((e) => log("ERROR: " + e));
  };
}
