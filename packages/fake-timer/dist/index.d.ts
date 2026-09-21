import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

/**
 * 時間資料介面，儲存真實時間與虛擬時間的狀態
 * Time data interface, stores real time and fake time state
 */
export interface ITimeData {
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
declare class Time {
	/** 時間狀態資料 / Time state data */
	data: ITimeData;
	/**
	 * 建立 Time 實例
	 * Create a Time instance
	 *
	 * @param options - 時間配置選項，可為 ITimeData 物件或直接傳入日期值 / Time config options, can be ITimeData object or a date value directly
	 */
	constructor(options?: ITimeData);
	/**
	 * 子類初始化鉤子（dayjs 為 immutable，無需 clone）
	 * Subclass initialization hook (dayjs is immutable, no clone needed)
	 */
	_init(): void;
	/**
	 * 工廠方法，建立 Time 實例
	 * Factory method to create a Time instance
	 */
	static new(options?: ITimeData): Time;
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
}
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
	/** 允許額外任意屬性 / Allow any additional properties */
	[key: string]: any;
}
/**
 * 新增佇列項目時的輸入介面（timing 可接受 Duration）
 * Input interface for adding queue items (timing accepts Duration)
 */
export interface ITimeQueueItemAdd extends ITimeQueueItem {
	/** 可為 Dayjs 或 Duration（Duration 會在加入時轉換為絕對時間）/ Can be Dayjs or Duration (Duration is converted to absolute time when added) */
	timing?: dayjs.Dayjs | duration.Duration | any;
}
interface ITimeData$1 extends ITimeData {
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
declare class QueueTimer extends Time {
	/** 計時器佇列 / Timer queue */
	queue: ITimeQueueItem[];
	/** 快取佇列中的最小與最大時間 / Cache for min and max times in the queue */
	cache: any;
	/** 覆寫父類的 data 型別 / Override parent class data type */
	data: ITimeData$1;
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
	remove: (id: number | string | ITimeQueueItem) => null | ITimeQueueItem;
	/**
	 * 靜態工廠方法，建立 QueueTimer 實例
	 * Static factory method to create a QueueTimer instance
	 */
	static new(options?: ITimeData$1): QueueTimer;
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
}
/**
 * 計時器函式介面，支援數值或 Duration 延遲
 * Timer function interface, supporting number or Duration delay
 */
export interface ITimerFunc extends Function {
	(callback: ICallback, delay: number, ...params: any[]): Promise<ITimeQueueItem>;
	(callback: ICallback, delay: duration.Duration, ...params: any[]): Promise<ITimeQueueItem>;
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
	setImmediate(callback: ICallback, ...params: any[]): Promise<ITimeQueueItem>;
}
/**
 * 可控計時器類別，實作 ITimer 介面
 * Controllable timer class implementing the ITimer interface
 *
 * 封裝 QueueTimer 並提供與原生 setTimeout / setInterval / setImmediate 相同的 API。
 * 透過 start() 方法手動推進時間，觸發到期的回呼函式。
 * Wraps QueueTimer and provides an API identical to native setTimeout / setInterval / setImmediate.
 * Time is advanced manually via start(), triggering expired callbacks.
 */
export declare class Timer implements ITimer {
	/** 底層佇列計時器實例 / Underlying queue timer instance */
	timer: QueueTimer;
	/** 已完成的佇列項目快取 / Cache for completed queue items */
	cache: {
		done: ITimeQueueItem[];
	};
	/**
	 * 建立 Timer 實例
	 * Create a Timer instance
	 *
	 * @param options - 時間配置選項 / Time configuration options
	 */
	constructor(options?: ITimeData$1);
	/**
	 * 模擬 setTimeout：將回呼函式排入佇列，延遲指定時間後執行
	 * Simulate setTimeout: queue a callback to execute after a specified delay
	 *
	 * @param callback - 到期時執行的回呼函式 / Callback function to execute on expiry
	 * @param delay - 延遲時間，可為毫秒數或 Duration 物件 / Delay time, can be milliseconds or Duration object
	 * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
	 * @returns 新增的佇列項目 / The newly added queue item
	 */
	setTimeout: (callback: ICallback, delay: number | duration.Duration, ...params: any[]) => Promise<ITimeQueueItem>;
	/**
	 * 模擬 setInterval：將回呼函式排入佇列，以指定間隔重複執行
	 * Simulate setInterval: queue a callback to execute repeatedly at specified intervals
	 *
	 * @param callback - 每次間隔到期時執行的回呼函式 / Callback to execute each interval
	 * @param delay - 間隔時間，可為毫秒數或 Duration 物件 / Interval time, can be milliseconds or Duration object
	 * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
	 * @returns 新增的佇列項目 / The newly added queue item
	 */
	setInterval: (callback: ICallback, delay: number | duration.Duration, ...params: any[]) => Promise<ITimeQueueItem>;
	/**
	 * 模擬 setImmediate：將回呼函式排入佇列，於下次執行時立即觸發
	 * Simulate setImmediate: queue a callback to trigger immediately on next run
	 *
	 * @param callback - 要立即執行的回呼函式 / Callback to execute immediately
	 * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
	 * @returns 新增的佇列項目 / The newly added queue item
	 */
	setImmediate: (callback: ICallback, ...params: any[]) => Promise<ITimeQueueItem>;
	/**
	 * 推進虛擬時間並執行到期的計時器
	 * Advance fake time and execute expired timers
	 *
	 * @param amount - 推進的時間量，可為毫秒數或 Duration 物件 / Amount of time to advance, can be milliseconds or Duration object
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	start: (amount?: number | duration.Duration) => Promise<this>;
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
	run: () => Promise<this>;
}
/**
 * 預設的全域 Timer 實例
 * Default global Timer instance
 */
export declare const init: Timer;
/** 便捷匯出：直接使用全域 Timer 的 setTimeout / Convenience export: use global Timer's setTimeout */
declare const setTimeout$1: (callback: ICallback, delay: number | duration.Duration, ...params: any[]) => Promise<ITimeQueueItem>;
/** 便捷匯出：直接使用全域 Timer 的 setInterval / Convenience export: use global Timer's setInterval */
declare const setInterval$1: (callback: ICallback, delay: number | duration.Duration, ...params: any[]) => Promise<ITimeQueueItem>;
/** 便捷匯出：直接使用全域 Timer 的 setImmediate / Convenience export: use global Timer's setImmediate */
declare const setImmediate$1: (callback: ICallback, ...params: any[]) => Promise<ITimeQueueItem>;

export {
	init as default,
	setImmediate$1 as setImmediate,
	setInterval$1 as setInterval,
	setTimeout$1 as setTimeout,
};

export {};
