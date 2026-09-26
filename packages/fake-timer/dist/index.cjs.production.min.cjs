"use strict";

var e = require("dayjs"), t = require("dayjs/plugin/duration"), i = require("dayjs/plugin/minMax"), n = require("nanoid");

e.extend(t);

class TimeCore {
  data={};
  constructor(t) {
    let i;
    this.static.isValidDate(t) && ([t, i] = [ {}, t ]), i = e(i), this.data = Object.assign(this.data, {
      id: 0,
      real_init: e(),
      virtual_init: i,
      virtual_now: i
    }, t), this._init();
  }
  _init() {}
  static new(e) {
    return new this(e);
  }
  get static() {
    return this.__proto__.constructor;
  }
  static isValidDate(t) {
    return !!(e.isDayjs(t) || t instanceof Date) || !("number" != typeof t || !e(t).isValid()) || !!Date.parse(t);
  }
  update(t = 100, i) {
    return this.data.virtual_old = this.data.virtual_now, this.data.virtual_now = e.isDuration(t) ? this.data.virtual_now.add(t) : "object" == typeof t ? e(t) : i || "number" == typeof t ? this.data.virtual_now.add(t, i) : this.data.virtual_now.add(100), 
    this;
  }
  id(e) {
    return e ? this.data.id : this.data.id++;
  }
  now() {
    return this.data.virtual_now;
  }
  reset() {
    return this.data.virtual_now = this.data.virtual_init, this.data.virtual_old = void 0, 
    this.data.id = 0, this;
  }
}

e.extend(t), e.extend(i);

let r, a, s = /*#__PURE__*/ function(e) {
  return e.setTimeout = "setTimeout", e.setInterval = "setInterval", e.setImmediate = "setImmediate", 
  e.requestAnimationFrame = "requestAnimationFrame", e;
}({});

class QueueTimer extends TimeCore {
  queue=[];
  cache={
    min: null,
    max: null
  };
  constructor() {
    super(...arguments);
  }
  get length() {
    return this.queue.length;
  }
  add=t => {
    const i = this.now();
    return t.virtualTiming = t.virtualTiming || i, t = Object.assign({
      id: null,
      name: null,
      virtualTiming: null
    }, t, {
      id: this.id(),
      name: n.nanoid(),
      virtualTiming: e.isDuration(t.virtualTiming) ? i.add(t.virtualTiming) : t.virtualTiming,
      virtualAdded: i,
      count: 0,
      index: this.length
    }), this._cache_timing(t.virtualTiming), this.queue.push(t), t;
  };
  _cache_refresh=() => {
    this.cache.min = this.length ? this.eq(0).virtualTiming : null, this.cache.max = this.length ? this.eq(-1).virtualTiming : null;
  };
  _cache_timing=(t, i) => {
    i && (this.cache.max = null, this.cache.min = null), this.cache.max = this.cache.max ? e.max(this.cache.max, t) : t, 
    this.cache.min = this.cache.min ? e.min(this.cache.min, t) : t;
  };
  sort=e => {
    let t = this;
    return this.queue.sort(e || this.data.sort || queueSortCallback), this._cache_timing(null, !0), 
    this.queue.map(function(e, i) {
      e.index = i, t._cache_timing(e.virtualTiming);
    }), this;
  };
  eq=e => (-1 == e && (e = this.length - 1), this.queue[e]);
  _remove=e => {
    let t = this.queue.splice(e, 1);
    return 1 == t.length ? t[0] : null;
  };
  remove=e => "number" == typeof e || e in this.queue ? this._remove(e) : (e.name && (e = e.name), 
  (e = this.queue.findIndex(function(t) {
    return t.name == e;
  })) > -1 ? this._remove(e) : null);
  static new(e) {
    return super.new();
  }
  hasExpires=() => this.now().diff(this.cache.min) >= 0;
  clear() {
    return this.queue = [], this.cache.min = null, this.cache.max = null, this;
  }
}

function queueSortCallback(e, t) {
  return 0 == e.virtualTiming.diff(t.virtualTiming) ? e.id > t.id : e.virtualTiming.diff(t.virtualTiming);
}

function toDuration(t) {
  return e.isDuration(t) ? t : e.duration(t);
}

function normalizeDelay(e) {
  const t = null != e ? e : 0;
  if ("number" == typeof t) {
    if (!Number.isFinite(t)) throw new RangeError(`fake-timer: delay must be a finite number; received ${String(e)} (Infinity / -Infinity / NaN are not allowed — they create uncontrolled timers).`);
    return t < 0 ? 0 : t;
  }
  if (!Number.isFinite(t.asMilliseconds())) throw new RangeError(`fake-timer: delay Duration must resolve to a finite number of milliseconds; received ${String(e)} (dayjs.duration(NaN) / dayjs.duration(Infinity) are not allowed).`);
  return t.asMilliseconds() < 0 ? 0 : t;
}

