import t from "dayjs";

import e from "dayjs/plugin/duration";

import i from "dayjs/plugin/minMax";

import { nanoid as a } from "nanoid";

t.extend(e);

class TimeCore {
  data={};
  constructor(e) {
    let i;
    this.static.isValidDate(e) && ([e, i] = [ {}, e ]), i = t(i), this.data = Object.assign(this.data, {
      id: 0,
      real_init: t(),
      fake_init: i,
      fake_now: i
    }, e), this._init();
  }
  _init() {}
  static new(t) {
    return new this(t);
  }
  get static() {
    return this.__proto__.constructor;
  }
  static isValidDate(e) {
    return !!(t.isDayjs(e) || e instanceof Date) || !("number" != typeof e || !t(e).isValid()) || !!Date.parse(e);
  }
  update(e = 100, i) {
    return this.data.fake_old = this.data.fake_now, this.data.fake_now = t.isDuration(e) ? this.data.fake_now.add(e) : "object" == typeof e ? t(e) : i || "number" == typeof e ? this.data.fake_now.add(e, i) : this.data.fake_now.add(100), 
    this;
  }
  id(t) {
    return t ? this.data.id : this.data.id++;
  }
  now() {
    return this.data.fake_now;
  }
  reset() {
    return this.data.fake_now = this.data.fake_init, this.data.fake_old = void 0, this.data.id = 0, 
    this;
  }
}

t.extend(e), t.extend(i);

let n, s, r = /*#__PURE__*/ function(t) {
  return t.setTimeout = "setTimeout", t.setInterval = "setInterval", t.setImmediate = "setImmediate", 
  t.requestAnimationFrame = "requestAnimationFrame", t;
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
  add=e => (e.timing = e.timing || this.now(), e = Object.assign({
    id: null,
    name: null,
    timing: null
  }, e, {
    id: this.id(),
    name: a(),
    timing: t.isDuration(e.timing) ? this.now().add(e.timing) : e.timing,
    index: this.length
  }), this._cache_timing(e.timing), this.queue.push(e), e);
  _cache_refresh=() => {
    this.cache.min = this.length ? this.eq(0).timing : null, this.cache.max = this.length ? this.eq(-1).timing : null;
  };
  _cache_timing=(e, i) => {
    i && (this.cache.max = null, this.cache.min = null), this.cache.max = this.cache.max ? t.max(this.cache.max, e) : e, 
    this.cache.min = this.cache.min ? t.min(this.cache.min, e) : e;
  };
  sort=t => {
    let e = this;
    return this.queue.sort(t || this.data.sort || queueSortCallback), this._cache_timing(null, !0), 
    this.queue.map(function(t, i) {
      t.index = i, e._cache_timing(t.timing);
    }), this;
  };
  eq=t => (-1 == t && (t = this.length - 1), this.queue[t]);
  _remove=t => {
    let e = this.queue.splice(t, 1);
    return 1 == e.length ? e[0] : null;
  };
  remove=t => "number" == typeof t || t in this.queue ? this._remove(t) : (t.name && (t = t.name), 
  (t = this.queue.findIndex(function(e) {
    return e.name == t;
  })) > -1 ? this._remove(t) : null);
  static new(t) {
    return super.new();
  }
  hasExpires=() => this.now().diff(this.cache.min) >= 0;
  clear() {
    return this.queue = [], this.cache.min = null, this.cache.max = null, this;
  }
}

function queueSortCallback(t, e) {
  return 0 == t.timing.diff(e.timing) ? t.id > e.id : t.timing.diff(e.timing);
}

function toDuration(e) {
  return t.isDuration(e) ? e : t.duration(e);
}

t.extend(e);

