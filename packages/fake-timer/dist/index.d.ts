import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

/**
 * 時間資料介面，儲存真實時間與虛擬時間的狀態
 * Time data interface, stores real time and fake time state
 */
export interface ITimeDataCore {
	/** 自增識別碼 / Auto-increment identifier */
	id?: number;
	/** 真實世界初始時間（建立 Time 實例時的實際時間） / Real-world initial time (actual time when Time instance was created) */
	real_init?: dayjs.Dayjs;
	/** 虛擬時間初始值 / Fake time initial value */
	fake_init?: dayjs.Dayjs;
	/** 虛擬時間當前值（隨 update 推進） / Fake time current value (advanced via update) */
	fake_now?: dayjs.Dayjs;
	/** 上一次 update 前的虛擬時間（用於回溯或差值計算） / Fake time before last update (used for rollback or diff calculation) */
	fake_old?: dayjs.Dayjs;
}
/**
 * 時間基礎類別，提供可控的虛擬時間環境
 * Base time class providing a controllable fake time environment
 *
 * 此類別是整個 fake-timer 的核心，管理真實時間與虛擬時間的映射。
 * 透過 update() 方法可任意推進虛擬時間，用於測試或模擬計時器行為。
 * This class is the core of the fake-timer, managing the mapping between real time and fake time.
 * The virtual time can be advanced arbitrarily via update() for testing or simulating timer behavior.
 */
