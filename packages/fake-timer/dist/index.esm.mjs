import t from "dayjs";

import "dayjs/plugin/duration";

import "dayjs/plugin/minMax";

import { nanoid as i } from "nanoid";

let e, n, r = /*#__PURE__*/ function(t) {
  return t.setTimeout = "setTimeout", t.setInterval = "setInterval", t.setImmediate = "setImmediate", 
  t.requestAnimationFrame = "requestAnimationFrame", t;
}({});

function isValidDate(i) {
  return !!(t.isDayjs(i) || i instanceof Date) || !("number" != typeof i || !t(i).isValid()) || !!Date.parse(i);
}

function toDuration(i) {
  return t.isDuration(i) ? i : t.duration(i);
}

function normalizeDelay(t) {
  const i = null != t ? t : 0;
  if ("number" == typeof i) {
    if (!Number.isFinite(i)) throw new RangeError(`fake-timer: delay must be a finite number; received ${String(t)} (Infinity / -Infinity / NaN are not allowed — they create uncontrolled timers).`);
    return i < 0 ? 0 : i;
  }
  if (!Number.isFinite(i.asMilliseconds())) throw new RangeError(`fake-timer: delay Duration must resolve to a finite number of milliseconds; received ${String(t)} (dayjs.duration(NaN) / dayjs.duration(Infinity) are not allowed).`);
  return i.asMilliseconds() < 0 ? 0 : i;
}

class TimeCore {
  data={};
  constructor(i) {
    let e;
    isValidDate(i) && ([i, e] = [ {}, i ]), e = t(e), this.data = Object.assign(this.data, {
      id: 0,
      real_init: t(),
      virtual_init: e,
      virtual_now: e
    }, i), this._init();
  }
  _init() {}
  static new(t) {
    return new this(t);
  }
  update(i = 100, e) {
    return this.data.virtual_old = this.data.virtual_now, this.data.virtual_now = t.isDuration(i) ? this.data.virtual_now.add(i) : "object" == typeof i ? t(i) : e || "number" == typeof i ? this.data.virtual_now.add(i, e) : this.data.virtual_now.add(100), 
    this;
  }
  id(t) {
    return t ? this.data.id : this.data.id++;
  }
  now() {
    return this.data.virtual_now;
  }
  get initTime() {
    return this.data.virtual_init;
  }
  get elapsedMilliseconds() {
    return this.now().diff(this.initTime);
  }
  reset() {
    return this.data.virtual_now = this.data.virtual_init, this.data.virtual_old = void 0, 
    this.data.id = 0, this;
  }
}

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
  add=e => {
    const n = this.now();
    return e.virtualTiming = e.virtualTiming || n, e = Object.assign({
      id: null,
      name: null,
      virtualTiming: null
    }, e, {
      id: this.id(),
      name: i(),
      virtualTiming: t.isDuration(e.virtualTiming) ? n.add(e.virtualTiming) : e.virtualTiming,
      virtualAdded: n,
      count: 0,
      index: this.length
    }), this._cache_timing(e.virtualTiming), this.queue.push(e), e;
  };
  _cache_refresh=() => {
    this.cache.min = this.length ? this.eq(0).virtualTiming : null, this.cache.max = this.length ? this.eq(-1).virtualTiming : null;
  };
  _cache_timing=(i, e) => {
    e && (this.cache.max = null, this.cache.min = null), this.cache.max = this.cache.max ? t.max(this.cache.max, i) : i, 
    this.cache.min = this.cache.min ? t.min(this.cache.min, i) : i;
  };
  sort=t => {
    let i = this;
    return this.queue.sort(t || this.data.sort || queueSortCallback), this._cache_timing(null, !0), 
    this.queue.map(function(t, e) {
      t.index = e, i._cache_timing(t.virtualTiming);
    }), this;
  };
  eq=t => (-1 == t && (t = this.length - 1), this.queue[t]);
  _remove=t => {
    let i = this.queue.splice(t, 1);
    return 1 == i.length ? i[0] : null;
  };
  remove=t => "number" == typeof t || t in this.queue ? this._remove(t) : (t.name && (t = t.name), 
  (t = this.queue.findIndex(function(i) {
    return i.name == t;
  })) > -1 ? this._remove(t) : null);
  static new(t) {
    return super.new();
  }
  hasExpires=() => this.now().diff(this.cache.min) >= 0;
  clear() {
    return this.queue = [], this.cache.min = null, this.cache.max = null, this;
  }
}

function queueSortCallback(t, i) {
  return 0 == t.virtualTiming.diff(i.virtualTiming) ? t.id > i.id : t.virtualTiming.diff(i.virtualTiming);
}