e.extend(t);

class FakeTimer {
  cache={
    done: []
  };
  frameInterval=e.duration(1000 / 60);
  get initTime() {
    return this.timer.data.virtual_init;
  }
  _activeRun=null;
  _gen=null;
  _runStartNow=null;
  _current=null;
  _abort=!1;
  constructor(e) {
    this.timer = QueueTimer.new(e);
  }
  _schedule(e, t, i, n) {
    var r;
    const a = toDuration(normalizeDelay(i)), l = this.timer.add({
      callback: t,
      virtualTiming: a,
      interval: e === s.setInterval ? a : void 0,
      params: n,
      type: e
    });
    return null === (r = this._activeRun) || void 0 === r || r.tryAdd(l), l;
  }
  setTimeout=(e, t, ...i) => this._schedule(s.setTimeout, e, t, i);
  setInterval=(e, t, ...i) => this._schedule(s.setInterval, e, t, i);
  setImmediate=(e, ...t) => this._schedule(s.setImmediate, e, 0, t);
  requestAnimationFrame=(e, ...t) => this._schedule(s.requestAnimationFrame, e, this.frameInterval, t);
  cancelAnimationFrame=e => this._clear(e);
  _clear(e) {
    return null == e ? null : this.timer.remove(e);
  }
  clearTimeout=e => this._clear(e);
  clearInterval=e => this._clear(e);
  clearImmediate=e => this._clear(e);
  clearAll=() => (this.timer.clear(), this);
  reset=() => (this.timer.clear(), this.timer.reset(), this.cache.done = [], this);
  advance=e => {
    if (this._activeRun) throw new TypeError("advance() is forbidden while a run is in progress: time jumps during run are not allowed.");
    var t;
    return e < 0 && (e = null !== (t = this.timer.cache.min) && void 0 !== t ? t : 0), 
    this.timer.update(e), this.timer.sort(), this;
  };
  * _runCore() {
    const t = this.timer.now();
    this.cache.done = [];
    const i = [ ...this.timer.queue ], n = new WeakSet;
    for (const e of i) n.add(e);
    const insert = e => {
      let t = 0, n = i.length;
      for (;t < n; ) {
        var r, a;
        const s = t + n >> 1, l = i[s], u = l.virtualTiming.diff(e.virtualTiming);
        u < 0 || 0 === u && (null !== (r = l.id) && void 0 !== r ? r : 0) < (null !== (a = e.id) && void 0 !== a ? a : 0) ? t = s + 1 : n = s;
      }
      i.splice(t, 0, e);
    };
    this._activeRun = {
      now: t,
      pending: i,
      seen: n,
      tryAdd: e => {
        n.has(e) || (n.add(e), t.diff(e.virtualTiming) >= 0 && insert(e));
      }
    };
    try {
      for (;i.length > 0; ) {
        const n = i[0];
        if (this._current = n, t.diff(n.virtualTiming) < 0) break;
        if (this.timer.queue.includes(n)) {
          if (n.realActive = e(), yield n, this._abort) break;
          if (n.realEnding = e(), this.cache.done.push(n), i.shift(), this.timer.queue.includes(n)) if (n.type === s.setInterval && null != n.interval) {
            const e = n.virtualTiming, i = e.add(n.interval);
            if (i.valueOf() > e.valueOf() && i.valueOf() <= t.valueOf()) {
              n.virtualTiming = i, insert(n);
              continue;
            }
            n.virtualTiming = i;
          } else this.timer.remove(n);
        } else i.shift();
      }
    } finally {
      this._activeRun = null, this._gen = null, this._runStartNow = null, this._current = null, 
      this._abort = !1;
    }
    this.timer.sort();
  }
  run=() => {
    if (this._activeRun) return this;
    null == this._runStartNow && (this._runStartNow = this.timer.now());
    for (const e of this._runGenerator()) ;
    return this;
  };
  runAsync=async () => {
    if (this._activeRun) return this;
    null == this._runStartNow && (this._runStartNow = this.timer.now()), this._gen = this._runCore();
    for (const i of this._gen) {
      var e, t;
      i.count = (null !== (e = i.count) && void 0 !== e ? e : 0) + 1, await i.callback(i, this, ...null !== (t = i.params) && void 0 !== t ? t : []);
    }
    return this;
  };
  * _wrapRunGen() {
    for (const i of this._runCore()) {
      var e, t;
      i.count = (null !== (e = i.count) && void 0 !== e ? e : 0) + 1, i.callback(i, this, ...null !== (t = i.params) && void 0 !== t ? t : []), 
      yield i;
    }
  }
  _runGenerator() {
    return this._activeRun || null == this._gen && (this._gen = this._wrapRunGen()), 
    this._gen;
  }
  runGenerator() {
    return this._runGenerator();
  }
  start=e => (this._activeRun || (this._runStartNow = this.timer.now(), this.advance(e), 
  this.timer.hasExpires() && this.run()), this);
  startAsync=async e => (this._activeRun || (this._runStartNow = this.timer.now(), 
  this.advance(e), this.timer.hasExpires() && await this.runAsync()), this);
  pause=() => {
    if (!this._activeRun) return this;
    const e = this._current;
    this.timer.sort();
    let t = null;
    for (const i of this.timer.queue) i !== e && (null == t || i.virtualTiming.diff(t) < 0) && (t = i.virtualTiming);
    return this._abort = !0, e && this.timer.remove(e), t && (this.timer.data.virtual_now = t), 
    this;
  };
  cancel=() => {
    if (!this._activeRun) return this;
    const e = this._runStartNow, t = this._current;
    return this._abort = !0, t && this.timer.remove(t), e && (this.timer.data.virtual_now = e), 
    this;
  };
}

