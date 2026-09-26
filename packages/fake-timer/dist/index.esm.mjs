import t from "dayjs";

import e from "dayjs/plugin/duration";

import i from "dayjs/plugin/minMax";

import { nanoid as n } from "nanoid";

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

let a, s, r = /*#__PURE__*/ function(t) {
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
    name: n(),
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
  _activeRun=null;
  _gen=null;
  _runStartNow=null;
  _current=null;
  _abort=!1;
  constructor(t) {
    this.timer = QueueTimer.new(t);
  }
  _schedule(t, e, i, n) {
    var a;
    const s = this.timer.add({
      callback: e,
      timing: toDuration(i),
      interval: t === r.setInterval ? toDuration(i) : void 0,
      params: n,
      type: t
    });
    return null === (a = this._activeRun) || void 0 === a || a.tryAdd(s), s;
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
    if (this._activeRun) throw new TypeError("advance() is forbidden while a run is in progress: time jumps during run are not allowed.");
    var e;
    return t < 0 && (t = null !== (e = this.timer.cache.min) && void 0 !== e ? e : 0), 
    this.timer.update(t), this.timer.sort(), this;
  };
  * _runCore() {
    const e = this.timer.now();
    this.cache.done = [];
    const i = [ ...this.timer.queue ], n = new WeakSet;
    for (const t of i) n.add(t);
    const insert = t => {
      let e = 0, n = i.length;
      for (;e < n; ) {
        var a, s;
        const r = e + n >> 1, l = i[r], h = l.timing.diff(t.timing);
        h < 0 || 0 === h && (null !== (a = l.id) && void 0 !== a ? a : 0) < (null !== (s = t.id) && void 0 !== s ? s : 0) ? e = r + 1 : n = r;
      }
      i.splice(e, 0, t);
    };
    this._activeRun = {
      now: e,
      pending: i,
      seen: n,
      tryAdd: t => {
        n.has(t) || (n.add(t), e.diff(t.timing) >= 0 && insert(t));
      }
    };
    try {
      for (;i.length > 0; ) {
        const n = i[0];
        if (this._current = n, e.diff(n.timing) < 0) break;
        if (this.timer.queue.includes(n)) {
          if (n.active = t(), yield n, this._abort) break;
          if (n.ending = t(), this.cache.done.push(n), i.shift(), this.timer.queue.includes(n)) if (n.type === r.setInterval && null != n.interval) {
            const t = n.timing, i = t.add(n.interval);
            if (i.valueOf() > t.valueOf() && i.valueOf() <= e.valueOf()) {
              n.timing = i, insert(n);
              continue;
            }
            n.timing = i;
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
    for (const t of this._runGenerator()) ;
    return this;
  };
  runAsync=async () => {
    if (this._activeRun) return this;
    null == this._runStartNow && (this._runStartNow = this.timer.now()), this._gen = this._runCore();
    for (const t of this._gen) await t.callback(t, this.timer);
    return this;
  };
  * _wrapRunGen() {
    for (const t of this._runCore()) t.callback(t, this.timer), yield t;
  }
  _runGenerator() {
    return this._activeRun || null == this._gen && (this._gen = this._wrapRunGen()), 
    this._gen;
  }
  runGenerator() {
    return this._runGenerator();
  }
  start=t => (this._activeRun || (this._runStartNow = this.timer.now(), this.advance(t), 
  this.timer.hasExpires() && this.run()), this);
  startAsync=async t => (this._activeRun || (this._runStartNow = this.timer.now(), 
  this.advance(t), this.timer.hasExpires() && await this.runAsync()), this);
  pause=() => {
    if (!this._activeRun) return this;
    const t = this._current;
    this.timer.sort();
    let e = null;
    for (const i of this.timer.queue) i !== t && (null == e || i.timing.diff(e) < 0) && (e = i.timing);
    return this._abort = !0, t && this.timer.remove(t), e && (this.timer.data.fake_now = e), 
    this;
  };
  cancel=() => {
    if (!this._activeRun) return this;
    const t = this._runStartNow, e = this._current;
    return this._abort = !0, e && this.timer.remove(e), t && (this.timer.data.fake_now = t), 
    this;
  };
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
    a = void 0;
  };
  globalClockState() {
    return this._clockInstalled ? l.self : null != a ? l.global : l.none;
  }
  installGlobalClock=() => {
    if (this._clockInstalled || null != a) return this;
    this._originalDateNow = Date.now;
    const t = globalThis.performance;
    return this._originalPerfNow = t && "function" == typeof t.now ? t.now.bind(t) : void 0, 
    Date.now = () => this.timer.now().valueOf(), t && this._originalPerfNow && (t.now = () => this.timer.now().valueOf() - this.timer.data.fake_init.valueOf()), 
    this._clockInstalled = !0, a = () => this._doUninstall(), this;
  };
  uninstallGlobalClock=() => this._clockInstalled || null != a ? null != a ? (a(), 
  this) : (this._doUninstall(), this) : this;
}

const h = /*#__PURE__*/ new FakeTimer, o = h.setTimeout, u = h.setInterval, c = h.setImmediate, m = h.clearTimeout, d = h.clearInterval, _ = h.clearImmediate, f = h.advance, g = h.run, w = h.runAsync, v = h.start, k = h.startAsync, p = h.clearAll, b = h.reset, y = h.requestAnimationFrame, I = h.cancelAnimationFrame;

export { l as EnumGlobalClockState, r as EnumTimerType, FakeTimer, QueueTimer, TimeCore, UnsafeGlobalFakeTimer, f as advance, I as cancelAnimationFrame, p as clearAll, _ as clearImmediate, d as clearInterval, m as clearTimeout, h as default, h as defaultFakeTimer, getUnsafeGlobalFakeTimer, y as requestAnimationFrame, b as reset, g as run, w as runAsync, c as setImmediate, u as setInterval, o as setTimeout, v as start, k as startAsync, toDuration };
//# sourceMappingURL=index.esm.mjs.map