class FakeTimer {
  cache={
    done: []
  };
  frameInterval=t.duration(1000 / 60);
  get initTime() {
    return this.timer.initTime;
  }
  get elapsedMilliseconds() {
    return this.timer.elapsedMilliseconds;
  }
  _activeRun=null;
  _gen=null;
  _runStartNow=null;
  _current=null;
  _abort=!1;
  constructor(t) {
    this.timer = QueueTimer.new(t);
  }
  _schedule(t, i, e, n) {
    var a;
    const s = toDuration(normalizeDelay(e)), l = this.timer.add({
      callback: i,
      virtualTiming: s,
      interval: t === r.setInterval ? s : void 0,
      params: n,
      type: t
    });
    return null === (a = this._activeRun) || void 0 === a || a.tryAdd(l), l;
  }
  setTimeout=(t, i, ...e) => this._schedule(r.setTimeout, t, i, e);
  setInterval=(t, i, ...e) => this._schedule(r.setInterval, t, i, e);
  setImmediate=(t, ...i) => this._schedule(r.setImmediate, t, 0, i);
  requestAnimationFrame=(t, ...i) => this._schedule(r.requestAnimationFrame, t, this.frameInterval, i);
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
    var i;
    return t < 0 && (t = null !== (i = this.timer.cache.min) && void 0 !== i ? i : 0), 
    this.timer.update(t), this.timer.sort(), this;
  };
  * _runCore() {
    const i = this.timer.now();
    this.cache.done = [];
    const e = [ ...this.timer.queue ], n = new WeakSet;
    for (const t of e) n.add(t);
    const insert = t => {
      let i = 0, n = e.length;
      for (;i < n; ) {
        var r, a;
        const s = i + n >> 1, l = e[s], u = l.virtualTiming.diff(t.virtualTiming);
        u < 0 || 0 === u && (null !== (r = l.id) && void 0 !== r ? r : 0) < (null !== (a = t.id) && void 0 !== a ? a : 0) ? i = s + 1 : n = s;
      }
      e.splice(i, 0, t);
    };
    this._activeRun = {
      now: i,
      pending: e,
      seen: n,
      tryAdd: t => {
        n.has(t) || (n.add(t), i.diff(t.virtualTiming) >= 0 && insert(t));
      }
    };
    try {
      for (;e.length > 0; ) {
        const n = e[0];
        if (this._current = n, i.diff(n.virtualTiming) < 0) break;
        if (this.timer.queue.includes(n)) {
          if (n.realActive = t(), yield n, this._abort) break;
          if (n.realEnding = t(), this.cache.done.push(n), e.shift(), this.timer.queue.includes(n)) if (n.type === r.setInterval && null != n.interval) {
            const t = n.virtualTiming, e = t.add(n.interval);
            if (e.valueOf() > t.valueOf() && e.valueOf() <= i.valueOf()) {
              n.virtualTiming = e, insert(n);
              continue;
            }
            n.virtualTiming = e;
          } else this.timer.remove(n);
        } else e.shift();
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
    for (const e of this._gen) {
      var t, i;
      e.count = (null !== (t = e.count) && void 0 !== t ? t : 0) + 1, await e.callback(e, this, ...null !== (i = e.params) && void 0 !== i ? i : []);
    }
    return this;
  };
  * _wrapRunGen() {
    for (const e of this._runCore()) {
      var t, i;
      e.count = (null !== (t = e.count) && void 0 !== t ? t : 0) + 1, e.callback(e, this, ...null !== (i = e.params) && void 0 !== i ? i : []), 
      yield e;
    }
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
    let i = null;
    for (const e of this.timer.queue) e !== t && (null == i || e.virtualTiming.diff(i) < 0) && (i = e.virtualTiming);
    return this._abort = !0, t && this.timer.remove(t), i && (this.timer.data.virtual_now = i), 
    this;
  };
  cancel=() => {
    if (!this._activeRun) return this;
    const t = this._runStartNow, i = this._current;
    return this._abort = !0, i && this.timer.remove(i), t && (this.timer.data.virtual_now = t), 
    this;
  };
}

function getUnsafeGlobalFakeTimer() {
  return null != n ? n : n = new UnsafeGlobalFakeTimer;
}

let a = /*#__PURE__*/ function(t) {
  return t.none = "none", t.self = "self", t.global = "global", t;
}({});

class UnsafeGlobalFakeTimer extends FakeTimer {
  _clockInstalled=!1;
  _doUninstall=() => {
    this._originalDateNow && (Date.now = this._originalDateNow);
    const t = globalThis.performance;
    t && this._originalPerfNow && (t.now = this._originalPerfNow), this._clockInstalled = !1, 
    e = void 0;
  };
  globalClockState() {
    return this._clockInstalled ? a.self : null != e ? a.global : a.none;
  }
  installGlobalClock=() => {
    if (this._clockInstalled || null != e) return this;
    this._originalDateNow = Date.now;
    const t = globalThis.performance;
    return this._originalPerfNow = t && "function" == typeof t.now ? t.now.bind(t) : void 0, 
    Date.now = () => this.timer.now().valueOf(), t && this._originalPerfNow && (t.now = () => this.timer.now().valueOf() - this.timer.data.virtual_init.valueOf()), 
    this._clockInstalled = !0, e = () => this._doUninstall(), this;
  };
  uninstallGlobalClock=() => this._clockInstalled || null != e ? null != e ? (e(), 
  this) : (this._doUninstall(), this) : this;
}

const s = /*#__PURE__*/ new FakeTimer, l = s.setTimeout, u = s.setInterval, o = s.setImmediate, h = s.clearTimeout, c = s.clearInterval, m = s.clearImmediate, d = s.advance, v = s.run, _ = s.runAsync, f = s.start, g = s.startAsync, w = s.clearAll, T = s.reset, p = s.requestAnimationFrame, b = s.cancelAnimationFrame;

export { a as EnumGlobalClockState, r as EnumTimerType, FakeTimer, QueueTimer, TimeCore, UnsafeGlobalFakeTimer, d as advance, b as cancelAnimationFrame, w as clearAll, m as clearImmediate, c as clearInterval, h as clearTimeout, s as default, s as defaultFakeTimer, getUnsafeGlobalFakeTimer, isValidDate, normalizeDelay, p as requestAnimationFrame, T as reset, v as run, _ as runAsync, o as setImmediate, u as setInterval, l as setTimeout, f as start, g as startAsync, toDuration };
//# sourceMappingURL=index.esm.mjs.map
