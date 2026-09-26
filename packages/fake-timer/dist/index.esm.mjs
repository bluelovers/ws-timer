import t from "dayjs";

import "dayjs/plugin/duration";

import "dayjs/plugin/minMax";

import { nanoid as i } from "nanoid";

let e = /*#__PURE__*/ function(t) {
  return t.setTimeout = "setTimeout", t.setInterval = "setInterval", t.setImmediate = "setImmediate", 
  t.requestAnimationFrame = "requestAnimationFrame", t;
}({});

function isValidDate(i) {
  return !!(t.isDayjs(i) || i instanceof Date) || !("number" != typeof i || !t(i).isValid()) || !!Date.parse(i);
}

function toDuration(i) {
  return t.isDuration(i) ? i : t.duration(i);
}

function normalizeDelay(t, i) {
  const e = null != t ? t : 0;
  return function normalizeFiniteDelay(t, i, e = 0) {
    if (!Number.isFinite(t)) throw new RangeError(`fake-timer: delay must resolve to a finite number of milliseconds; received ${String(i)} (Infinity / -Infinity / NaN / dayjs.duration(NaN) / dayjs.duration(Infinity) are not allowed).`);
    return t > 0 ? i : null != e ? e : 0;
  }("number" == typeof e ? e : e.asMilliseconds(), e, i);
}

const n = 100;

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
  frameInterval=t.duration(1000 / 60);
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
  _schedule(t, i, n, r) {
    var a;
    const s = toDuration(t === e.setImmediate ? normalizeDelay(n) : normalizeDelaySafe(n, this.safeMinDelay)), l = this.timer.add({
      callback: i,
      virtualTiming: s,
      interval: t === e.setInterval ? s : void 0,
      params: r,
      type: t
    });
    return null === (a = this._activeRun) || void 0 === a || a.tryAdd(l), l;
  }
  setTimeout=(t, i, ...n) => this._schedule(e.setTimeout, t, i, n);
  setInterval=(t, i, ...n) => this._schedule(e.setInterval, t, i, n);
  setImmediate=(t, ...i) => this._schedule(e.setImmediate, t, 0, i);
  requestAnimationFrame=(t, ...i) => this._schedule(e.requestAnimationFrame, t, this.frameInterval, i);
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
    const n = [ ...this.timer.queue ], r = new WeakSet;
    for (const t of n) r.add(t);
    const insert = t => {
      let i = 0, e = n.length;
      for (;i < e; ) {
        const r = i + e >> 1, a = n[r], s = a.virtualTiming.diff(t.virtualTiming);
        s < 0 || 0 === s && compareQueueItemIdAsc(a, t) < 0 ? i = r + 1 : e = r;
      }
      n.splice(i, 0, t);
    };
    this._activeRun = {
      now: i,
      pending: n,
      seen: r,
      tryAdd: t => {
        r.has(t) || (r.add(t), i.diff(t.virtualTiming) >= 0 && insert(t));
      }
    };
    try {
      for (;n.length > 0; ) {
        const r = n[0];
        if (this._current = r, i.diff(r.virtualTiming) < 0) break;
        if (this.timer.queue.includes(r)) {
          if (r.realActive = t(), yield r, this._abort) break;
          if (r.realEnding = t(), this.cache.done.push(r), n.shift(), this.timer.queue.includes(r)) if (r.type === e.setInterval && null != r.interval) {
            const t = r.virtualTiming, e = t.add(r.interval);
            if (e.valueOf() > t.valueOf() && e.valueOf() <= i.valueOf()) {
              r.virtualTiming = e, insert(r);
              continue;
            }
            r.virtualTiming = e;
          } else this.timer.remove(r);
        } else n.shift();
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

let r, a;

function getUnsafeGlobalFakeTimer() {
  return null != a ? a : a = new UnsafeGlobalFakeTimer;
}

let s = /*#__PURE__*/ function(t) {
  return t.none = "none", t.self = "self", t.global = "global", t;
}({});

class UnsafeGlobalFakeTimer extends FakeTimer {
  _clockInstalled=!1;
  _doUninstall=() => {
    this._originalDateNow && (Date.now = this._originalDateNow);
    const t = globalThis.performance;
    t && this._originalPerfNow && (t.now = this._originalPerfNow), this._clockInstalled = !1, 
    r = void 0;
  };
  globalClockState() {
    return this._clockInstalled ? s.self : null != r ? s.global : s.none;
  }
  installGlobalClock=() => {
    if (this._clockInstalled || null != r) return this;
    this._originalDateNow = Date.now;
    const t = globalThis.performance;
    return this._originalPerfNow = t && "function" == typeof t.now ? t.now.bind(t) : void 0, 
    Date.now = () => this.timer.now().valueOf(), t && this._originalPerfNow && (t.now = () => this.timer.now().valueOf() - this.timer.data.virtual_init.valueOf()), 
    this._clockInstalled = !0, r = () => this._doUninstall(), this;
  };
  uninstallGlobalClock=() => this._clockInstalled || null != r ? null != r ? (r(), 
  this) : (this._doUninstall(), this) : this;
}

const l = /*#__PURE__*/ new FakeTimer, u = l.setTimeout, o = l.setInterval, h = l.setImmediate, c = l.clearTimeout, m = l.clearInterval, d = l.clearImmediate, f = l.run, v = l.runAsync, _ = l.start, g = l.startAsync, w = l.clearAll, T = l.reset, y = l.requestAnimationFrame, p = l.cancelAnimationFrame;

export { n as DEFAULT_MIN_DELAY, s as EnumGlobalClockState, e as EnumTimerType, FakeTimer, QueueTimer, TimeCore, UnsafeGlobalFakeTimer, p as cancelAnimationFrame, w as clearAll, d as clearImmediate, m as clearInterval, c as clearTimeout, compareQueueItemIdAsc, l as default, l as defaultFakeTimer, getUnsafeGlobalFakeTimer, isValidDate, normalizeDelay, normalizeDelaySafe, queueSortByTimingThenIdAsc, queueSortByTimingThenIdDesc, remainingDelayMilliseconds, y as requestAnimationFrame, T as reset, f as run, v as runAsync, h as setImmediate, o as setInterval, u as setTimeout, _ as start, g as startAsync, toDuration };
//# sourceMappingURL=index.esm.mjs.map
