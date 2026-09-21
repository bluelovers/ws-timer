/**
 * Created by user on 2017/11/10/010.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import minMax from 'dayjs/plugin/minMax';
import { nanoid } from 'nanoid';
import { TimeCore, ITimeData as ITimeData2 } from './time';

dayjs.extend(duration);
dayjs.extend(minMax);

/** 虛擬時間或時間區間的聯合型別 / Union type for fake time or time duration */
export type vMoment = dayjs.Dayjs | duration.Duration;

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
	timing?: dayjs.Dayjs | duration.Duration | any;
}

/**
 * 時間資料擴展介面，加入排序回呼
 * Extended time data interface, adding sort callback
 */
export interface ITimeData extends ITimeData2
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
	(current: ITimeQueueItem, timer: QueueTimer, self?)
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
		q.timing = q.timing || this.now();

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
			timing: dayjs.isDuration(q.timing) ? this.now().add(q.timing) : q.timing,
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
	remove = (id: number | string | ITimeQueueItem): null | ITimeQueueItem =>
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
