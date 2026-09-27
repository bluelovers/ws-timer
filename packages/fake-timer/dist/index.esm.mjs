import t from "dayjs";

import i from "dayjs/plugin/duration";

import e from "dayjs/plugin/minMax";

import { nanoid as n } from "nanoid";

const r = /*#__PURE__*/ (() => (t.extend(i), t.extend(e), t))();

let a = /*#__PURE__*/ function(t) {
  return t.setTimeout = "setTimeout", t.setInterval = "setInterval", t.setImmediate = "setImmediate", 
  t.requestAnimationFrame = "requestAnimationFrame", t;
}({});

function isValidDate(t) {
  return !!(r.isDayjs(t) || t instanceof Date) || !("number" != typeof t || !r(t).isValid()) || !!Date.parse(t);
}

function toDuration(t) {
  return r.isDuration(t) ? t : r.duration(t);
}

function normalizeDelay(t, i) {
  const e = null != t ? t : 0;
  return function normalizeFiniteDelay(t, i, e = 0) {
    if (!Number.isFinite(t)) throw new RangeError(`fake-timer: delay must resolve to a finite number of milliseconds; received ${String(i)} (Infinity / -Infinity / NaN / dayjs.duration(NaN) / dayjs.duration(Infinity) are not allowed).`);
    return t > 0 ? i : null != e ? e : 0;
  }("number" == typeof e ? e : e.asMilliseconds(), e, i);
}

const s = 100;

function normalizeDelaySafe(t, i) {
  return normalizeDelay(t, null != i ? i : 100);
}

function compareQueueItemIdAsc(t, i) {
  var e, n;
  const r = null !== (e = t.id) && void 0 !== e ? e : 0, a = null !== (n = i.id) && void 0 !== n ? n : 0;
  return r < a ? -1 : r > a ? 1 : 0;
}

function queueSortByTimingThenIdDesc(t, i) {
  const e = t.virtualTiming.diff(i.virtualTiming);
  return 0 !== e ? e : -compareQueueItemIdAsc(t, i);
}

function queueSortByTimingThenIdAsc(t, i) {
  const e = t.virtualTiming.diff(i.virtualTiming);
  return 0 !== e ? e : compareQueueItemIdAsc(t, i);
}

function remainingDelayMilliseconds(t, i) {
  return i.virtualTiming.diff(t.now());
}