let l = /*#__PURE__*/ function(e) {
  return e.none = "none", e.self = "self", e.global = "global", e;
}({});

class UnsafeGlobalFakeTimer extends FakeTimer {
  _clockInstalled=!1;
  _doUninstall=() => {
    this._originalDateNow && (Date.now = this._originalDateNow);
    const e = globalThis.performance;
    e && this._originalPerfNow && (e.now = this._originalPerfNow), this._clockInstalled = !1, 
    r = void 0;
  };
  globalClockState() {
    return this._clockInstalled ? l.self : null != r ? l.global : l.none;
  }
  installGlobalClock=() => {
    if (this._clockInstalled || null != r) return this;
    this._originalDateNow = Date.now;
    const e = globalThis.performance;
    return this._originalPerfNow = e && "function" == typeof e.now ? e.now.bind(e) : void 0, 
    Date.now = () => this.timer.now().valueOf(), e && this._originalPerfNow && (e.now = () => this.timer.now().valueOf() - this.timer.data.virtual_init.valueOf()), 
    this._clockInstalled = !0, r = () => this._doUninstall(), this;
  };
  uninstallGlobalClock=() => this._clockInstalled || null != r ? null != r ? (r(), 
  this) : (this._doUninstall(), this) : this;
}

const u = /*#__PURE__*/ new FakeTimer;

var o = u;

const h = u.setTimeout, c = u.setInterval, d = u.setImmediate, m = u.clearTimeout, v = u.clearInterval, f = u.clearImmediate, _ = u.advance, g = u.run, w = u.runAsync, b = u.start, y = u.startAsync, p = u.clearAll, T = u.reset, j = u.requestAnimationFrame, O = u.cancelAnimationFrame;

Object.defineProperty(u, "__esModule", {
  value: !0
}), Object.defineProperty(u, "default", {
  value: u
}), Object.defineProperty(u, "FakeTimer", {
  value: FakeTimer
}), Object.defineProperty(u, "QueueTimer", {
  value: QueueTimer
}), Object.defineProperty(u, "TimeCore", {
  value: TimeCore
}), Object.defineProperty(u, "toDuration", {
  value: toDuration
}), Object.defineProperty(u, "normalizeDelay", {
  value: normalizeDelay
}), Object.defineProperty(u, "setTimeout", {
  value: h
}), Object.defineProperty(u, "setInterval", {
  value: c
}), Object.defineProperty(u, "setImmediate", {
  value: d
}), Object.defineProperty(u, "clearTimeout", {
  value: m
}), Object.defineProperty(u, "clearInterval", {
  value: v
}), Object.defineProperty(u, "clearImmediate", {
  value: f
}), Object.defineProperty(u, "advance", {
  value: _
}), Object.defineProperty(u, "run", {
  value: g
}), Object.defineProperty(u, "runAsync", {
  value: w
}), Object.defineProperty(u, "start", {
  value: b
}), Object.defineProperty(u, "startAsync", {
  value: y
}), Object.defineProperty(u, "clearAll", {
  value: p
}), Object.defineProperty(u, "reset", {
  value: T
}), Object.defineProperty(u, "requestAnimationFrame", {
  value: j
}), Object.defineProperty(u, "cancelAnimationFrame", {
  value: O
}), Object.defineProperty(u, "UnsafeGlobalFakeTimer", {
  value: UnsafeGlobalFakeTimer
}), Object.defineProperty(u, "getUnsafeGlobalFakeTimer", {
  value: function getUnsafeGlobalFakeTimer() {
    return null != a ? a : a = new UnsafeGlobalFakeTimer;
  }
}), module.exports = o;
//# sourceMappingURL=index.cjs.production.min.cjs.map
