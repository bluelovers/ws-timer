import t from "dayjs";

import i from "dayjs/plugin/duration";

import e from "dayjs/plugin/minMax";

import { nanoid as n } from "nanoid";

t.extend(i);

class TimeCore {
  data={};
  constructor(i) {
    let e;
    this.static.isValidDate(i) && ([i, e] = [ {}, i ]), e = t(e), this.data = Object.assign(this.data, {
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
  get static() {
    return this.__proto__.constructor;
  }
  static isValidDate(i) {
    return !!(t.isDayjs(i) || i instanceof Date) || !("number" != typeof i || !t(i).isValid()) || !!Date.parse(i);
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
  reset() {
    return this.data.virtual_now = this.data.virtual_init, this.data.virtual_old = void 0, 
    this.data.id = 0, this;
  }
}

t.extend(i), t.extend(e);

let r, a, s = /*#__PURE__*/ function(t) {
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
  add=i => {
    const e = this.now();
    return i.virtualTiming = i.virtualTiming || e, i = Object.assign({
      id: null,
      name: null,
      virtualTiming: null
    }, i, {
      id: this.id(),
      name: n(),
      virtualTiming: t.isDuration(i.virtualTiming) ? e.add(i.virtualTiming) : i.virtualTiming,
      virtualAdded: e,
      count: 0,
      index: this.length
    }), this._cache_timing(i.virtualTiming), this.queue.push(i), i;
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

t.extend(i);

class FakeTimer {
  cache={
    done: []
  };
  frameInterval=t.duration(1000 / 60);
  get initTime() {
    return this.timer.data.virtual_init;
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
    var r;
    const a = toDuration(normalizeDelay(e)), l = this.timer.add({
      callback: i,
      virtualTiming: a,
      interval: t === s.setInterval ? a : void 0,
      params: n,
      type: t
    });
    return null === (r = this._activeRun) || void 0 === r || r.tryAdd(l), l;
  }
  setTimeout=(t, i, ...e) => this._schedule(s.setTimeout, t, i, e);
  setInterval=(t, i, ...e) => this._schedule(s.setInterval, t, i, e);
  setImmediate=(t, ...i) => this._schedule(s.setImmediate, t, 0, i);
  requestAnimationFrame=(t, ...i) => this._schedule(s.requestAnimationFrame, t, this.frameInterval, i);
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
          if (n.realEnding = t(), this.cache.done.push(n), e.shift(), this.timer.queue.includes(n)) if (n.type === s.setInterval && null != n.interval) {
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
  return null != a ? a : a = new UnsafeGlobalFakeTimer;
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
    r = void 0;
  };
  globalClockState() {
    return this._clockInstalled ? l.self : null != r ? l.global : l.none;
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

const u = /*#__PURE__*/ new FakeTimer, o = u.setTimeout, h = u.setInterval, c = u.setImmediate, m = u.clearTimeout, d = u.clearInterval, v = u.clearImmediate, _ = u.advance, f = u.run, g = u.runAsync, w = u.start, T = u.startAsync, p = u.clearAll, b = u.reset, y = u.requestAnimationFrame, k = u.cancelAnimationFrame;

export { l as EnumGlobalClockState, s as EnumTimerType, FakeTimer, QueueTimer, TimeCore, UnsafeGlobalFakeTimer, _ as advance, k as cancelAnimationFrame, p as clearAll, v as clearImmediate, d as clearInterval, m as clearTimeout, u as default, u as defaultFakeTimer, getUnsafeGlobalFakeTimer, normalizeDelay, y as requestAnimationFrame, b as reset, f as run, g as runAsync, c as setImmediate, h as setInterval, o as setTimeout, w as start, T as startAsync, toDuration };
//# sourceMappingURL=index.esm.mjs.map
