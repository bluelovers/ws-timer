'use strict';

var dayjs = require('dayjs');
var duration = require('dayjs/plugin/duration');
var minMax = require('dayjs/plugin/minMax');
var nanoid = require('nanoid');

dayjs.extend(duration);
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
  /**
   * 將虛擬時間重置回初始值（fake_init），並重設識別碼計數器
   * Reset the fake time back to its initial value (fake_init) and reset the id counter
   *
   * 不影響 real_init（建立實例時捕捉的真實時間）。
   * Does not affect real_init (the real time captured at instance creation).
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  reset() {
    this.data.fake_now = this.data.fake_init;
    this.data.fake_old = undefined;
    this.data.id = 0;
    return this;
  }
}

dayjs.extend(duration);
dayjs.extend(minMax);
let EnumTimerType = /*#__PURE__*/function (EnumTimerType) {
  EnumTimerType["setTimeout"] = "setTimeout";
  EnumTimerType["setInterval"] = "setInterval";
  EnumTimerType["setImmediate"] = "setImmediate";
  EnumTimerType["requestAnimationFrame"] = "requestAnimationFrame";
  return EnumTimerType;
}({});

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
  /**
   * 清空整個佇列（移除所有計時器項目）
   * Clear the entire queue (removes all timer items)
   *
   * 不影響虛擬時間（時鐘保持不變）。
   * Does not affect fake time (the clock stays unchanged).
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  clear() {
    this.queue = [];
    this.cache.min = null;
    this.cache.max = null;
    return this;
  }
}
function queueSortCallback(a, b) {
  let d = a.timing.diff(b.timing);
  if (d == 0) {
    return a.id > b.id;
  }
  return a.timing.diff(b.timing);
}

dayjs.extend(duration);
function toDuration(value) {
  return dayjs.isDuration(value) ? value : dayjs.duration(value);
}
class FakeTimer {
  cache = {
    done: []
  };
  frameInterval = dayjs.duration(1000 / 60);
  _activeRun = null;
  _gen = null;
  _runStartNow = null;
  _current = null;
  _abort = false;
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
   * 內部排程方法：將回呼加入佇列並回傳佇列項目
   * Internal scheduling method: add a callback to the queue and return the queue item
   *
   * 此為 setTimeout / setInterval / setImmediate 的單一實作來源（single source of truth），
   * 三者僅在 type 與 timing / interval 計算上不同。
   * This is the single implementation source for setTimeout / setInterval / setImmediate;
   * the three differ only in `type` and how `timing` / `interval` are computed.
   *
   * @param type - 計時器類型 / Timer type
   * @param callback - 到期時執行的回呼函式 / Callback to execute on expiry
   * @param delay - 延遲時間（setImmediate 一律視為 0）/ Delay (treated as 0 for setImmediate)
   * @param params - 傳遞給回呼函式的額外參數 / Extra params passed to the callback
   * @returns 新增的佇列項目 / The newly added queue item
   */
  _schedule(type, callback, delay, params) {
    var _this$_activeRun;
    const item = this.timer.add({
      callback: callback,
      timing: toDuration(delay),
      interval: type === EnumTimerType.setInterval ? toDuration(delay) : undefined,
      params: params,
      type: type
    });
    (_this$_activeRun = this._activeRun) === null || _this$_activeRun === void 0 || _this$_activeRun.tryAdd(item);
    return item;
  }
  /**
   * 模擬 setTimeout：將回呼函式排入佇列，延遲指定時間後執行
   * Simulate setTimeout: queue a callback to execute after a specified delay
   *
   * 同步 API：直接回傳佇列項目，不回傳 Promise。
   * Synchronous API: returns the queue item directly (no Promise).
   *
   * @param callback - 到期時執行的回呼函式 / Callback function to execute on expiry
   * @param delay - 延遲時間，可為毫秒數或 Duration 物件 / Delay time, can be milliseconds or Duration object
   * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
   * @returns 新增的佇列項目 / The newly added queue item
   */
  setTimeout = (callback, delay, ...params) => {
    return this._schedule(EnumTimerType.setTimeout, callback, delay, params);
  };
  /**
   * 模擬 setInterval：將回呼函式排入佇列，以指定間隔重複執行
   * Simulate setInterval: queue a callback to execute repeatedly at specified intervals
   *
   * 同步 API：直接回傳佇列項目，不回傳 Promise。週期重複由 run / runAsync 統一處理。
   * Synchronous API: returns the queue item directly. Periodic repetition is handled
   * uniformly by run / runAsync.
   *
   * @param callback - 每次間隔到期時執行的回呼函式 / Callback to execute each interval
   * @param delay - 間隔時間，可為毫秒數或 Duration 物件 / Interval time, can be milliseconds or Duration object
   * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
   * @returns 新增的佇列項目 / The newly added queue item
   */
  setInterval = (callback, delay, ...params) => {
    return this._schedule(EnumTimerType.setInterval, callback, delay, params);
  };
  /**
   * 模擬 setImmediate：將回呼函式排入佇列，於下次執行時立即觸發
   * Simulate setImmediate: queue a callback to trigger immediately on next run
   *
   * 同步 API：直接回傳佇列項目，不回傳 Promise。
   * Synchronous API: returns the queue item directly (no Promise).
   *
   * @param callback - 要立即執行的回呼函式 / Callback to execute immediately
   * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
   * @returns 新增的佇列項目 / The newly added queue item
   */
  setImmediate = (callback, ...params) => {
    return this._schedule(EnumTimerType.setImmediate, callback, 0, params);
  };
  /**
   * 模擬 requestAnimationFrame：於下一個「影格」觸發回呼
   * Simulate requestAnimationFrame: fire the callback on the next frame
   *
   * 排程時間為「目前虛擬時間 + frameInterval」，因此每個影格呼叫一次 advance(frameInterval)
   * 再 run() 即可觸發該影格的 rAF 回呼（與遊戲主迴圈完全相同）。
   * The scheduled time is `now + frameInterval`, so calling advance(frameInterval) then run()
   * each frame triggers that frame's rAF callback (identical to a game main loop).
   *
   * 同步 API：直接回傳佇列項目，不回傳 Promise。
   * Synchronous API: returns the queue item directly (no Promise).
   *
   * @param callback - 影格觸發時執行的回呼函式 / Callback to execute on the frame
   * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
   * @returns 新增的佇列項目（可作為 cancelAnimationFrame 的 handle）/ The new queue item (usable as cancelAnimationFrame handle)
   */
  requestAnimationFrame = (callback, ...params) => {
    return this._schedule(EnumTimerType.requestAnimationFrame, callback, this.frameInterval, params);
  };
  /**
   * 模擬 cancelAnimationFrame：取消尚未觸發的 rAF 項目
   * Simulate cancelAnimationFrame: cancel a pending rAF item
   *
   * 與 clearTimeout 共用同一實作（remove）。
   * Shares the same implementation (remove) as clearTimeout.
   *
   * @param handle - 要取消的項目，可為佇列項目、唯一名稱或索引 / Item to cancel (queue item, name, or index)
   * @returns 被移除的項目，若未找到則回傳 null / The removed item, or null if not found
   */
  cancelAnimationFrame = handle => {
    return this._clear(handle);
  };
  /**
   * 內部取消方法：從佇列移除指定項目
   * Internal cancellation method: remove the specified item from the queue
   *
   * 此為 clearTimeout / clearInterval / clearImmediate 的單一實作來源（single source of truth）。
   * This is the single implementation source for clearTimeout / clearInterval / clearImmediate.
   *
   * @param handle - 要取消的項目，可為佇列項目、唯一名稱或索引 / Item to cancel (queue item, name, or index)
   * @returns 被移除的項目，若未找到或 handle 為空則回傳 null / Removed item, or null if not found/empty
   */
  _clear(handle) {
    if (handle == null) {
      return null;
    }
    return this.timer.remove(handle);
  }
  /**
   * 模擬 clearTimeout：取消尚未執行的 setTimeout 項目
   * Simulate clearTimeout: cancel a pending setTimeout item
   *
   * @param handle - 要取消的項目，可為佇列項目、唯一名稱或索引 / Item to cancel (queue item, name, or index)
   * @returns 被移除的項目，若未找到則回傳 null / The removed item, or null if not found
   */
  clearTimeout = handle => {
    return this._clear(handle);
  };
  /**
   * 模擬 clearInterval：停止 setInterval 的週期重複
   * Simulate clearInterval: stop a setInterval from repeating
   *
   * 與原生 API 相同，clearTimeout / clearInterval 本質上都只是從佇列移除指定項目。
   * Like the native API, clearTimeout / clearInterval are both just queue removals.
   *
   * @param handle - 要取消的項目，可為佇列項目、唯一名稱或索引 / Item to cancel (queue item, name, or index)
   * @returns 被移除的項目，若未找到則回傳 null / The removed item, or null if not found
   */
  clearInterval = handle => {
    return this._clear(handle);
  };
  /**
   * 模擬 clearImmediate：取消尚未執行的 setImmediate 項目
   * Simulate clearImmediate: cancel a pending setImmediate item
   *
   * @param handle - 要取消的項目，可為佇列項目、唯一名稱或索引 / Item to cancel (queue item, name, or index)
   * @returns 被移除的項目，若未找到則回傳 null / The removed item, or null if not found
   */
  clearImmediate = handle => {
    return this._clear(handle);
  };
  /**
   * 清空所有佇列項目（取消全部排程中的計時器），不影響虛擬時鐘。
   * Clear all queued items (cancel every scheduled timer) without affecting the fake clock.
   *
   * 共用 QueueTimer.clear() 作為單一實作來源。
   * Reuses QueueTimer.clear() as the single implementation source.
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  clearAll = () => {
    this.timer.clear();
    return this;
  };
  /**
   * 重置整個計時器：清空佇列並將虛擬時間還原回初始值（fake_init），同時重設識別碼計數器。
   * Reset the whole timer: clear the queue, restore the fake clock to its initial value
   * (fake_init), and reset the id counter.
   *
   * 共用 QueueTimer.clear() 與 TimeCore.reset() 作為單一實作來源。
   * Reuses QueueTimer.clear() and TimeCore.reset() as the single implementation sources.
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  reset = () => {
    this.timer.clear();
    this.timer.reset();
    this.cache.done = [];
    return this;
  };
  /**
   * 推進虛擬時間（同步，不執行任何回呼）
   * Advance fake time (synchronous; does not run any callbacks)
   *
   * 若 amount 為負數，改用佇列中最早的時間作為推進量（跳轉至最早到期項目）。
   * If amount is negative, jump to the earliest expiry by using the queue's minimum timing.
   *
   * 佇列為空時 cache.min 為 null，此時無最早時間可跳轉，改用 0（不推進）。
   * When the queue is empty, cache.min is null; fall back to 0 (no advance).
   *
   * @param amount - 推進的時間量，可為毫秒數或 Duration 物件 / Amount of time to advance
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  advance = amount => {
    if (this._activeRun) {
      throw new TypeError('advance() is forbidden while a run is in progress: time jumps during run are not allowed.');
    }
    if (amount < 0) {
      var _this$timer$cache$min;
      amount = (_this$timer$cache$min = this.timer.cache.min) !== null && _this$timer$cache$min !== void 0 ? _this$timer$cache$min : 0;
    }
    this.timer.update(amount);
    this.timer.sort();
    return this;
  };
  *_runCore() {
    const now = this.timer.now();
    this.cache.done = [];
    const pending = [...this.timer.queue];
    const seen = new WeakSet();
    for (const q of pending) {
      seen.add(q);
    }
    const insert = item => {
      let lo = 0;
      let hi = pending.length;
      while (lo < hi) {
        var _m$id, _item$id;
        const mid = lo + hi >> 1;
        const m = pending[mid];
        const d = m.timing.diff(item.timing);
        if (d < 0 || d === 0 && ((_m$id = m.id) !== null && _m$id !== void 0 ? _m$id : 0) < ((_item$id = item.id) !== null && _item$id !== void 0 ? _item$id : 0)) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      pending.splice(lo, 0, item);
    };
    const tryAdd = item => {
      if (seen.has(item)) {
        return;
      }
      seen.add(item);
      if (now.diff(item.timing) >= 0) {
        insert(item);
      }
    };
    this._activeRun = {
      now,
      pending,
      seen,
      tryAdd
    };
    try {
      while (pending.length > 0) {
        const current = pending[0];
        this._current = current;
        if (now.diff(current.timing) < 0) {
          break;
        }
        if (!this.timer.queue.includes(current)) {
          pending.shift();
          continue;
        }
        current.active = dayjs();
        yield current;
        if (this._abort) {
          break;
        }
        current.ending = dayjs();
        this.cache.done.push(current);
        pending.shift();
        if (!this.timer.queue.includes(current)) {
          continue;
        }
        if (current.type === EnumTimerType.setInterval && current.interval != null) {
          const oldTiming = current.timing;
          const nextTiming = oldTiming.add(current.interval);
          if (nextTiming.valueOf() > oldTiming.valueOf() && nextTiming.valueOf() <= now.valueOf()) {
            current.timing = nextTiming;
            insert(current);
            continue;
          }
          current.timing = nextTiming;
        } else {
          this.timer.remove(current);
        }
      }
    } finally {
      this._activeRun = null;
      this._gen = null;
      this._runStartNow = null;
      this._current = null;
      this._abort = false;
    }
    this.timer.sort();
  }
  /**
   * 同步執行所有到期的佇列項目
   * Synchronously execute all expired queue items
   *
   * 以同步方式呼叫每個回呼（若回呼回傳 Promise 則不等待其完成）。
   * Invokes each callback synchronously (does not wait for any returned Promise).
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  run = () => {
    if (this._activeRun) {
      return this;
    }
    if (this._runStartNow == null) {
      this._runStartNow = this.timer.now();
    }
    for (const _ of this._runGenerator()) {}
    return this;
  };
  /**
   * 非同步執行所有到期的佇列項目
   * Asynchronously execute all expired queue items
   *
   * 以 await 方式呼叫每個回呼，可正確等待 async 回呼完成。
   * Awaits each callback, correctly waiting for async callbacks to finish.
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  runAsync = async () => {
    if (this._activeRun) {
      return this;
    }
    if (this._runStartNow == null) {
      this._runStartNow = this.timer.now();
    }
    this._gen = this._runCore();
    for (const current of this._gen) {
      await current.callback(current, this.timer);
    }
    return this;
  };
  *_wrapRunGen() {
    for (const current of this._runCore()) {
      current.callback(current, this.timer);
      yield current;
    }
  }
  /**
   * 取得本輪 run 的生成器（內部 API，即使用者指定的快取邏輯）。
   * Obtain the generator for this run (internal API — the caching logic the user specified).
   *
   * 若已有活躍 run，回傳同一份快取生成器（重入 no-op）；
   * 否則只要 this._gen 尚未建立（或上一輪已結束被 finally 清空）就建立一次，
   * 因此即使尚未開始迭代就多次呼叫，也只會得到同一份內部狀態。
   * If a run is already active, return the same cached generator (re-entrant no-op);
   * otherwise create it only when this._gen is unset (or was cleared by the previous run's
   * finally), so repeated calls — even before any iteration — yield the SAME state.
   *
   * 快取的生成器為 _wrapRunGen()：會自動觸發回呼，保留原有 runGenerator 的 API 行為。
   * The cached generator is _wrapRunGen(), which fires callbacks automatically — preserving the
   * original runGenerator API behavior.
   *
   * @returns 執行項目的生成器（不回傳 this）/ generator of executed items (does NOT return this)
   */
  _runGenerator() {
    if (this._activeRun) {
      return this._gen;
    }
    if (this._gen == null) {
      this._gen = this._wrapRunGen();
    }
    return this._gen;
  }
  /**
   * 以生成器逐個執行到期項目（自動觸發回呼並 yield 已執行項目）。
   * Run expired items one-by-one as a generator (auto-fires callbacks and yields executed items).
   *
   * 保留原有 runGenerator 的 API 行為：回呼會被自動呼叫，並逐一 yield 已執行的佇列項目，
   * 方便呼叫者在項目之間插入觀察或處理邏輯。內部直接採用快取的 _runGenerator() 狀態，
   * 因此多次呼叫只會得到同一份內部狀態（不會重複產生 / 雙重處理）。
   * Preserves the original runGenerator API behavior: callbacks are fired automatically and each
   * executed item is yielded, handy for observing/handling between items. Internally uses the
   * cached _runGenerator() state, so repeated calls yield the SAME internal state (no duplicate
   * generation / double-processing).
   *
   * @returns 執行項目的生成器（不回傳 this）/ generator of executed items (does NOT return this)
   */
  runGenerator() {
    return this._runGenerator();
  }
  /**
   * 推進虛擬時間並同步執行到期的計時器
   * Advance fake time and synchronously run expired timers
   *
   * @param amount - 推進的時間量，可為毫秒數或 Duration 物件 / Amount of time to advance
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  start = amount => {
    if (this._activeRun) {
      return this;
    }
    this._runStartNow = this.timer.now();
    this.advance(amount);
    if (this.timer.hasExpires()) {
      this.run();
    }
    return this;
  };
  /**
   * 推進虛擬時間並非同步執行到期的計時器
   * Advance fake time and asynchronously run expired timers
   *
   * @param amount - 推進的時間量，可為毫秒數或 Duration 物件 / Amount of time to advance
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  startAsync = async amount => {
    if (this._activeRun) {
      return this;
    }
    this._runStartNow = this.timer.now();
    this.advance(amount);
    if (this.timer.hasExpires()) {
      await this.runAsync();
    }
    return this;
  };
  /**
   * 暫停目前進行中的 run（執行完當前項目後停止）。
   * Pause the in-progress run (stops after the current item finishes).
   *
   * 中斷後會將虛擬時間「修正」為佇列中下一個待執行項目的觸發時間，
   * 使剩餘計時器保持相對順序、日後可從中斷處續跑。
   * After interruption, the virtual time is "corrected" to the fire time of the next pending
   * item, so the remaining timers keep their relative order and can resume later from where
   * we left off.
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  pause = () => {
    if (!this._activeRun) {
      return this;
    }
    const cur = this._current;
    this.timer.sort();
    let next = null;
    for (const q of this.timer.queue) {
      if (q !== cur && (next == null || q.timing.diff(next) < 0)) {
        next = q.timing;
      }
    }
    this._abort = true;
    if (cur) {
      this.timer.remove(cur);
    }
    if (next) {
      this.timer.data.fake_now = next;
    }
    return this;
  };
  /**
   * 取消目前進行中的 run，並將虛擬時間「修正」回本次 run 開始前的值（撤銷時間跳躍）。
   * Cancel the in-progress run and "correct" the virtual time back to the value it had before
   * this run started (undoing the time jump).
   *
   * 佇列中的計時器保持不變（僅不再執行本輪剩餘項目）。
   * Timers in the queue are left unchanged (only the rest of this run is aborted).
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  cancel = () => {
    if (!this._activeRun) {
      return this;
    }
    const startNow = this._runStartNow;
    const cur = this._current;
    this._abort = true;
    if (cur) {
      this.timer.remove(cur);
    }
    if (startNow) {
      this.timer.data.fake_now = startNow;
    }
    return this;
  };
}
let _globalClockInstalled;
let globalFakeTimer;
function getUnsafeGlobalFakeTimer() {
  return globalFakeTimer !== null && globalFakeTimer !== void 0 ? globalFakeTimer : globalFakeTimer = new UnsafeGlobalFakeTimer();
}
let EnumGlobalClockState = /*#__PURE__*/function (EnumGlobalClockState) {
  EnumGlobalClockState["none"] = "none";
  EnumGlobalClockState["self"] = "self";
  EnumGlobalClockState["global"] = "global";
  return EnumGlobalClockState;
}({});
class UnsafeGlobalFakeTimer extends FakeTimer {
  _clockInstalled = false;
  _doUninstall = () => {
    if (this._originalDateNow) {
      // @ts-ignore
      Date.now = this._originalDateNow;
    }
    const perf = globalThis.performance;
    if (perf && this._originalPerfNow) {
      perf.now = this._originalPerfNow;
    }
    this._clockInstalled = false;
    _globalClockInstalled = undefined;
  };
  globalClockState() {
    if (this._clockInstalled) {
      return EnumGlobalClockState.self;
    }
    return _globalClockInstalled != null ? EnumGlobalClockState.global : EnumGlobalClockState.none;
  }
  /**
   * 將 Date.now / performance.now 替換為讀取虛擬時間，以便測試依賴真實時鐘的程式碼。
   * Replace Date.now / performance.now with the fake time, for testing code that reads the real clock.
   *
   * 警告：此為「全域副作用」，會影響整個處理程序。請務必配對呼叫 uninstallGlobalClock() 還原。
   * WARNING: this is a GLOBAL side-effect affecting the whole process. Always pair it with
   * uninstallGlobalClock() to restore.
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  installGlobalClock = () => {
    if (this._clockInstalled || _globalClockInstalled != null) {
      return this;
    }
    // @ts-ignore
    this._originalDateNow = Date.now;
    const perf = globalThis.performance;
    this._originalPerfNow = perf && typeof perf.now === 'function' ? perf.now.bind(perf) : undefined;
    // @ts-ignore
    Date.now = () => this.timer.now().valueOf();
    if (perf && this._originalPerfNow) {
      perf.now = () => this.timer.now().valueOf() - this.timer.data.fake_init.valueOf();
    }
    this._clockInstalled = true;
    _globalClockInstalled = () => this._doUninstall();
    return this;
  };
  /**
   * 還原 Date.now / performance.now 為原始實作。
   * Restore Date.now / performance.now to their original implementations.
   *
   * 若全域已註冊，則委託給真正安裝的實例執行還原；否則由本實例自行還原。
   * If a global registration exists, delegate the restore to the instance that actually
   * installed it; otherwise restore directly.
   *
   * @returns this（支援鏈式呼叫）/ this (supports chaining)
   */
  uninstallGlobalClock = () => {
    if (!this._clockInstalled && _globalClockInstalled == null) {
      return this;
    }
    if (_globalClockInstalled != null) {
      _globalClockInstalled();
      return this;
    }
    this._doUninstall();
    return this;
  };
}
const defaultFakeTimer = /*#__PURE__*/new FakeTimer();
var _ = defaultFakeTimer;
const setTimeout = defaultFakeTimer.setTimeout;
const setInterval = defaultFakeTimer.setInterval;
const setImmediate = defaultFakeTimer.setImmediate;
const clearTimeout = defaultFakeTimer.clearTimeout;
const clearInterval = defaultFakeTimer.clearInterval;
const clearImmediate = defaultFakeTimer.clearImmediate;
const advance = defaultFakeTimer.advance;
const run = defaultFakeTimer.run;
const runAsync = defaultFakeTimer.runAsync;
const start = defaultFakeTimer.start;
const startAsync = defaultFakeTimer.startAsync;
const clearAll = defaultFakeTimer.clearAll;
const reset = defaultFakeTimer.reset;
const requestAnimationFrame = defaultFakeTimer.requestAnimationFrame;
const cancelAnimationFrame = defaultFakeTimer.cancelAnimationFrame;
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
  Object.defineProperty(defaultFakeTimer, "toDuration", {
    value: toDuration
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
  Object.defineProperty(defaultFakeTimer, "clearTimeout", {
    value: clearTimeout
  });
  Object.defineProperty(defaultFakeTimer, "clearInterval", {
    value: clearInterval
  });
  Object.defineProperty(defaultFakeTimer, "clearImmediate", {
    value: clearImmediate
  });
  Object.defineProperty(defaultFakeTimer, "advance", {
    value: advance
  });
  Object.defineProperty(defaultFakeTimer, "run", {
    value: run
  });
  Object.defineProperty(defaultFakeTimer, "runAsync", {
    value: runAsync
  });
  Object.defineProperty(defaultFakeTimer, "start", {
    value: start
  });
  Object.defineProperty(defaultFakeTimer, "startAsync", {
    value: startAsync
  });
  Object.defineProperty(defaultFakeTimer, "clearAll", {
    value: clearAll
  });
  Object.defineProperty(defaultFakeTimer, "reset", {
    value: reset
  });
  Object.defineProperty(defaultFakeTimer, "requestAnimationFrame", {
    value: requestAnimationFrame
  });
  Object.defineProperty(defaultFakeTimer, "cancelAnimationFrame", {
    value: cancelAnimationFrame
  });
  Object.defineProperty(defaultFakeTimer, "UnsafeGlobalFakeTimer", {
    value: UnsafeGlobalFakeTimer
  });
  Object.defineProperty(defaultFakeTimer, "getUnsafeGlobalFakeTimer", {
    value: getUnsafeGlobalFakeTimer
  });
}

/**
 * CJS 模組入口點，將 ESM 預設匯出轉為 CommonJS 模組
 * CJS module entry point, converts ESM default export to CommonJS module
 */

// @ts-ignore
module.exports = _;
//# sourceMappingURL=index.cjs.development.cjs.map