export declare class TimeCore {
	/** 時間狀態資料 / Time state data */
	data: ITimeDataCore;
	/**
	 * 建立 Time 實例
	 * Create a Time instance
	 *
	 * @param options - 時間配置選項，可為 ITimeData 物件或直接傳入日期值 / Time config options, can be ITimeData object or a date value directly
	 */
	constructor(options?: ITimeDataCore);
	/**
	 * 子類初始化鉤子（dayjs 為 immutable，無需 clone）
	 * Subclass initialization hook (dayjs is immutable, no clone needed)
	 */
	_init(): void;
	/**
	 * 工廠方法，建立 Time 實例
	 * Factory method to create a Time instance
	 */
	static new(options?: ITimeDataCore): TimeCore;
	/**
	 * 取得當前類別的建構函式（用於 static 方法中引用子類）
	 * Get the constructor of the current class (used in static methods to reference subclasses)
	 */
	get static(): any;
	/**
	 * 驗證傳入值是否為有效的日期表示
	 * Validate whether the passed value is a valid date representation
	 *
	 * 支援的型別：dayjs.Dayjs、Date、數字（時間戳）、可解析的日期字串
	 * Supported types: dayjs.Dayjs, Date, number (timestamp), parseable date string
	 */
	static isValidDate(who: any): boolean;
	/**
	 * 推進虛擬時間
	 * Advance the fake time
	 *
	 * 根據不同型別的參數推進 fake_now：
	 * Advances fake_now based on different parameter types:
	 * - Duration 物件 → 直接加算 / Duration object → add directly
	 * - 物件（Date 等）→ 直接設定為該時間 / Object (Date etc.) → set to that time
	 * - 數字 + unit → 加算指定單位 / Number + unit → add specified unit
	 * - 純數字 → 預設加算 100 毫秒 / Number alone → add 100ms by default
	 */
	update(amount?: any, unit?: dayjs.ManipulateType): this;
	/**
	 * 取得或遞增識別碼
	 * Get or increment the identifier
	 *
	 * @param bool - 若為 true 則僅回傳當前值不遞增，若為 false 或省略則回傳後遞增 / If true returns current value without increment, otherwise returns and increments
	 */
	id(bool?: boolean): number;
	/**
	 * 取得當前虛擬時間
	 * Get the current fake time
	 */
	now(): dayjs.Dayjs;
	/**
	 * 將虛擬時間重置回初始值（fake_init），並重設識別碼計數器
	 * Reset the fake time back to its initial value (fake_init) and reset the id counter
	 *
	 * 不影響 real_init（建立實例時捕捉的真實時間）。
	 * Does not affect real_init (the real time captured at instance creation).
	 *
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	reset(): this;
}
/** 虛擬時間或時間區間的聯合型別 / Union type for fake time or time duration */
export type IDayMoment = dayjs.Dayjs | duration.Duration;
/**
 * 計時器種類（鍵值相等，便於直接比較）
 * Timer kinds (keys equal values, convenient for direct comparison)
 *
 * - setTimeout            : 一次性延遲計時器 / one-shot deferred timer
 * - setInterval           : 週期性計時器 / repeating timer
 * - setImmediate          : 立即執行（延遲為 0）/ run immediately (delay 0)
 * - requestAnimationFrame : 每幀執行 / run each animation frame
 */
export declare const enum EnumTimerType {
	setTimeout = "setTimeout",
	setInterval = "setInterval",
	setImmediate = "setImmediate",
	requestAnimationFrame = "requestAnimationFrame"
}
/**
 * 計時器控制代號（單一真理來源）
 * Timer handle (single source of truth)
 *
 * 呼叫 clear* / remove 時，可用自增 id（number）、隨機名稱（string），
 * 或直接傳入佇列項目本身（ITimeQueueItem）來指認要操作的計時器。
 * When calling clear* / remove, identify the target timer by its auto-increment id
 * (number), random name (string), or the queue item itself (ITimeQueueItem).
 */
export type ITimerHandle = number | string | ITimeQueueItem;
/**
 * 延遲 / 時間間隔的輸入型別（單一真理來源）
 * Delay / interval input type (single source of truth)
 *
 * 可為數值毫秒（number）或 Duration。
 * Can be milliseconds (number) or a Duration.
 */
export type IDurationInput = number | duration.Duration;
/**
 * 移除計時器的結果（單一真理來源）
 * Result of removing a timer (single source of truth)
 *
 * 成功移除則回傳該項目，否則回傳 null。
 * Returns the removed item on success, otherwise null.
 */
export type IRemovedTimer = null | ITimeQueueItem;
/**
 * 佇列中的計時器項目介面
 * Timer queue item interface
 *
 * 每個項目代表一個已排入佇列的計時器，包含執行時間、回呼函式等資訊
 * Each item represents a queued timer, containing execution time, callback, etc.
 */
export interface ITimeQueueItem {
	/** 自增識別碼 / Auto-increment identifier */
	id?: number;
	/** 預計觸發時間 / Scheduled trigger time */
	timing?: dayjs.Dayjs;
	/** 實際開始執行時間 / Actual start execution time */
	active?: dayjs.Dayjs;
	/** 執行結束時間 / Execution end time */
	ending?: dayjs.Dayjs;
	/** 隨機唯一識別碼（nanoid）/ Random unique identifier (nanoid) */
	name?: string;
	/** 到期時呼叫的回呼函式 / Callback function to invoke on expiry */
	callback?: ICallback;
	/** 傳遞給回呼函式的額外參數 / Additional parameters passed to the callback */
	params?: any[];
	/** 計時器種類 / Timer kind */
	type?: EnumTimerType;
	/** 允許額外任意屬性 / Allow any additional properties */
	[key: string]: any;
}
/**
 * 新增佇列項目時的輸入介面（timing 可接受 Duration）
 * Input interface for adding queue items (timing accepts Duration)
 */
export interface ITimeQueueItemAdd extends ITimeQueueItem {
	/** 可為 Dayjs 或 Duration（Duration 會在加入時轉換為絕對時間）/ Can be Dayjs or Duration (Duration is converted to absolute time when added) */
	timing?: IDayMoment | number | any;
}
/**
 * 時間資料擴展介面，加入排序回呼
 * Extended time data interface, adding sort callback
 */
export interface ITimeData extends ITimeDataCore {
	/** 自訂排序函式 / Custom sort function */
	sort?: ISortCallback;
}
/**
 * 排序回呼函式介面
 * Sort callback function interface
 */
export interface ISortCallback extends Function {
	(a: ITimeQueueItem, b: ITimeQueueItem): any;
}
/**
 * 計時器回呼函式介面
 * Timer callback function interface
 *
 * @param current - 當前執行的佇列項目 / The currently executing queue item
 * @param timer - 所屬的 QueueTimer 實例 / The owning QueueTimer instance
 */
export interface ICallback extends Function {
	(current: ITimeQueueItem, timer: QueueTimer, self?: any): any;
}
/**
 * 佇列式計時器，繼承 Time 類別
 * Queue-based timer, extends the Time class
 *
 * 管理一個按時間排序的佇列，支援新增、移除、排序、到期檢查等操作。
 * 所有計時器項目都存放在 queue 陣列中，並透過 cache 追蹤最小與最大時間以提升效能。
 * Manages a time-sorted queue, supporting add, remove, sort, and expiry check operations.
 * All timer items are stored in the queue array, with min/max times tracked via cache for performance.
 */
export declare class QueueTimer extends TimeCore {
	/** 計時器佇列 / Timer queue */
	queue: ITimeQueueItem[];
	/** 快取佇列中的最小與最大時間 / Cache for min and max times in the queue */
	cache: any;
	/** 覆寫父類的 data 型別 / Override parent class data type */
	data: ITimeData;
	constructor();
	/**
	 * 佇列中项目的數量 / Number of items in the queue
	 */
	get length(): number;
	/**
	 * 新增計時器項目到佇列
	 * Add a timer item to the queue
	 *
	 * 處理流程：
	 * 1. 若未指定 timing，使用當前虛擬時間
	 * 2. 若 timing 為 Duration，轉換為絕對時間（now + duration）
	 * 3. 產生唯一 id 與 name，推入佇列
	 * Processing flow:
	 * 1. If timing not specified, use current fake time
	 * 2. If timing is Duration, convert to absolute time (now + duration)
	 * 3. Generate unique id and name, push to queue
	 */
	add: (q: ITimeQueueItemAdd) => ITimeQueueItem;
	/**
	 * 重新整理快取的最小與最大時間
	 * Refresh cached min and max times
	 *
	 * 佇列為空時 min/max 設為 null，否則取首尾元素的 timing
	 * When queue is empty, min/max set to null; otherwise take first and last element's timing
	 */
	_cache_refresh: () => void;
	/**
	 * 增量更新快取的時間邊界
	 * Incrementally update time boundaries in cache
	 *
	 * @param timing - 要比較的時間值 / Time value to compare
	 * @param reset - 若為 true，先清空快取再重新計算 / If true, clear cache and recalculate
	 */
	_cache_timing: (timing: any, reset?: boolean) => void;
	/**
	 * 排序佇列並重新建立快取
	 * Sort the queue and rebuild the cache
	 *
	 * @param cb - 自訂排序函式，若未提供則使用 data.sort 或預設排序
	 *             Custom sort function; if not provided, uses data.sort or default sort
	 */
	sort: (cb?: ISortCallback) => this;
	/**
	 * 依索引取得佇列項目
	 * Get queue item by index
	 *
	 * @param idx - 索引值，-1 表示最後一個項目 / Index, -1 means the last item
	 */
	eq: (idx: number) => ITimeQueueItem;
	/**
	 * 依索引移除佇列項目（內部方法）
	 * Remove queue item by index (internal method)
	 *
	 * @returns 被移除的項目，若移除失敗則回傳 null / Removed item, or null if removal failed
	 */
	protected _remove: (idx: any) => ITimeQueueItem | null;
	/**
	 * 移除佇列中的計時器項目
	 * Remove a timer item from the queue
	 *
	 * 支援多種識別方式：
	 * - 數字索引（直接當作陣列索引）
	 * - 佇列項目物件（取其 name 屬性比對）
	 * - 名稱字串（nanoid 產生的唯一碼）
	 * Supports multiple identification methods:
	 * - Number index (used directly as array index)
	 * - Queue item object (uses its name property for matching)
	 * - Name string (nanoid-generated unique code)
	 */
	remove: (id: ITimerHandle) => IRemovedTimer;
	/**
	 * 靜態工廠方法，建立 QueueTimer 實例
	 * Static factory method to create a QueueTimer instance
	 */
	static new(options?: ITimeData): QueueTimer;
	/**
	 * 檢查佇列中是否有已到期的項目
	 * Check if there are expired items in the queue
	 *
	 * 判斷邏輯：比較當前虛擬時間與佇列中最早的時間（cache.min）
	 * 若差值 >= 0 則表示至少有一個項目已到期
	 * Logic: compare current fake time with the earliest time in queue (cache.min)
	 * If diff >= 0, at least one item has expired
	 */
	hasExpires: () => boolean;
	/**
	 * 清空整個佇列（移除所有計時器項目）
	 * Clear the entire queue (removes all timer items)
	 *
	 * 不影響虛擬時間（時鐘保持不變）。
	 * Does not affect fake time (the clock stays unchanged).
	 *
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	clear(): this;
}
/**
 * 計時器函式介面，支援數值或 Duration 延遲
 * Timer function interface, supporting number or Duration delay
 */
export interface ITimerFunc extends Function {
	(callback: ICallback, delay: number, ...params: any[]): ITimeQueueItem;
	(callback: ICallback, delay: duration.Duration, ...params: any[]): ITimeQueueItem;
}
/**
 * 計時器介面，提供標準的 setTimeout / setInterval / setImmediate API
 * Timer interface, providing standard setTimeout / setInterval / setImmediate API
 */
export interface ITimer {
	/** 模擬原生 setTimeout / Simulate native setTimeout */
	setTimeout: ITimerFunc;
	/** 模擬原生 setInterval / Simulate native setInterval */
	setInterval: ITimerFunc;
	/** 模擬原生 setImmediate / Simulate native setImmediate */
	setImmediate(callback: ICallback, ...params: any[]): ITimeQueueItem;
	/** 模擬原生 clearTimeout / Simulate native clearTimeout */
	clearTimeout(handle?: ITimerHandle): IRemovedTimer;
	/** 模擬原生 clearInterval / Simulate native clearInterval */
	clearInterval(handle?: ITimerHandle): IRemovedTimer;
	/** 模擬原生 clearImmediate / Simulate native clearImmediate */
	clearImmediate(handle?: ITimerHandle): IRemovedTimer;
	/** 推進虛擬時間（同步，不執行回呼）/ Advance fake time (synchronous, does not run callbacks) */
	advance(amount?: IDurationInput): this;
	/** 同步執行所有到期項目（不等待回呼）/ Synchronously run expired items (does not await callbacks) */
	run(): this;
	/** 非同步執行所有到期項目（等待每個回呼）/ Asynchronously run expired items (awaits each callback) */
	runAsync(): Promise<this>;
	/** 以生成器逐個執行到期項目並回傳生成器（不回傳 this）/ Run expired items one-by-one as a generator (does NOT return this) */
	runGenerator(): Generator<ITimeQueueItem, void, void>;
	/** 推進虛擬時間並同步執行到期項目 / Advance fake time and synchronously run expired items */
	start(amount?: IDurationInput): this;
	/** 推進虛擬時間並非同步執行到期項目 / Advance fake time and asynchronously run expired items */
	startAsync(amount?: IDurationInput): Promise<this>;
	/** 暫停進行中的 run，並將虛擬時間修正為下一個待執行項目的觸發時間 / Pause the in-progress run and correct virtual time to the next pending item's timing */
	pause(): this;
	/** 取消進行中的 run，並將虛擬時間修正回本次 run 開始前的值 / Cancel the in-progress run and correct virtual time back to the pre-run value */
	cancel(): this;
	/** 清空所有佇列項目（不影響時鐘）/ Clear all queued items (does not affect the clock) */
	clearAll(): this;
	/** 清空佇列並將虛擬時間重置回初始值 / Clear the queue and reset the fake clock to its initial value */
	reset(): this;
	/** 模擬 requestAnimationFrame：於下一個「影格」觸發回呼 / Simulate requestAnimationFrame: fire on the next frame */
	requestAnimationFrame(callback: ICallback, ...params: any[]): ITimeQueueItem;
	/** 模擬 cancelAnimationFrame：取消尚未觸發的 rAF 項目 / Simulate cancelAnimationFrame: cancel a pending rAF item */
	cancelAnimationFrame(handle?: ITimerHandle): IRemovedTimer;
}
/**
 * 將數值或 Duration 轉換為 Duration 型別
 * Converts a number or Duration to a Duration type
 *
 * 若輸入已是 Duration，則直接回傳；否則以數值建立 Duration（單位為毫秒）
 * If input is already a Duration, return it directly; otherwise create a Duration from the number (in milliseconds)
 */
export declare function toDuration(value: IDurationInput): duration.Duration;
/**
 * 可控計時器類別，實作 ITimer 介面
 * Controllable timer class implementing the ITimer interface
 *
 * 封裝 QueueTimer 並提供與原生 setTimeout / setInterval / setImmediate 相同的 API。
 * 透過 start() 方法手動推進時間，觸發到期的回呼函式。
 * Wraps QueueTimer and provides an API identical to native setTimeout / setInterval / setImmediate.
 * Time is advanced manually via start(), triggering expired callbacks.
 */
export declare class FakeTimer implements ITimer {
	/** 底層佇列計時器實例 / Underlying queue timer instance */
	timer: QueueTimer;
	/** 已完成的佇列項目快取 / Cache for completed queue items */
	cache: {
		done: ITimeQueueItem[];
	};
	/**
	 * 每個影格（frame）的間隔，供 requestAnimationFrame 使用
	 * Per-frame interval used by requestAnimationFrame
	 *
	 * 預設為 1000/60 毫秒（約 60fps）。可直接覆寫以模擬不同刷新率。
	 * Defaults to 1000/60 ms (~60fps). Override directly to simulate other refresh rates.
	 */
	frameInterval: duration.Duration;
	/**
	 * 內部 run 狀態（pending 即為內部 API）。
	 * Internal run state (pending is the internal API).
	 *
	 * 同時作為三道防線 / Doubles as three guards at once:
	 *   1. 並發防護：run / runAsync / runGenerator 執行期間不得重入（防止雙重處理）。
	 *      1. Re-entrancy: run / runAsync / runGenerator must not re-enter while active
	 *         (prevents double-processing).
	 *   2. 時間跳躍防護：執行期間禁止 advance() 推進虛擬時間。
	 *      2. Time-jump guard: advance() is forbidden while a run is in progress.
	 *   3. 追加計時器入口：回呼內 setTimeout/setInterval 追加的項目經由 tryAdd 併入本輪 run。
	 *      3. Append entry: timers appended in callbacks reach the run via tryAdd.
	 */
	protected _activeRun: {
		/** 本輪 run 鎖定的虛擬時間（執行期間不可變動）/ Virtual time locked for this run (immutable during run) */
		now: dayjs.Dayjs;
		/** 內部待執行佇列 / internal pending queue */
		pending: ITimeQueueItem[];
		/** 已納入 pending 的項目集合（O(1) 查詢，使用 WeakSet 避免持有已移除項目的參考）/ set of items already in pending (O(1) lookup; WeakSet avoids retaining removed items) */
		seen: WeakSet<ITimeQueueItem>;
		/** 將回呼內追加的項目併入 pending（若已到期）/ merge a callback-appended item into pending (if due) */
		tryAdd(item: ITimeQueueItem): void;
	} | null;
	/** 目前活躍 run 的快取生成器：run / runAsync / runGenerator 共用同一份狀態。
	 * Cached generator of the active run: run / runAsync / runGenerator share one state. */
	protected _gen: Generator<ITimeQueueItem, void, void> | null;
	/** 本次 run 開始前的虛擬時間（供 cancel / pause 修正時間使用）。
	 * Virtual time before this run started (used by cancel / pause to correct time). */
	protected _runStartNow: dayjs.Dayjs | null;
	/** 目前正被執行的佇列項目（供 pause / cancel 中斷時移除已觸發的項目）。
	 * The queue item currently being executed (used by pause / cancel to remove the already-fired item). */
	protected _current: ITimeQueueItem | null;
	/** 中斷旗標：pause / cancel 在回呼內設定，_runCore 於每次 yield 後檢查並結束本輪 run。
	 * 使用旗標而非 generator.return()，是因為回呼可能在自動觸發回呼的生成器內執行，
	 * 此時直接 return() 會拋出「Generator is already running」。
	 * Abort flag: set by pause / cancel inside a callback; _runCore checks it after each yield to
	 * end the run. A flag (not generator.return()) is used because the callback may run INSIDE a
	 * generator that auto-invokes callbacks, where return() would throw "Generator is already running". */
	protected _abort: boolean;
	/**
	 * 建立 Timer 實例
	 * Create a Timer instance
	 *
	 * @param options - 時間配置選項 / Time configuration options
	 */
	constructor(options?: ITimeData);
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
	protected _schedule(type: EnumTimerType, callback: ICallback, delay: IDurationInput, params: any[]): ITimeQueueItem;
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
	setTimeout: (callback: ICallback, delay: IDurationInput, ...params: any[]) => ITimeQueueItem;
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
	setInterval: (callback: ICallback, delay: IDurationInput, ...params: any[]) => ITimeQueueItem;
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
	setImmediate: (callback: ICallback, ...params: any[]) => ITimeQueueItem;
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
	requestAnimationFrame: (callback: ICallback, ...params: any[]) => ITimeQueueItem;
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
	cancelAnimationFrame: (handle?: ITimerHandle) => IRemovedTimer;
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
	protected _clear(handle?: ITimerHandle): IRemovedTimer;
	/**
	 * 模擬 clearTimeout：取消尚未執行的 setTimeout 項目
	 * Simulate clearTimeout: cancel a pending setTimeout item
	 *
	 * @param handle - 要取消的項目，可為佇列項目、唯一名稱或索引 / Item to cancel (queue item, name, or index)
	 * @returns 被移除的項目，若未找到則回傳 null / The removed item, or null if not found
	 */
	clearTimeout: (handle?: ITimerHandle) => IRemovedTimer;
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
	clearInterval: (handle?: ITimerHandle) => IRemovedTimer;
	/**
	 * 模擬 clearImmediate：取消尚未執行的 setImmediate 項目
	 * Simulate clearImmediate: cancel a pending setImmediate item
	 *
	 * @param handle - 要取消的項目，可為佇列項目、唯一名稱或索引 / Item to cancel (queue item, name, or index)
	 * @returns 被移除的項目，若未找到則回傳 null / The removed item, or null if not found
	 */
	clearImmediate: (handle?: ITimerHandle) => IRemovedTimer;
	/**
	 * 清空所有佇列項目（取消全部排程中的計時器），不影響虛擬時鐘。
	 * Clear all queued items (cancel every scheduled timer) without affecting the fake clock.
	 *
	 * 共用 QueueTimer.clear() 作為單一實作來源。
	 * Reuses QueueTimer.clear() as the single implementation source.
	 *
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	clearAll: () => this;
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
	reset: () => this;
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
	advance: (amount?: IDurationInput) => this;
	/**
	 * 執行到期項目的核心迴圈（同步生成器，不負責呼叫回呼本身）
	 * Core loop for running expired items (synchronous generator; does not invoke callbacks)
	 *
	 * 此為 run()（同步）與 runAsync()（非同步）的單一實作來源（single source of truth）。
	 * 迴圈本身為同步邏輯，僅「是否 await 回呼」由驅動器決定：
	 * This is the single implementation source for run() (sync) and runAsync() (async).
	 * The loop logic itself is synchronous; only "whether to await the callback" is decided
	 * by the driver:
	 *   - run()       以同步方式呼叫回呼（不等待其完成）/ calls callbacks synchronously (no await)
	 *   - runAsync()  以 await 方式呼叫回呼（支援 async 回呼）/ awaits each callback (supports async)
	 *
	 * 使用手動索引遍歷，避免 for...in 搭配 splice 時因陣列位移而跳過項目。
	 * Uses a manual index loop to avoid for...in + splice skipping items on array shift.
	 */
	protected _runCore(): Generator<ITimeQueueItem, void, void>;
	/**
	 * 同步執行所有到期的佇列項目
	 * Synchronously execute all expired queue items
	 *
	 * 以同步方式呼叫每個回呼（若回呼回傳 Promise 則不等待其完成）。
	 * Invokes each callback synchronously (does not wait for any returned Promise).
	 *
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	run: () => this;
	/**
	 * 非同步執行所有到期的佇列項目
	 * Asynchronously execute all expired queue items
	 *
	 * 以 await 方式呼叫每個回呼，可正確等待 async 回呼完成。
	 * Awaits each callback, correctly waiting for async callbacks to finish.
	 *
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	runAsync: () => Promise<this>;
	/**
	 * 包裝 _runCore() 的內部生成器：逐一執行到期項目時自動觸發回呼並 yield 已執行項目。
	 * Internal generator wrapping _runCore(): fires each callback automatically and yields the
	 * executed item — this is the original runGenerator behavior.
	 */
	protected _wrapRunGen(): Generator<ITimeQueueItem, void, void>;
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
	protected _runGenerator(): Generator<ITimeQueueItem, void, void>;
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
	runGenerator(): Generator<ITimeQueueItem, void, void>;
	/**
	 * 推進虛擬時間並同步執行到期的計時器
	 * Advance fake time and synchronously run expired timers
	 *
	 * @param amount - 推進的時間量，可為毫秒數或 Duration 物件 / Amount of time to advance
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	start: (amount?: IDurationInput) => this;
	/**
	 * 推進虛擬時間並非同步執行到期的計時器
	 * Advance fake time and asynchronously run expired timers
	 *
	 * @param amount - 推進的時間量，可為毫秒數或 Duration 物件 / Amount of time to advance
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	startAsync: (amount?: IDurationInput) => Promise<this>;
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
	pause: () => this;
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
	cancel: () => this;
}
export declare function getUnsafeGlobalFakeTimer(): UnsafeGlobalFakeTimer;
/**
 * 會掛載「全域時鐘」的 FakeTimer 變體（不安全）
 * A FakeTimer variant that also patches the GLOBAL clock (UNSAFE)
 *
 * 此子類別集中收納具「全域副作用」的實作（installGlobalClock / uninstallGlobalClock），
 * 它們會直接替換處理程序內的 Date.now / performance.now。核心 FakeTimer 因此保持純粹、
 * 不污染源端全域狀態；只有在明確需要驅動依賴真實時鐘的程式碼時，才改用此類別。
 * This subclass isolates the global-side-effect implementations (installGlobalClock /
 * uninstallGlobalClock), which replace the process-wide Date.now / performance.now.
 * The core FakeTimer thus stays pure and never pollutes global state; reach for this
 * subclass only when you specifically need to drive code that reads the real clock.
 */
/**
 * 全域時鐘安裝狀態（鍵值相等，便於直接比較）
 * Global-clock installation state (keys equal their values, convenient for direct comparison)
 *
 * - none   : 未安裝 / not installed
 * - self   : 由本實例安裝 / installed by this instance
 * - global : 已由某實例安裝（可能是其它實例）/ installed globally (possibly by another instance)
 *
 * 註：因 this 為保留字，無法作為列舉成員識別碼，故以 self 表示「本實例」。
 * Note: 'this' is a reserved word and cannot be an enum member identifier, so 'self' is used
 * to mean "this instance".
 */
export declare const enum EnumGlobalClockState {
	none = "none",
	self = "self",
	global = "global"
}
export declare class UnsafeGlobalFakeTimer extends FakeTimer {
	/** 全域時鐘是否由「本實例」安裝 / Whether the global clock was installed by THIS instance */
	protected _clockInstalled: boolean;
	/** 原始 Date.now 實作（用於還原）/ Original Date.now implementation (for restore) */
	protected _originalDateNow?: () => number;
	/** 原始 performance.now 實作（用於還原）/ Original performance.now implementation (for restore) */
	protected _originalPerfNow?: () => number;
	/**
	 * 實際執行還原（不重入、不委派），供 installGlobalClock 註冊的全域反安裝函式呼叫。
	 * Performs the actual restore (non-reentrant, non-delegating); invoked by the global
	 * uninstall closure registered during installGlobalClock.
	 */
	protected _doUninstall: () => void;
	/**
	 * 查詢全域時鐘的安裝狀態，區分是由本實例或全域（可能是其它實例）安裝。
	 * Inspect the global-clock installation state, distinguishing whether it was installed
	 * by THIS instance or globally (possibly by another instance).
	 *
	 * - 'none'   : 未安裝 / not installed
	 * - 'this'   : 由本實例安裝 / installed by this instance
	 * - 'global' : 已由某實例安裝（可能是其它實例）/ installed globally (possibly by another instance)
	 */
	globalClockState(): EnumGlobalClockState;
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
	installGlobalClock: () => this;
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
	uninstallGlobalClock: () => this;
}
/**
 * 預設的全域 Timer 實例
 * Default global Timer instance
 */
export declare const defaultFakeTimer: FakeTimer;
/** 便捷匯出：直接使用全域 Timer 的 setTimeout / Convenience export: use global Timer's setTimeout */
declare const setTimeout$1: (callback: ICallback, delay: IDurationInput, ...params: any[]) => ITimeQueueItem;
/** 便捷匯出：直接使用全域 Timer 的 setInterval / Convenience export: use global Timer's setInterval */
declare const setInterval$1: (callback: ICallback, delay: IDurationInput, ...params: any[]) => ITimeQueueItem;
/** 便捷匯出：直接使用全域 Timer 的 setImmediate / Convenience export: use global Timer's setImmediate */
declare const setImmediate$1: (callback: ICallback, ...params: any[]) => ITimeQueueItem;
/** 便捷匯出：直接使用全域 Timer 的 clearTimeout / Convenience export: use global Timer's clearTimeout */
declare const clearTimeout$1: (handle?: ITimerHandle) => IRemovedTimer;
/** 便捷匯出：直接使用全域 Timer 的 clearInterval / Convenience export: use global Timer's clearInterval */
declare const clearInterval$1: (handle?: ITimerHandle) => IRemovedTimer;
/** 便捷匯出：直接使用全域 Timer 的 clearImmediate / Convenience export: use global Timer's clearImmediate */
declare const clearImmediate$1: (handle?: ITimerHandle) => IRemovedTimer;
/** 便捷匯出：直接使用全域 Timer 的 advance / Convenience export: use global Timer's advance */
export declare const advance: (amount?: IDurationInput) => FakeTimer;
/** 便捷匯出：直接使用全域 Timer 的 run（同步）/ Convenience export: use global Timer's run (sync) */
export declare const run: () => FakeTimer;
/** 便捷匯出：直接使用全域 Timer 的 runAsync（非同步）/ Convenience export: use global Timer's runAsync (async) */
export declare const runAsync: () => Promise<FakeTimer>;
/** 便捷匯出：直接使用全域 Timer 的 start（同步）/ Convenience export: use global Timer's start (sync) */
export declare const start: (amount?: IDurationInput) => FakeTimer;
/** 便捷匯出：直接使用全域 Timer 的 startAsync（非同步）/ Convenience export: use global Timer's startAsync (async) */
export declare const startAsync: (amount?: IDurationInput) => Promise<FakeTimer>;
/** 便捷匯出：直接使用全域 Timer 的 clearAll / Convenience export: use global Timer's clearAll */
export declare const clearAll: () => FakeTimer;
/** 便捷匯出：直接使用全域 Timer 的 reset / Convenience export: use global Timer's reset */
export declare const reset: () => FakeTimer;
/** 便捷匯出：直接使用全域 Timer 的 requestAnimationFrame / Convenience export: use global Timer's requestAnimationFrame */
declare const requestAnimationFrame$1: (callback: ICallback, ...params: any[]) => ITimeQueueItem;
/** 便捷匯出：直接使用全域 Timer 的 cancelAnimationFrame / Convenience export: use global Timer's cancelAnimationFrame */
declare const cancelAnimationFrame$1: (handle?: ITimerHandle) => IRemovedTimer;

export {
	cancelAnimationFrame$1 as cancelAnimationFrame,
	clearImmediate$1 as clearImmediate,
	clearInterval$1 as clearInterval,
	clearTimeout$1 as clearTimeout,
	defaultFakeTimer as default,
	requestAnimationFrame$1 as requestAnimationFrame,
	setImmediate$1 as setImmediate,
	setInterval$1 as setInterval,
	setTimeout$1 as setTimeout,
};

export {};
