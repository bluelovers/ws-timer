"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
});

var e = require("dayjs"), t = require("dayjs/plugin/duration"), i = require("dayjs/plugin/minMax"), n = require("nanoid");

const r = /*#__PURE__*/ (() => (e.extend(t), e.extend(i), e))();

let a, s, l = /*#__PURE__*/ function(e) {
  return e.setTimeout = "setTimeout", e.setInterval = "setInterval", e.setImmediate = "setImmediate", 
  e.requestAnimationFrame = "requestAnimationFrame", e;
}({});

function isValidDate(e) {
  return !!(r.isDayjs(e) || e instanceof Date) || !("number" != typeof e || !r(e).isValid()) || !!Date.parse(e);
}

function toDuration(e) {
  return r.isDuration(e) ? e : r.duration(e);
}

function normalizeDelay(e, t) {
  const i = null != e ? e : 0;
  return function normalizeFiniteDelay(e, t, i = 0) {
    if (!Number.isFinite(e)) throw new RangeError(`fake-timer: delay must resolve to a finite number of milliseconds; received ${String(t)} (Infinity / -Infinity / NaN / dayjs.duration(NaN) / dayjs.duration(Infinity) are not allowed).`);
    return e > 0 ? t : null != i ? i : 0;
  }("number" == typeof i ? i : i.asMilliseconds(), i, t);
}

function normalizeDelaySafe(e, t) {
  return normalizeDelay(e, null != t ? t : 100);
}

function compareQueueItemIdAsc(e, t) {
  var i, n;
  const r = null !== (i = e.id) && void 0 !== i ? i : 0, a = null !== (n = t.id) && void 0 !== n ? n : 0;
  return r < a ? -1 : r > a ? 1 : 0;
}

function queueSortByTimingThenIdAsc(e, t) {
  const i = e.virtualTiming.diff(t.virtualTiming);
  return 0 !== i ? i : compareQueueItemIdAsc(e, t);
}