class TimeCore {
  data={};
  constructor(t) {
    let i;
    isValidDate(t) && ([t, i] = [ {}, t ]), i = r(i), this.data = Object.assign(this.data, {
      id: 0,
      real_init: r(),
      virtual_init: i,
      virtual_now: i
    }, t), this._init();
  }
  _init() {}
  static new(t) {
    return new this(t);
  }
  update(t = 100, i) {
    return this.data.virtual_old = this.data.virtual_now, this.data.virtual_now = r.isDuration(t) ? this.data.virtual_now.add(t) : "object" == typeof t ? r(t) : i || "number" == typeof t ? this.data.virtual_now.add(t, i) : this.data.virtual_now.add(100), 
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
  add=t => {
    const i = this.now();
    return t.virtualTiming = t.virtualTiming || i, t = Object.assign({
      id: null,
      name: null,
      virtualTiming: null
    }, t, {
      id: this.id(),
      name: n(),
      virtualTiming: r.isDuration(t.virtualTiming) ? i.add(t.virtualTiming) : t.virtualTiming,
      virtualAdded: i,
      count: 0,
      index: this.length
    }), this._cache_timing(t.virtualTiming), this.queue.push(t), t;
  };
  _cache_refresh=() => {
    this.cache.min = this.length ? this.eq(0).virtualTiming : null, this.cache.max = this.length ? this.eq(-1).virtualTiming : null;
  };
  _cache_timing=(t, i) => {
    i && (this.cache.max = null, this.cache.min = null), this.cache.max = this.cache.max ? r.max(this.cache.max, t) : t, 
    this.cache.min = this.cache.min ? r.min(this.cache.min, t) : t;
  };
  sort=t => {
    let i = this;
    return this.queue.sort(t || this.data.sort || queueSortByTimingThenIdAsc), this._cache_timing(null, !0), 
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

class FakeTimer {
  cache={
    done: []
  };
  frameInterval=r.duration(1000 / 60);
  get initTime() {
    return this.timer.initTime;
  }
  now() {
    return this.timer.now();
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
    const i = null == t ? void 0 : t.safeMinDelay;
    if (void 0 !== i && (!Number.isFinite(i) || i <= 0)) throw new RangeError(`fake-timer: safeMinDelay must be a finite number > 0; received ${String(i)}.`);
    this.safeMinDelay = i, this.timer = QueueTimer.new(t);
  }
  _schedule(t, i, e, n) {
    var r;
    const s = toDuration(t === a.setImmediate ? normalizeDelay(e) : normalizeDelaySafe(e, this.safeMinDelay)), l = this.timer.add({
      callback: i,
      virtualTiming: s,
      interval: t === a.setInterval ? s : void 0,
      params: n,
      type: t
    });
    return null === (r = this._activeRun) || void 0 === r || r.tryAdd(l), l;
  }
  setTimeout=(t, i, ...e) => this._schedule(a.setTimeout, t, i, e);
  setInterval=(t, i, ...e) => this._schedule(a.setInterval, t, i, e);
  setImmediate=(t, ...i) => this._schedule(a.setImmediate, t, 0, i);
  requestAnimationFrame=(t, ...i) => this._schedule(a.requestAnimationFrame, t, this.frameInterval, i);
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
    const t = this.timer.now();
    this.cache.done = [];
    const i = [ ...this.timer.queue ], e = new WeakSet;
    for (const t of i) e.add(t);
    const insert = t => {
      let e = 0, n = i.length;
      for (;e < n; ) {
        const r = e + n >> 1, a = i[r], s = a.virtualTiming.diff(t.virtualTiming);
        s < 0 || 0 === s && compareQueueItemIdAsc(a, t) < 0 ? e = r + 1 : n = r;
      }
      i.splice(e, 0, t);
    };
    this._activeRun = {
      now: t,
      pending: i,
      seen: e,
      tryAdd: i => {
        e.has(i) || (e.add(i), t.diff(i.virtualTiming) >= 0 && insert(i));
      }
    };
    try {
      for (;i.length > 0; ) {
        const e = i[0];
        if (this._current = e, t.diff(e.virtualTiming) < 0) break;
        if (this.timer.queue.includes(e)) {
          if (e.realActive = r(), yield e, this._abort) break;
          if (e.realEnding = r(), this.cache.done.push(e), i.shift(), this.timer.queue.includes(e)) if (e.type === a.setInterval && null != e.interval) {
            const i = e.virtualTiming, n = i.add(e.interval);
            if (n.valueOf() > i.valueOf() && n.valueOf() <= t.valueOf()) {
              e.virtualTiming = n, insert(e);
              continue;
            }
            e.virtualTiming = n;
          } else this.timer.remove(e);
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

let l, u;

function getUnsafeGlobalFakeTimer() {
  return null != u ? u : u = new UnsafeGlobalFakeTimer;
}

let o = /*#__PURE__*/ function(t) {
  return t.none = "none", t.self = "self", t.global = "global", t;
}({});

class UnsafeGlobalFakeTimer extends FakeTimer {
  _clockInstalled=!1;
  _doUninstall=() => {
    this._originalDateNow && (Date.now = this._originalDateNow);
    const t = globalThis.performance;
    t && this._originalPerfNow && (t.now = this._originalPerfNow), this._clockInstalled = !1, 
    l = void 0;
  };
  globalClockState() {
    return this._clockInstalled ? o.self : null != l ? o.global : o.none;
  }
  installGlobalClock=() => {
    if (this._clockInstalled || null != l) return this;
    this._originalDateNow = Date.now;
    const t = globalThis.performance;
    return this._originalPerfNow = t && "function" == typeof t.now ? t.now.bind(t) : void 0, 
    Date.now = () => this.timer.now().valueOf(), t && this._originalPerfNow && (t.now = () => this.timer.now().valueOf() - this.timer.data.virtual_init.valueOf()), 
    this._clockInstalled = !0, l = () => this._doUninstall(), this;
  };
  uninstallGlobalClock=() => this._clockInstalled || null != l ? null != l ? (l(), 
  this) : (this._doUninstall(), this) : this;
}

const h = /*#__PURE__*/ new FakeTimer, c = h.setTimeout, m = h.setInterval, d = h.setImmediate, f = h.clearTimeout, v = h.clearInterval, _ = h.clearImmediate, g = h.run, w = h.runAsync, T = h.start, y = h.startAsync, p = h.clearAll, I = h.reset, b = h.requestAnimationFrame, D = h.cancelAnimationFrame;

export { s as DEFAULT_MIN_DELAY, o as EnumGlobalClockState, a as EnumTimerType, FakeTimer, QueueTimer, TimeCore, UnsafeGlobalFakeTimer, D as cancelAnimationFrame, p as clearAll, _ as clearImmediate, v as clearInterval, f as clearTimeout, compareQueueItemIdAsc, h as default, h as defaultFakeTimer, getUnsafeGlobalFakeTimer, isValidDate, normalizeDelay, normalizeDelaySafe, queueSortByTimingThenIdAsc, queueSortByTimingThenIdDesc, remainingDelayMilliseconds, b as requestAnimationFrame, I as reset, g as run, w as runAsync, d as setImmediate, m as setInterval, c as setTimeout, T as start, y as startAsync, toDuration };
//# sourceMappingURL=index.esm.mjs.map
