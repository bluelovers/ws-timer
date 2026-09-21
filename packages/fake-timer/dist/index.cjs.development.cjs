'use strict';

var dayjs = require('dayjs');
var duration = require('dayjs/plugin/duration');
var minMax = require('dayjs/plugin/minMax');
var nanoid = require('nanoid');

dayjs.extend(duration);
function toDuration(value) {
  return dayjs.isDuration(value) ? value : dayjs.duration(value);
}
class TimeCore {
  data = {};
  /**
   * 建立 Time 實例
   * Create a Time instance
   *
   * @param options - 時間配置選項，可為 ITimeData 物件或直接傳入日期值 / Time config options, can be ITimeData object or a date value directly
   */
  constructor(options) {
    let now;
    if (this.static.isValidDate(options)) {
      [options, now] = [{}, options];
    }
    now = dayjs(now);
    this.data = Object.assign(this.data, {
      id: 0,
      real_init: dayjs(),
      fake_init: now,
      fake_now: now
    }, options);
    this._init();
  }
  _init() {}
  static new(options) {
    let t = new this(options);
    return t;
  }
  get static() {
    // @ts-ignore
    return this.__proto__.constructor;
  }
  static isValidDate(who) {
    if (dayjs.isDayjs(who) || who instanceof Date) {
      return true;
    } else if (typeof who == 'number' && dayjs(who).isValid()) {
      return true;
    } else if (Date.parse(who)) {
      return true;
    }
    return false;
  }
  update(amount = 100, unit) {
    this.data.fake_old = this.data.fake_now;
    if (dayjs.isDuration(amount)) {
      this.data.fake_now = this.data.fake_now.add(amount);
    } else if (typeof amount == 'object') {
      this.data.fake_now = dayjs(amount);
    } else if (unit || typeof amount == 'number') {
      this.data.fake_now = this.data.fake_now.add(amount, unit);
    } else {
      this.data.fake_now = this.data.fake_now.add(100);
    }
    return this;
  }
  /**
   * 取得或遞增識別碼
   * Get or increment the identifier
   *
   * @param bool - 若為 true 則僅回傳當前值不遞增，若為 false 或省略則回傳後遞增 / If true returns current value without increment, otherwise returns and increments
   */
  id(bool) {
    return bool ? this.data.id : this.data.id++;
  }
  now() {
    return this.data.fake_now;
  }
}

dayjs.extend(duration);
dayjs.extend(minMax);

/**
 * 計時器回呼函式介面
 * Timer callback function interface
 *
 * @param current - 當前執行的佇列項目 / The currently executing queue item
 * @param timer - 所屬的 QueueTimer 實例 / The owning QueueTimer instance
 */

class QueueTimer extends TimeCore {
  queue = [];
  cache = {
    min: null,
    max: null
  };
  constructor() {
    super(...arguments);
  }
  get length() {
    return this.queue.length;
  }
  add = q => {
    q.timing = q.timing || this.now();
    q = Object.assign({
      id: null,
      name: null,
      timing: null
    }, q, {
      id: this.id(),
      name: nanoid.nanoid(),
      timing: dayjs.isDuration(q.timing) ? this.now().add(q.timing) : q.timing,
      index: this.length
    });
    this._cache_timing(q.timing);
    this.queue.push(q);
    return q;
  };
  _cache_refresh = () => {
    this.cache.min = this.length ? this.eq(0).timing : null;
    this.cache.max = this.length ? this.eq(-1).timing : null;
  };
  /**
   * 增量更新快取的時間邊界
   * Incrementally update time boundaries in cache
   *
   * @param timing - 要比較的時間值 / Time value to compare
   * @param reset - 若為 true，先清空快取再重新計算 / If true, clear cache and recalculate
   */
  _cache_timing = (timing, reset) => {
    if (reset) {
      this.cache.max = null;
      this.cache.min = null;
    }
    this.cache.max = this.cache.max ? dayjs.max(this.cache.max, timing) : timing;
    this.cache.min = this.cache.min ? dayjs.min(this.cache.min, timing) : timing;
  };
  /**
   * 排序佇列並重新建立快取
   * Sort the queue and rebuild the cache
   *
   * @param cb - 自訂排序函式，若未提供則使用 data.sort 或預設排序
   *             Custom sort function; if not provided, uses data.sort or default sort
   */
  sort = cb => {
    let self = this;
    this.queue.sort(cb || this.data.sort || queueSortCallback);
    this._cache_timing(null, true);
    this.queue.map(function (q, index) {
      q.index = index;
      self._cache_timing(q.timing);
    });
    return this;
  };
  /**
   * 依索引取得佇列項目
   * Get queue item by index
   *
   * @param idx - 索引值，-1 表示最後一個項目 / Index, -1 means the last item
   */
  eq = idx => {
    if (idx == -1) {
      idx = this.length - 1;
    }
    return this.queue[idx];
  };
  /**
   * 依索引移除佇列項目（內部方法）
   * Remove queue item by index (internal method)
   *
   * @returns 被移除的項目，若移除失敗則回傳 null / Removed item, or null if removal failed
   */
  _remove = idx => {
    let q = this.queue.splice(idx, 1);
    if (q.length == 1) {
      return q[0];
    }
    return null;
  };
  remove = id => {
    // @ts-ignore
    if (typeof id == 'number' || id in this.queue) {
      return this._remove(id);
    } else if (id.name) {
      id = id.name;
    }
    id = this.queue.findIndex(function (q) {
      return q.name == id;
    });
    if (id > -1) {
      return this._remove(id);
    }
    return null;
  };
  // @ts-ignore
  static new(options) {
    return super.new();
  }
  hasExpires = () => {
    let d = this.now().diff(this.cache.min);
    return d >= 0;
  };
}
function queueSortCallback(a, b) {
  let d = a.timing.diff(b.timing);
  if (d == 0) {
    return a.id > b.id;
  }
  return a.timing.diff(b.timing);
}

