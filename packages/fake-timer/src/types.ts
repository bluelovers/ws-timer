import type { Dayjs } from 'dayjs';
import { dayjs, duration } from './dayjs';
import type { Duration } from 'dayjs/plugin/duration';
import type { EnumTimerType } from './util';
import type { FakeTimer } from './index';

/**
 * 時間資料介面，儲存真實時間與虛擬時間的狀態
 * Time data interface, stores real time and virtual time state
 */
export interface ITimeDataCore
{
	/** 自增識別碼 / Auto-increment identifier */
	id?: number;

	/** 真實世界初始時間（建立 Time 實例時的實際時間） / Real-world initial time (actual time when Time instance was created) */
	real_init?: Dayjs;

	/** 虛擬時間初始值 / Virtual time initial value */
	virtual_init?: Dayjs;

	/** 虛擬時間當前值（隨 update 推進） / Virtual time current value (advanced via update) */
	virtual_now?: Dayjs;

	/** 上一次 update 前的虛擬時間（用於回溯或差值計算） / Virtual time before last update (used for rollback or diff calculation) */
	virtual_old?: Dayjs;
}

/** 虛擬時間或時間區間的聯合型別 / Union type for virtual time or time duration */
export type IDayMoment = Dayjs | Duration;
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
export type IDurationInput = number | Duration;
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
export interface ITimeQueueItem
{
	/** 自增識別碼（number）；可作為 clear* / remove 的 ITimerHandle / Auto-increment id (number); usable as an ITimerHandle for clear* / remove */
	id?: number;

	/** 預計觸發時間（絕對虛擬時間）；觸發時等於 now() / Scheduled trigger time (absolute virtual time); equals now() at fire */
	virtualTiming?: Dayjs;

	/** 註冊時間（排程當下的虛擬時間）；`now().diff(virtualAdded)` 即原始 delay / Registration time (virtual time when scheduled); `now().diff(virtualAdded)` gives the original delay */
	virtualAdded?: Dayjs;

	/** 已觸發次數（每次執行回呼 +1；一次性 timer 固定為 1）；週期性 setInterval 可讀它判斷第幾次 / Fire count (incremented per callback; 1 for one-shot); setInterval reads it for the Nth fire */
	count?: number;

	/** 實際「開始」執行的時間；注意是**真實牆鐘**（dayjs()），非虛擬時間 / Actual execution START time — note: REAL wall-clock (dayjs()), not virtual time */
	realActive?: Dayjs;

	/** 執行「結束」時間（回呼返回後才寫入）；同為**真實牆鐘**；`realEnding.diff(realActive)` 即回呼真實耗時 / Execution END time (written after the callback returns); also REAL wall-clock; `realEnding.diff(realActive)` is the real callback duration */
	realEnding?: Dayjs;

	/** 隨機唯一識別碼（nanoid 字串）；可作為 clear* / remove 的 ITimerHandle / Random unique id (nanoid string); usable as an ITimerHandle */
	name?: string;

	/** 到期時呼叫的回呼函式 / Callback function to invoke on expiry */
	callback?: ICallback;

	/** 傳遞給回呼的額外引數（即 `setTimeout(func, delay, ...params)` 的 ...params）/ Extra args forwarded to the callback (the ...params of setTimeout(func, delay, ...params)) */
	params?: any[],

	/** 計時器種類 / Timer kind */
	type?: EnumTimerType,

	/** 週期（僅 setInterval 有意義，為 dayjs.Duration）；其它種類為 undefined / Period (only meaningful for setInterval, a dayjs.Duration); undefined for others */
	interval?: Duration,

	/** 加入佇列時的陣列索引（排序後可能變動，僅供參考）/ Array index at insertion (may shift after sorting; informational only) */
	index?: number,

	/** 允許額外任意屬性 / Allow any additional properties */
	[key: string]: any;
}

/**
 * 新增佇列項目時的輸入介面（timing 可接受 Duration）
 * Input interface for adding queue items (timing accepts Duration)
 */
export interface ITimeQueueItemAdd extends ITimeQueueItem
{
	/** 可為 Dayjs 或 Duration（Duration 會在加入時轉換為絕對時間）/ Can be Dayjs or Duration (Duration is converted to absolute time when added) */
	virtualTiming?: IDayMoment | number | any;
}

