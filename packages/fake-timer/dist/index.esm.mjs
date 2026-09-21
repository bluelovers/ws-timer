import t from "dayjs";

import i from "dayjs/plugin/duration";

import e from "dayjs/plugin/minMax";

import { nanoid as a } from "nanoid";

function toDuration(i) {
  return t.isDuration(i) ? i : t.duration(i);
}

t.extend(i);

class Time {
  data={};
  constructor(i) {
    let e;
    this.static.isValidDate(i) && ([i, e] = [ {}, i ]), e = t(e), this.data = Object.assign(this.data, {
      id: 0,
      real_init: t(),
      fake_init: e,
      fake_now: e
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
    return this.data.fake_old = this.data.fake_now, this.data.fake_now = t.isDuration(i) ? this.data.fake_now.add(i) : "object" == typeof i ? t(i) : e || "number" == typeof i ? this.data.fake_now.add(i, e) : this.data.fake_now.add(100), 
    this;
  }
  id(t) {
    return t ? this.data.id : this.data.id++;
  }
  now() {
    return this.data.fake_now;
  }
}

t.extend(i), t.extend(e);

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
  add=i => (i.timing = i.timing || this.now(), i = Object.assign({
    id: null,
    name: null,
    timing: null
  }, i, {
    id: this.id(),
    name: a(),
    timing: t.isDuration(i.timing) ? this.now().add(i.timing) : i.timing,
    index: this.length
  }), this._cache_timing(i.timing), this.queue.push(i), i);
  _cache_refresh=() => {
    this.cache.min = this.length ? this.eq(0).timing : null, this.cache.max = this.length ? this.eq(-1).timing : null;
  };
  _cache_timing=(i, e) => {
    e && (this.cache.max = null, this.cache.min = null), this.cache.max = this.cache.max ? t.max(this.cache.max, i) : i, 
    this.cache.min = this.cache.min ? t.min(this.cache.min, i) : i;
  };
  sort=t => {
    let i = this;
    return this.queue.sort(t || this.data.sort || queueSortCallback), this._cache_timing(null, !0), 
    this.queue.map(function(t, e) {
      t.index = e, i._cache_timing(t.timing);
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
}

function queueSortCallback(t, i) {
  return 0 == t.timing.diff(i.timing) ? t.id > i.id : t.timing.diff(i.timing);
}

t.extend(i);

class Timer {
  cache={
    done: []
  };
  constructor(t) {
    this.timer = QueueTimer.new(t);
  }
  setTimeout=async (t, i, ...e) => this.timer.add({
    callback: t,
    timing: toDuration(i),
    params: e,
    type: "setTimeout"
  });
  setInterval=async (t, i, ...e) => this.timer.add({
    callback: t,
    timing: toDuration(i),
    params: e,
    type: "setInterval"
  });
  setImmediate=async (i, ...e) => this.timer.add({
    callback: i,
    timing: t.duration(0),
    params: e,
    type: "setImmediate"
  });
  start=async t => (t < 0 && (t = this.timer.cache.min), await this.timer.update(t), 
  await this.timer.sort(), this.timer.hasExpires() && await this.run(), this);
  run=async () => {
    let i = this.timer.now();
    this.cache.done = [];
    for (let e in this.timer.queue) {
      let a = this.timer.queue[e];
      if (!(i.diff(a.timing) >= 0)) break;
      a.active = t(), await a.callback(a, this.timer), this.timer.remove(e), a.ending = t(), 
      this.cache.done.push(a);
    }
    return this.timer._cache_refresh(), this;
  };
}

const n = /*#__PURE__*/ new Timer, s = n.setTimeout, r = n.setInterval, h = n.setImmediate;

export { Timer, n as default, n as init, h as setImmediate, r as setInterval, s as setTimeout };
//# sourceMappingURL=index.esm.mjs.map