dayjs.extend(duration);
class FakeTimer {
  cache = {
    done: []
  };
  /**
   * 建立 Timer 實例
   * Create a Timer instance
   *
   * @param options - 時間配置選項 / Time configuration options
   */
  constructor(options) {
    this.timer = QueueTimer.new(options);
  }
  /**
   * 模擬 setTimeout：將回呼函式排入佇列，延遲指定時間後執行
   * Simulate setTimeout: queue a callback to execute after a specified delay
   *
   * @param callback - 到期時執行的回呼函式 / Callback function to execute on expiry
   * @param delay - 延遲時間，可為毫秒數或 Duration 物件 / Delay time, can be milliseconds or Duration object
   * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
   * @returns 新增的佇列項目 / The newly added queue item
   */
  setTimeout = async (callback, delay, ...params) => {
    let q = this.timer.add({
      callback: callback,
      timing: toDuration(delay),
      params: params,
      type: 'setTimeout'
    });
    return q;
  };
  /**
   * 模擬 setInterval：將回呼函式排入佇列，以指定間隔重複執行
   * Simulate setInterval: queue a callback to execute repeatedly at specified intervals
   *
   * @param callback - 每次間隔到期時執行的回呼函式 / Callback to execute each interval
   * @param delay - 間隔時間，可為毫秒數或 Duration 物件 / Interval time, can be milliseconds or Duration object
   * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
   * @returns 新增的佇列項目 / The newly added queue item
   */
  setInterval = async (callback, delay, ...params) => {
    let q = this.timer.add({
      callback: callback,
      timing: toDuration(delay),
      params: params,
      type: 'setInterval'
    });
    return q;
  };
  /**
   * 模擬 setImmediate：將回呼函式排入佇列，於下次執行時立即觸發
   * Simulate setImmediate: queue a callback to trigger immediately on next run
   *
   * @param callback - 要立即執行的回呼函式 / Callback to execute immediately
   * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
   * @returns 新增的佇列項目 / The newly added queue item
   */
  setImmediate = async (callback, ...params) => {
    let q = this.timer.add({
      callback: callback,
      timing: dayjs.duration(0),
      params: params,
      type: 'setImmediate'
    });
    return q;
  };
  /**
   * 推進虛擬時間並執行到期的計時器
   * Advance fake time and execute expired timers
   *
   * @param amount - 推進的時間量，可為毫秒數或 Duration 物件 / Amount of time to advance, can be milliseconds or Duration object
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  start = async amount => {
    if (amount < 0) {
      amount = this.timer.cache.min;
    }
    await this.timer.update(amount);
    await this.timer.sort();
    if (this.timer.hasExpires()) {
      await this.run();
    }
    return this;
  };
  /**
   * 執行所有到期的佇列項目
   * Execute all expired queue items
   *
   * 依序遍歷佇列，對已到期的項目執行其回呼函式，
   * 執行完畢後將項目從佇列移除並加入 done 快取。
   * Iterates through the queue, executing callbacks for expired items,
   * then removes them from the queue and adds to the done cache.
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  run = async () => {
    let now = this.timer.now();
    this.cache.done = [];
    for (let idx in this.timer.queue) {
      let current = this.timer.queue[idx];
      if (now.diff(current.timing) >= 0) {
        current.active = dayjs();
        await current.callback(current, this.timer);
        this.timer.remove(idx);
        current.ending = dayjs();
        this.cache.done.push(current);
      } else {
        break;
      }
    }
    this.timer._cache_refresh();
    return this;
  };
}
const defaultFakeTimer = /*#__PURE__*/new FakeTimer();
var _ = defaultFakeTimer;
const setTimeout = defaultFakeTimer.setTimeout;
const setInterval = defaultFakeTimer.setInterval;
const setImmediate = defaultFakeTimer.setImmediate;
// @ts-ignore
{
  Object.defineProperty(defaultFakeTimer, "__esModule", {
    value: true
  });
  Object.defineProperty(defaultFakeTimer, "default", {
    value: defaultFakeTimer
  });
  Object.defineProperty(defaultFakeTimer, "FakeTimer", {
    value: FakeTimer
  });
  Object.defineProperty(defaultFakeTimer, "QueueTimer", {
    value: QueueTimer
  });
  Object.defineProperty(defaultFakeTimer, "TimeCore", {
    value: TimeCore
  });
  Object.defineProperty(defaultFakeTimer, "setTimeout", {
    value: setTimeout
  });
  Object.defineProperty(defaultFakeTimer, "setInterval", {
    value: setInterval
  });
  Object.defineProperty(defaultFakeTimer, "setImmediate", {
    value: setImmediate
  });
}

/**
 * CJS 模組入口點，將 ESM 預設匯出轉為 CommonJS 模組
 * CJS module entry point, converts ESM default export to CommonJS module
 */

// @ts-ignore
module.exports = _;
//# sourceMappingURL=index.cjs.development.cjs.map