/**
 * 時間資料擴展介面，加入排序回呼
 * Extended time data interface, adding sort callback
 */
export interface ITimeData extends ITimeDataCore
{
	/** 自訂排序函式 / Custom sort function */
	sort?: ISortCallback;
}

/**
 * 排序回呼函式介面
 * Sort callback function interface
 */
export interface ISortCallback extends Function
{
	(a: ITimeQueueItem, b: ITimeQueueItem);
}

/**
 * setTimeout 型別介面
 * setTimeout type interface
 */
export interface ISetTimeout extends Function
{
	(callback: ICallback, delay: number, immediate: boolean);

	(callback: ICallback, delay: Duration, immediate: boolean);
}

/**
 * 計時器回呼函式介面
 * Timer callback function interface
 *
 * @param current - 當前執行的佇列項目（同時是回呼內的 `this`）/ The currently executing queue item (also `this` inside the callback)
 * @param self - 所屬的 FakeTimer 實例 / The owning FakeTimer instance
 */
export interface ICallback extends Function
{
	/**
	 * 回呼簽章：第 2 個參數 `self` 即所屬的 FakeTimer 實例。
	 * Callback signature: the 2nd parameter `self` is the owning FakeTimer instance.
	 *
	 * 想拿佇列或虛擬時鐘請走 `self.timer`，不要依賴回呼內的 `this`
	 * （`this` 永遠是 `current` 佇列項目本身）。
	 * To reach the queue or the virtual clock, use `self.timer`; do not rely on `this`
	 * inside the callback (`this` is always the `current` queue item).
	 *
	 * `...params` 是呼叫 `setTimeout(func, delay, ...params)` 時傳入的額外引數，
	 * 觸發時會原樣轉交給回呼（對齊 Web/API/Window.setTimeout 用法）。
	 * `...params` are the extra arguments passed to `setTimeout(func, delay, ...params)`,
	 * forwarded verbatim to the callback when it fires (aligns with Web/API/Window.setTimeout).
	 */
	(current: ITimeQueueItem, self: FakeTimer, ...params: any[]): void;
}

/**
 * 計時器函式介面，支援數值或 Duration 延遲
 * Timer function interface, supporting number or Duration delay
 */
export interface ITimerFunc extends Function
{
	(callback: ICallback, delay?: number, ...params: any[]): ITimeQueueItem;

	(callback: ICallback, delay?: duration.Duration, ...params: any[]): ITimeQueueItem;
}

/**
 * 計時器介面，提供標準的 setTimeout / setInterval / setImmediate API
 * Timer interface, providing standard setTimeout / setInterval / setImmediate API
 */
export interface ITimer
{
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

	/** 取得虛擬時鐘的初始時間（t=0 基準），不必操作底層 `timer.data` / Get the initial virtual clock time (t=0 reference), without touching the underlying `timer.data` */
	readonly initTime: dayjs.Dayjs;

	/** 自建立以來經過的虛擬毫秒數（純數字，非 dayjs）/ Elapsed virtual milliseconds since creation (plain number, not dayjs) */
	readonly elapsedMilliseconds: number;

	/** 推進虛擬時間（同步，不執行回呼）/ Advance virtual time (synchronous, does not run callbacks) */
	advance(amount?: IDurationInput): this;

	/** 同步執行所有到期項目（不等待回呼）/ Synchronously run expired items (does not await callbacks) */
	run(): this;

	/** 非同步執行所有到期項目（等待每個回呼）/ Asynchronously run expired items (awaits each callback) */
	runAsync(): Promise<this>;

	/** 以生成器逐個執行到期項目並回傳生成器（不回傳 this）/ Run expired items one-by-one as a generator (does NOT return this) */
	runGenerator(): Generator<ITimeQueueItem, void, void>;

	/** 推進虛擬時間並同步執行到期項目 / Advance virtual time and synchronously run expired items */
	start(amount?: IDurationInput): this;

	/** 推進虛擬時間並非同步執行到期項目 / Advance virtual time and asynchronously run expired items */
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