class FakeTimer {
  cache={
    done: []
  };
  frameInterval=t.duration(1000 / 60);
  constructor(t) {
    this.timer = QueueTimer.new(t);
  }
  _schedule(t, e, i, a) {
    return this.timer.add({
      callback: e,
      timing: toDuration(i),
      interval: t === r.setInterval ? toDuration(i) : void 0,
      params: a,
      type: t
    });
  }
  setTimeout=(t, e, ...i) => this._schedule(r.setTimeout, t, e, i);
  setInterval=(t, e, ...i) => this._schedule(r.setInterval, t, e, i);
  setImmediate=(t, ...e) => this._schedule(r.setImmediate, t, 0, e);
  requestAnimationFrame=(t, ...e) => this._schedule(r.requestAnimationFrame, t, this.frameInterval, e);
  cancelAnimationFrame=t => this._clear(t);
  _clear(t) {
    return null == t ? null : this.timer.remove(t);
  }
  clearTimeout=t => this._clear(t);
  clearInterval=t => this._clear(t);
  clearImmediate=t => this._clear(t);
  clearAll=() => (this.timer.clear(), this);
  reset=() => (this.timer.clear(), this.timer.reset(), this.cache.done = [], this);
  advance=t => {
    var e;
    return t < 0 && (t = null !== (e = this.timer.cache.min) && void 0 !== e ? e : 0), 
    this.timer.update(t), this.timer.sort(), this;
  };
  * _runCore() {
    let e = this.timer.now();
    this.cache.done = [];
    const i = [];
    for (let a = 0; a < this.timer.queue.length; ) {
      let n = this.timer.queue[a];
      if (!(e.diff(n.timing) >= 0)) break;
      n.active = t(), yield n, n.ending = t(), this.cache.done.push(n), this.timer.queue.includes(n) && (this.timer.remove(a), 
      n.type === r.setInterval && null != n.interval && i.push(n));
    }
    for (const t of i) t.timing = t.timing.add(t.interval), this.timer.queue.push(t);
    i.length ? this.timer.sort() : this.timer._cache_refresh();
  }
  run=() => {
    for (const t of this._runCore()) t.callback(t, this.timer);
    return this;
  };
  runAsync=async () => {
    for (const t of this._runCore()) await t.callback(t, this.timer);
    return this;
  };
  start=t => (this.advance(t), this.timer.hasExpires() && this.run(), this);
  startAsync=async t => (this.advance(t), this.timer.hasExpires() && await this.runAsync(), 
  this);
}

function getUnsafeGlobalFakeTimer() {
  return null != s ? s : s = new UnsafeGlobalFakeTimer;
}

let l = /*#__PURE__*/ function(t) {
  return t.none = "none", t.self = "self", t.global = "global", t;
}({});

class UnsafeGlobalFakeTimer extends FakeTimer {
  _clockInstalled=!1;
  _doUninstall=() => {
    this._originalDateNow && (Date.now = this._originalDateNow);
    const t = globalThis.performance;
    t && this._originalPerfNow && (t.now = this._originalPerfNow), this._clockInstalled = !1, 
    n = void 0;
  };
  globalClockState() {
    return this._clockInstalled ? l.self : null != n ? l.global : l.none;
  }
  installGlobalClock=() => {
    if (this._clockInstalled || null != n) return this;
    this._originalDateNow = Date.now;
    const t = globalThis.performance;
    return this._originalPerfNow = t && "function" == typeof t.now ? t.now.bind(t) : void 0, 
    Date.now = () => this.timer.now().valueOf(), t && this._originalPerfNow && (t.now = () => this.timer.now().valueOf() - this.timer.data.fake_init.valueOf()), 
    this._clockInstalled = !0, n = () => this._doUninstall(), this;
  };
  uninstallGlobalClock=() => this._clockInstalled || null != n ? null != n ? (n(), 
  this) : (this._doUninstall(), this) : this;
}

const h = /*#__PURE__*/ new FakeTimer, o = h.setTimeout, u = h.setInterval, c = h.setImmediate, m = h.clearTimeout, d = h.clearInterval, f = h.clearImmediate, _ = h.advance, g = h.run, w = h.runAsync, k = h.start, v = h.startAsync, p = h.clearAll, b = h.reset, I = h.requestAnimationFrame, q = h.cancelAnimationFrame;

export { l as EnumGlobalClockState, r as EnumTimerType, FakeTimer, QueueTimer, TimeCore, UnsafeGlobalFakeTimer, _ as advance, q as cancelAnimationFrame, p as clearAll, f as clearImmediate, d as clearInterval, m as clearTimeout, h as default, h as defaultFakeTimer, getUnsafeGlobalFakeTimer, I as requestAnimationFrame, b as reset, g as run, w as runAsync, c as setImmediate, u as setInterval, o as setTimeout, k as start, v as startAsync, toDuration };
//# sourceMappingURL=index.esm.mjs.map
