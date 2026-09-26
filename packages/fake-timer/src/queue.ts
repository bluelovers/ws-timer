/**
 * Created by user on 2017/11/10/010.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import minMax from 'dayjs/plugin/minMax';
import { nanoid } from 'nanoid';
import { TimeCore, type ITimeDataCore } from './time';
import type { FakeTimer } from './index';

dayjs.extend(duration);
dayjs.extend(minMax);

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
export const enum EnumTimerType
{
	setTimeout = 'setTimeout',
	setInterval = 'setInterval',
	setImmediate = 'setImmediate',
	requestAnimationFrame = 'requestAnimationFrame',
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
export interface ITimeQueueItem
{
	/** 自增識別碼 / Auto-increment identifier */
	id?: number;

	/** 預計觸發時間 / Scheduled trigger time */
	timing?: dayjs.Dayjs;

	/** 註冊時間（排程當下的虛擬時間）/ Registration time (virtual time when scheduled) */
	added?: dayjs.Dayjs;

	/** 已觸發次數（每次執行回呼 +1；一次性 timer 固定為 1）/ Fire count (incremented per callback; 1 for one-shot) */
	count?: number;

	/** 實際開始執行時間 / Actual start execution time */
	active?: dayjs.Dayjs;

	/** 執行結束時間 / Execution end time */
	ending?: dayjs.Dayjs;

	/** 隨機唯一識別碼（nanoid）/ Random unique identifier (nanoid) */
	name?: string;

	/** 到期時呼叫的回呼函式 / Callback function to invoke on expiry */
	callback?: ICallback;

	/** 傳遞給回呼函式的額外參數 / Additional parameters passed to the callback */
	params?: any[],

	/** 計時器種類 / Timer kind */
	type?: EnumTimerType,

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
	timing?: IDayMoment | number | any;
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
	(callback: ICallback, delay: duration.Duration, immediate: boolean);
}

/**
 * 計時器回呼函式介面
 * Timer callback function interface
 *
 * @param current - 當前執行的佇列項目 / The currently executing queue item
 * @param timer - 所屬的 QueueTimer 實例 / The owning QueueTimer instance
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
 * 佇列式計時器，繼承 Time 類別
 * Queue-based timer, extends the Time class
 *
 * 管理一個按時間排序的佇列，支援新增、移除、排序、到期檢查等操作。
 * 所有計時器項目都存放在 queue 陣列中，並透過 cache 追蹤最小與最大時間以提升效能。
 * Manages a time-sorted queue, supporting add, remove, sort, and expiry check operations.
 * All timer items are stored in the queue array, with min/max times tracked via cache for performance.
 */
export class QueueTimer extends TimeCore
{
	/** 計時器佇列 / Timer queue */
	public queue = [] as ITimeQueueItem[];

	/** 快取佇列中的最小與最大時間 / Cache for min and max times in the queue */
	public cache = {
		min: null,
		max: null,
	} as any;

	/** 覆寫父類的 data 型別 / Override parent class data type */
	public override data: ITimeData;

	constructor()
	{
		super(...arguments);

		//this.data.sort = queueSortCallback;
	}

	/**
	 * 佇列中项目的數量 / Number of items in the queue
	 */
	get length()
	{
		return this.queue.length;
	}

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
	add = (q: ITimeQueueItemAdd): ITimeQueueItem =>
	{
		/** 若未指定觸發時間，使用當前虛擬時間 / If no trigger time specified, use current fake time */
		const now = this.now();

		q.timing = q.timing || now;

		/**
		 * 合併預設值與實際值，產生唯一識別碼
		 * Merge default values with actual values, generate unique identifiers
		 */
		q = Object.assign({
			id: null,
			name: null,
			timing: null,
		}, q, {
			id: this.id(),
			name: nanoid(),
			timing: dayjs.isDuration(q.timing) ? now.add(q.timing) : q.timing,
			added: now,
			count: 0,
			index: this.length,
		});

		/** 更新快取中的時間邊界 / Update time boundaries in cache */
		this._cache_timing(q.timing);

		this.queue.push(q as ITimeQueueItem);

		return q as ITimeQueueItem;
	};

