"use strict";

var e = require("dayjs"), t = require("dayjs/plugin/duration"), i = require("dayjs/plugin/minMax"), a = require("nanoid");

function toDuration(t) {
  return e.isDuration(t) ? t : e.duration(t);
}

e.extend(t);

class Time {
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
}

e.extend(t), e.extend(i);

class QueueTimer extends Time {
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
}

function queueSortCallback(e, t) {
  return 0 == e.timing.diff(t.timing) ? e.id > t.id : e.timing.diff(t.timing);
}

e.extend(t);

class Timer {
  cache={
    done: []
  };
  constructor(e) {
    this.timer = QueueTimer.new(e);
  }
  setTimeout=async (e, t, ...i) => this.timer.add({
    callback: e,
    timing: toDuration(t),
    params: i,
    type: "setTimeout"
  });
  setInterval=async (e, t, ...i) => this.timer.add({
    callback: e,
    timing: toDuration(t),
    params: i,
    type: "setInterval"
  });
  setImmediate=async (t, ...i) => this.timer.add({
    callback: t,
    timing: e.duration(0),
    params: i,
    type: "setImmediate"
  });
  start=async e => (e < 0 && (e = this.timer.cache.min), await this.timer.update(e), 
  await this.timer.sort(), this.timer.hasExpires() && await this.run(), this);
  run=async () => {
    let t = this.timer.now();
    this.cache.done = [];
    for (let i in this.timer.queue) {
      let a = this.timer.queue[i];
      if (!(t.diff(a.timing) >= 0)) break;
      a.active = e(), await a.callback(a, this.timer), this.timer.remove(i), a.ending = e(), 
      this.cache.done.push(a);
    }
    return this.timer._cache_refresh(), this;
  };
}

const n = /*#__PURE__*/ new Timer;

var s = n;

const r = n.setTimeout, u = n.setInterval, h = n.setImmediate;

Object.defineProperty(n, "__esModule", {
  value: !0
}), Object.defineProperty(n, "default", {
  value: n
}), Object.defineProperty(n, "Timer", {
  value: Timer
}), Object.defineProperty(n, "QueueTimer", {
  value: QueueTimer
}), Object.defineProperty(n, "setTimeout", {
  value: r
}), Object.defineProperty(n, "setInterval", {
  value: u
}), Object.defineProperty(n, "setImmediate", {
  value: h
}), module.exports = s;
//# sourceMappingURL=index.cjs.production.min.cjs.map