class TimeCore {
  data={};
  constructor(e) {
    let t;
    isValidDate(e) && ([e, t] = [ {}, e ]), t = r(t), this.data = Object.assign(this.data, {
      id: 0,
      real_init: r(),
      virtual_init: t,
      virtual_now: t
    }, e), this._init();
  }
  _init() {}
  static new(e) {
    return new this(e);
  }
  update(e = 100, t) {
    return this.data.virtual_old = this.data.virtual_now, this.data.virtual_now = r.isDuration(e) ? this.data.virtual_now.add(e) : "object" == typeof e ? r(e) : t || "number" == typeof e ? this.data.virtual_now.add(e, t) : this.data.virtual_now.add(100), 
    this;
  }
  id(e) {
    return e ? this.data.id : this.data.id++;
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
    const t = this.now();
    return e.virtualTiming = e.virtualTiming || t, e = Object.assign({
      id: null,
      name: null,
      virtualTiming: null
    }, e, {
      id: this.id(),
      name: n.nanoid(),
      virtualTiming: r.isDuration(e.virtualTiming) ? t.add(e.virtualTiming) : e.virtualTiming,
      virtualAdded: t,
      count: 0,
      index: this.length
    }), this._cache_timing(e.virtualTiming), this.queue.push(e), e;
  };
  _cache_refresh=() => {
    this.cache.min = this.length ? this.eq(0).virtualTiming : null, this.cache.max = this.length ? this.eq(-1).virtualTiming : null;
  };
  _cache_timing=(e, t) => {
    t && (this.cache.max = null, this.cache.min = null), this.cache.max = this.cache.max ? r.max(this.cache.max, e) : e, 
    this.cache.min = this.cache.min ? r.min(this.cache.min, e) : e;
  };
  sort=e => {
    let t = this;
    return this.queue.sort(e || this.data.sort || queueSortByTimingThenIdAsc), this._cache_timing(null, !0), 
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
  constructor(e) {
    const t = null == e ? void 0 : e.safeMinDelay;
    if (void 0 !== t && (!Number.isFinite(t) || t <= 0)) throw new RangeError(`fake-timer: safeMinDelay must be a finite number > 0; received ${String(t)}.`);
    this.safeMinDelay = t, this.timer = QueueTimer.new(e);
  }
  _schedule(e, t, i, n) {
    var r;
    const a = toDuration(e === l.setImmediate ? normalizeDelay(i) : normalizeDelaySafe(i, this.safeMinDelay)), s = this.timer.add({
      callback: t,
      virtualTiming: a,
      interval: e === l.setInterval ? a : void 0,
      params: n,
      type: e
    });
    return null === (r = this._activeRun) || void 0 === r || r.tryAdd(s), s;
  }
  setTimeout=(e, t, ...i) => this._schedule(l.setTimeout, e, t, i);
  setInterval=(e, t, ...i) => this._schedule(l.setInterval, e, t, i);
  setImmediate=(e, ...t) => this._schedule(l.setImmediate, e, 0, t);
  requestAnimationFrame=(e, ...t) => this._schedule(l.requestAnimationFrame, e, this.frameInterval, t);
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
    const e = this.timer.now();
    this.cache.done = [];
    const t = [ ...this.timer.queue ], i = new WeakSet;
    for (const e of t) i.add(e);
    const insert = e => {
      let i = 0, n = t.length;
      for (;i < n; ) {
        const r = i + n >> 1, a = t[r], s = a.virtualTiming.diff(e.virtualTiming);
        s < 0 || 0 === s && compareQueueItemIdAsc(a, e) < 0 ? i = r + 1 : n = r;
      }
      t.splice(i, 0, e);
    };
    this._activeRun = {
      now: e,
      pending: t,
      seen: i,
      tryAdd: t => {
        i.has(t) || (i.add(t), e.diff(t.virtualTiming) >= 0 && insert(t));
      }
    };
    try {
      for (;t.length > 0; ) {
        const i = t[0];
        if (this._current = i, e.diff(i.virtualTiming) < 0) break;
        if (this.timer.queue.includes(i)) {
          if (i.realActive = r(), yield i, this._abort) break;
          if (i.realEnding = r(), this.cache.done.push(i), t.shift(), this.timer.queue.includes(i)) if (i.type === l.setInterval && null != i.interval) {
            const t = i.virtualTiming, n = t.add(i.interval);
            if (n.valueOf() > t.valueOf() && n.valueOf() <= e.valueOf()) {
              i.virtualTiming = n, insert(i);
              continue;
            }
            i.virtualTiming = n;
          } else this.timer.remove(i);
        } else t.shift();
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

let u = /*#__PURE__*/ function(e) {
  return e.none = "none", e.self = "self", e.global = "global", e;
}({});

class UnsafeGlobalFakeTimer extends FakeTimer {
  _clockInstalled=!1;
  _doUninstall=() => {
    this._originalDateNow && (Date.now = this._originalDateNow);
    const e = globalThis.performance;
    e && this._originalPerfNow && (e.now = this._originalPerfNow), this._clockInstalled = !1, 
    a = void 0;
  };
  globalClockState() {
    return this._clockInstalled ? u.self : null != a ? u.global : u.none;
  }
  installGlobalClock=() => {
    if (this._clockInstalled || null != a) return this;
    this._originalDateNow = Date.now;
    const e = globalThis.performance;
    return this._originalPerfNow = e && "function" == typeof e.now ? e.now.bind(e) : void 0, 
    Date.now = () => this.timer.now().valueOf(), e && this._originalPerfNow && (e.now = () => this.timer.now().valueOf() - this.timer.data.virtual_init.valueOf()), 
    this._clockInstalled = !0, a = () => this._doUninstall(), this;
  };
  uninstallGlobalClock=() => this._clockInstalled || null != a ? null != a ? (a(), 
  this) : (this._doUninstall(), this) : this;
}

const o = /*#__PURE__*/ new FakeTimer, h = o.setTimeout, c = o.setInterval, m = o.setImmediate, d = o.clearTimeout, f = o.clearInterval, v = o.clearImmediate, _ = o.run, g = o.runAsync, p = o.start, T = o.startAsync, w = o.clearAll, y = o.reset, x = o.requestAnimationFrame, I = o.cancelAnimationFrame;

exports.DEFAULT_MIN_DELAY = 100, exports.EnumGlobalClockState = u, exports.EnumTimerType = l, 
exports.FakeTimer = FakeTimer, exports.QueueTimer = QueueTimer, exports.TimeCore = TimeCore, 
exports.UnsafeGlobalFakeTimer = UnsafeGlobalFakeTimer, exports.cancelAnimationFrame = I, 
exports.clearAll = w, exports.clearImmediate = v, exports.clearInterval = f, exports.clearTimeout = d, 
exports.compareQueueItemIdAsc = compareQueueItemIdAsc, exports.default = o, exports.defaultFakeTimer = o, 
exports.getUnsafeGlobalFakeTimer = function getUnsafeGlobalFakeTimer() {
  return null != s ? s : s = new UnsafeGlobalFakeTimer;
}, exports.isValidDate = isValidDate, exports.normalizeDelay = normalizeDelay, exports.normalizeDelaySafe = normalizeDelaySafe, 
exports.queueSortByTimingThenIdAsc = queueSortByTimingThenIdAsc, exports.queueSortByTimingThenIdDesc = function queueSortByTimingThenIdDesc(e, t) {
  const i = e.virtualTiming.diff(t.virtualTiming);
  return 0 !== i ? i : -compareQueueItemIdAsc(e, t);
}, exports.remainingDelayMilliseconds = function remainingDelayMilliseconds(e, t) {
  return t.virtualTiming.diff(e.now());
}, exports.requestAnimationFrame = x, exports.reset = y, exports.run = _, exports.runAsync = g, 
exports.setImmediate = m, exports.setInterval = c, exports.setTimeout = h, exports.start = p, 
exports.startAsync = T, exports.toDuration = toDuration;
//# sourceMappingURL=index.cjs.production.min.cjs.map