	/**
	 * 重新整理快取的最小與最大時間
	 * Refresh cached min and max times
	 *
	 * 佇列為空時 min/max 設為 null，否則取首尾元素的 timing
	 * When queue is empty, min/max set to null; otherwise take first and last element's timing
	 */
	_cache_refresh = (): void =>
	{
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
	_cache_timing = (timing, reset?: boolean): void =>
	{
		if (reset)
		{
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
	sort = (cb?: ISortCallback): this =>
	{
		let self = this;

		let q = this.queue.sort(cb || this.data.sort || queueSortCallback);

		/** 重設快取並重新建立時間邊界 / Reset cache and rebuild time boundaries */
		this._cache_timing(null, true);

		this.queue.map(function (q, index)
		{
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
	eq = (idx: number): ITimeQueueItem =>
	{
		if (idx == -1)
		{
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
	protected _remove = (idx): ITimeQueueItem | null =>
	{
		let q = this.queue.splice(idx, 1);

		//console.log(777, q.length, q);

		if (q.length == 1)
		{
			return q[0];
		}

		return null;
	};

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
	remove = (id: ITimerHandle): IRemovedTimer =>
	{
		//console.log(typeof id, id);

		/**
		 * 若 id 為數字或在佇列索引範圍內，直接依索引移除
		 * If id is a number or within queue index range, remove by index directly
		 */
		// @ts-ignore
		if (typeof id == 'number' || (id in this.queue))
		{
			return this._remove(id);
		}
		else if ((id as ITimeQueueItem).name)
		{
			id = (id as ITimeQueueItem).name;
		}

		/**
		 * 若為字串名稱，透過 findIndex 尋找對應項目後移除
		 * If it's a string name, find the corresponding item via findIndex and remove
		 */
		id = this.queue.findIndex(function (q)
		{
			return (q.name == id);
		});

		if (id > -1)
		{
			return this._remove(id);
		}

		return null;
	};

	/**
	 * 靜態工廠方法，建立 QueueTimer 實例
	 * Static factory method to create a QueueTimer instance
	 */
	// @ts-ignore
	static new(options?: ITimeData)
	{
		return super.new() as QueueTimer;
	}

	/**
	 * 檢查佇列中是否有已到期的項目
	 * Check if there are expired items in the queue
	 *
	 * 判斷邏輯：比較當前虛擬時間與佇列中最早的時間（cache.min）
	 * 若差值 >= 0 則表示至少有一個項目已到期
	 * Logic: compare current fake time with the earliest time in queue (cache.min)
	 * If diff >= 0, at least one item has expired
	 */
	hasExpires = (): boolean =>
	{
		let d = this.now().diff(this.cache.min);

		return (d >= 0);
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
	clear(): this
	{
		this.queue = [];
		this.cache.min = null;
		this.cache.max = null;

		return this;
	};
}

export default QueueTimer;

/**
 * 預設排序回呼函式（id 大者排前面）
 * Default sort callback function (larger id first)
 *
 * 先比較 timing，若相同則以 id 決定順序
 * Compares timing first; if equal, uses id to determine order
 */
export function queueSortCallback(a: ITimeQueueItem, b: ITimeQueueItem)
{
	let d = a.timing.diff(b.timing);

	//console.log(d, a.id, b.id);

	if (d == 0)
	{
		return a.id > b.id;
	}

	return a.timing.diff(b.timing);
}

/**
 * 替代排序回呼函式（id 小者排前面）
 * Alternative sort callback function (smaller id first)
 *
 * 與 queueSortCallback 相同邏輯，但 id 相同時以 id 較小者排前面
 * Same logic as queueSortCallback, but when ids are equal, smaller id comes first
 */
export function queueSortCallback2(a: ITimeQueueItem, b: ITimeQueueItem)
{
	let d = a.timing.diff(b.timing);

	//console.log(d, a.id, b.id);

	if (d == 0)
	{
		return a.id < b.id;
	}

	return a.timing.diff(b.timing);
}
