"use strict";

var e = require("dayjs"), t = require("dayjs/plugin/duration"), i = require("dayjs/plugin/minMax"), a = require("nanoid");

e.extend(t);

class TimeCore {
  data={};
  constructor(t) {
    let i;
    this.static.isValidDate(t) && ([t, i] = [ {}, t ]), i = e(i), this.data = Object.assign(this.data, {
      id: 0,
      real_init: e(),
      fake_init: i,
      fake_now: i
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
    return this.data.fake_old = this.data.fake_now, this.data.fake_now = e.isDuration(t) ? this.data.fake_now.add(t) : "object" == typeof t ? e(t) : i || "number" == typeof t ? this.data.fake_now.add(t, i) : this.data.fake_now.add(100), 
    this;
  }
  id(e) {
    return e ? this.data.id : this.data.id++;
  }
  now() {
    return this.data.fake_now;
  }
  reset() {
    return this.data.fake_now = this.data.fake_init, this.data.fake_old = void 0, this.data.id = 0, 
    this;
  }
}

e.extend(t), e.extend(i);

let n, r, s = /*#__PURE__*/ function(e) {
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
  add=t => (t.timing = t.timing || this.now(), t = Object.assign({
    id: null,
    name: null,
    timing: null
  }, t, {
    id: this.id(),
    name: a.nanoid(),
    timing: e.isDuration(t.timing) ? this.now().add(t.timing) : t.timing,
    index: this.length
  }), this._cache_timing(t.timing), this.queue.push(t), t);
  _cache_refresh=() => {
    this.cache.min = this.length ? this.eq(0).timing : null, this.cache.max = this.length ? this.eq(-1).timing : null;
  };
  _cache_timing=(t, i) => {
    i && (this.cache.max = null, this.cache.min = null), this.cache.max = this.cache.max ? e.max(this.cache.max, t) : t, 
    this.cache.min = this.cache.min ? e.min(this.cache.min, t) : t;
  };
  sort=e => {
    let t = this;
    return this.queue.sort(e || this.data.sort || queueSortCallback), this._cache_timing(null, !0), 
    this.queue.map(function(e, i) {
      e.index = i, t._cache_timing(e.timing);
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
  return 0 == e.timing.diff(t.timing) ? e.id > t.id : e.timing.diff(t.timing);
}

function toDuration(t) {
  return e.isDuration(t) ? t : e.duration(t);
}

e.extend(t);

class FakeTimer {
  cache={
    done: []
  };
  frameInterval=e.duration(1000 / 60);
  constructor(e) {
    this.timer = QueueTimer.new(e);
  }
  _schedule(e, t, i, a) {
    return this.timer.add({
      callback: t,
      timing: toDuration(i),
      interval: e === s.setInterval ? toDuration(i) : void 0,
      params: a,
      type: e
    });
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
    var t;
    return e < 0 && (e = null !== (t = this.timer.cache.min) && void 0 !== t ? t : 0), 
    this.timer.update(e), this.timer.sort(), this;
  };
  * _runCore() {
    let t = this.timer.now();
    this.cache.done = [];
    const i = [];
    for (let a = 0; a < this.timer.queue.length; ) {
      let n = this.timer.queue[a];
      if (!(t.diff(n.timing) >= 0)) break;
      n.active = e(), yield n, n.ending = e(), this.cache.done.push(n), this.timer.queue.includes(n) && (this.timer.remove(a), 
      n.type === s.setInterval && null != n.interval && i.push(n));
    }
    for (const e of i) e.timing = e.timing.add(e.interval), this.timer.queue.push(e);
    i.length ? this.timer.sort() : this.timer._cache_refresh();
  }
  run=() => {
    for (const e of this._runCore()) e.callback(e, this.timer);
    return this;
  };
  runAsync=async () => {
    for (const e of this._runCore()) await e.callback(e, this.timer);
    return this;
  };
  start=e => (this.advance(e), this.timer.hasExpires() && this.run(), this);
  startAsync=async e => (this.advance(e), this.timer.hasExpires() && await this.runAsync(), 
  this);
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
    n = void 0;
  };
  globalClockState() {
    return this._clockInstalled ? l.self : null != n ? l.global : l.none;
  }
  installGlobalClock=() => {
    if (this._clockInstalled || null != n) return this;
    this._originalDateNow = Date.now;
    const e = globalThis.performance;
    return this._originalPerfNow = e && "function" == typeof e.now ? e.now.bind(e) : void 0, 
    Date.now = () => this.timer.now().valueOf(), e && this._originalPerfNow && (e.now = () => this.timer.now().valueOf() - this.timer.data.fake_init.valueOf()), 
    this._clockInstalled = !0, n = () => this._doUninstall(), this;
  };
  uninstallGlobalClock=() => this._clockInstalled || null != n ? null != n ? (n(), 
  this) : (this._doUninstall(), this) : this;
}

const o = /*#__PURE__*/ new FakeTimer;

var u = o;

const c = o.setTimeout, h = o.setInterval, m = o.setImmediate, d = o.clearTimeout, f = o.clearInterval, _ = o.clearImmediate, v = o.advance, g = o.run, p = o.runAsync, b = o.start, y = o.startAsync, k = o.clearAll, w = o.reset, j = o.requestAnimationFrame, T = o.cancelAnimationFrame;

Object.defineProperty(o, "__esModule", {
  value: !0
}), Object.defineProperty(o, "default", {
  value: o
}), Object.defineProperty(o, "FakeTimer", {
  value: FakeTimer
}), Object.defineProperty(o, "QueueTimer", {
  value: QueueTimer
}), Object.defineProperty(o, "TimeCore", {
  value: TimeCore
}), Object.defineProperty(o, "toDuration", {
  value: toDuration
}), Object.defineProperty(o, "setTimeout", {
  value: c
}), Object.defineProperty(o, "setInterval", {
  value: h
}), Object.defineProperty(o, "setImmediate", {
  value: m
}), Object.defineProperty(o, "clearTimeout", {
  value: d
}), Object.defineProperty(o, "clearInterval", {
  value: f
}), Object.defineProperty(o, "clearImmediate", {
  value: _
}), Object.defineProperty(o, "advance", {
  value: v
}), Object.defineProperty(o, "run", {
  value: g
}), Object.defineProperty(o, "runAsync", {
  value: p
}), Object.defineProperty(o, "start", {
  value: b
}), Object.defineProperty(o, "startAsync", {
  value: y
}), Object.defineProperty(o, "clearAll", {
  value: k
}), Object.defineProperty(o, "reset", {
  value: w
}), Object.defineProperty(o, "requestAnimationFrame", {
  value: j
}), Object.defineProperty(o, "cancelAnimationFrame", {
  value: T
}), Object.defineProperty(o, "UnsafeGlobalFakeTimer", {
  value: UnsafeGlobalFakeTimer
}), Object.defineProperty(o, "getUnsafeGlobalFakeTimer", {
  value: function getUnsafeGlobalFakeTimer() {
    return null != r ? r : r = new UnsafeGlobalFakeTimer;
  }
}), module.exports = u;
//# sourceMappingURL=index.cjs.production.min.cjs.map
