/**
 * Created by user on 2017/11/10/010.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { QueueTimer, ICallback, ITimeQueueItem, ITimeQueueItemAdd, ITimeData } from './queue';
import { TimeCore } from './time';

export { QueueTimer };
export { TimeCore };

dayjs.extend(duration);

/**
 * 計時器函式介面，支援數值或 Duration 延遲
 * Timer function interface, supporting number or Duration delay
 */
export interface ITimerFunc extends Function
{
	(callback: ICallback, delay: number, ...params: any[]): ITimeQueueItem;

	(callback: ICallback, delay: duration.Duration, ...params: any[]): ITimeQueueItem;
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
	clearTimeout(handle?: number | string | ITimeQueueItem): null | ITimeQueueItem;

	/** 模擬原生 clearInterval / Simulate native clearInterval */
	clearInterval(handle?: number | string | ITimeQueueItem): null | ITimeQueueItem;

	/** 模擬原生 clearImmediate / Simulate native clearImmediate */
	clearImmediate(handle?: number | string | ITimeQueueItem): null | ITimeQueueItem;

	/** 推進虛擬時間（同步，不執行回呼）/ Advance fake time (synchronous, does not run callbacks) */
	advance(amount?: number | duration.Duration): this;

	/** 同步執行所有到期項目（不等待回呼）/ Synchronously run expired items (does not await callbacks) */
	run(): this;

	/** 非同步執行所有到期項目（等待每個回呼）/ Asynchronously run expired items (awaits each callback) */
	runAsync(): Promise<this>;

	/** 推進虛擬時間並同步執行到期項目 / Advance fake time and synchronously run expired items */
	start(amount?: number | duration.Duration): this;

	/** 推進虛擬時間並非同步執行到期項目 / Advance fake time and asynchronously run expired items */
	startAsync(amount?: number | duration.Duration): Promise<this>;
}

/**
 * 將數值或 Duration 轉換為 Duration 型別
 * Converts a number or Duration to a Duration type
 *
 * 若輸入已是 Duration，則直接回傳；否則以數值建立 Duration（單位為毫秒）
 * If input is already a Duration, return it directly; otherwise create a Duration from the number (in milliseconds)
 */
export function toDuration(value: number | duration.Duration): duration.Duration
{
	return dayjs.isDuration(value) ? value : dayjs.duration(value);
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
export class FakeTimer implements ITimer
{

	/** 底層佇列計時器實例 / Underlying queue timer instance */
	public timer: QueueTimer;

	/** 已完成的佇列項目快取 / Cache for completed queue items */
	public cache = {
		done: [] as ITimeQueueItem[],
	};

	/**
	 * 建立 Timer 實例
	 * Create a Timer instance
	 *
	 * @param options - 時間配置選項 / Time configuration options
	 */
	constructor(options?: ITimeData)
	{
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
	protected _schedule(type: 'setTimeout' | 'setInterval' | 'setImmediate', callback: ICallback, delay: number | duration.Duration, params: any[]): ITimeQueueItem
	{
		return this.timer.add({
			callback: callback,
			timing: toDuration(delay),
			interval: type === 'setInterval' ? toDuration(delay) : undefined,
			params: params,
			type: type,
		});
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
	setTimeout = (callback: ICallback, delay: number | duration.Duration, ...params: any[]): ITimeQueueItem =>
	{
		return this._schedule('setTimeout', callback, delay, params);
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
	setInterval = (callback: ICallback, delay: number | duration.Duration, ...params: any[]): ITimeQueueItem =>
	{
		return this._schedule('setInterval', callback, delay, params);
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
	setImmediate = (callback: ICallback, ...params: any[]): ITimeQueueItem =>
	{
		return this._schedule('setImmediate', callback, 0, params);
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
	protected _clear(handle?: number | string | ITimeQueueItem): null | ITimeQueueItem
	{
		if (handle == null)
		{
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
	clearTimeout = (handle?: number | string | ITimeQueueItem): null | ITimeQueueItem =>
	{
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
	clearInterval = (handle?: number | string | ITimeQueueItem): null | ITimeQueueItem =>
	{
		return this._clear(handle);
	};

	/**
	 * 模擬 clearImmediate：取消尚未執行的 setImmediate 項目
	 * Simulate clearImmediate: cancel a pending setImmediate item
	 *
	 * @param handle - 要取消的項目，可為佇列項目、唯一名稱或索引 / Item to cancel (queue item, name, or index)
	 * @returns 被移除的項目，若未找到則回傳 null / The removed item, or null if not found
	 */
	clearImmediate = (handle?: number | string | ITimeQueueItem): null | ITimeQueueItem =>
	{
		return this._clear(handle);
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
	advance = (amount?: number | duration.Duration): this =>
	{
		if ((amount as number) < 0)
		{
			amount = this.timer.cache.min ?? 0;
		}

		/** 推進虛擬時間 / Advance fake time */
		this.timer.update(amount);

		/** 重新排序佇列 / Re-sort the queue */
		this.timer.sort();

		return this;
	};

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
	protected *_runCore(): Generator<ITimeQueueItem, void, void>
	{
		let now = this.timer.now();

		/** 清空已完成快取 / Clear the done cache */
		this.cache.done = [];

		/**
		 * 需重新排程的週期性（setInterval）項目
		 * Periodic (setInterval) items that need to be rescheduled
		 */
		const reschedule: ITimeQueueItem[] = [];

		for (let idx = 0; idx < this.timer.queue.length; )
		{
			let current = this.timer.queue[idx];

			/**
			 * 檢查項目是否已到期（timing <= 當前虛擬時間）
			 * Check if item has expired (timing <= current fake time)
			 */
			if (now.diff(current.timing) >= 0)
			{
				/** 記錄實際執行時間 / Record actual execution time */
				current.active = dayjs();

				/**
				 * 將項目交給驅動器執行回呼（同步或 async）；
				 * yield 後續的結束時間記錄 / 移除 / 重排程由本生成器在恢復後完成。
				 * Hand the item to the driver to invoke the callback (sync or async);
				 * the ending-time / removal / rescheduling after this is done by this
				 * generator once it resumes.
				 */
				yield current;

				/** 記錄結束時間 / Record end time */
				current.ending = dayjs();

				/** 加入已完成快取 / Add to done cache */
				this.cache.done.push(current);

				/**
				 * 若回呼內已自行移除該項目（例如 clearInterval），則不再重複移除與重排程；
				 * 此時佇列已位移，停留在同一 idx 繼續檢查下一個項目。
				 * If the callback already removed this item (e.g. clearInterval), do not
				 * remove it again or reschedule it; the queue has shifted, so stay at the
				 * same idx to re-check the next item.
				 */
				if (this.timer.queue.includes(current))
				{
					/** 從佇列中移除 / Remove from queue */
					this.timer.remove(idx);

					/**
					 * 週期性計時器（setInterval）：收集起來稍後重新排程，而非永久移除。
					 * Periodic timer (setInterval): collect for later rescheduling instead
					 * of permanent removal.
					 */
					if (current.type === 'setInterval' && current.interval != null)
					{
						reschedule.push(current);
					}
				}
			}
			else
			{
				/** 佇列已排序，遇到未到期項目即可停止遍歷 / Queue is sorted, can stop at first unexpired item */
				break;
			}
		}

		/**
		 * 重新排程 setInterval 項目：保留原 name/id（使 clearInterval / remove 仍可有效移除），
		 * 將 timing 推進一個間隔後放回佇列。
		 * Reschedule setInterval items: keep the original name/id, advance timing by one
		 * interval and push it back into the queue.
		 */
		for (const item of reschedule)
		{
			item.timing = (item.timing as dayjs.Dayjs).add(item.interval as duration.Duration);
			this.timer.queue.push(item);
		}

		/**
		 * 若有重新排程，需重新排序以恢復佇列有序性（hasExpires / break 優化都依賴排序）；
		 * 否則僅重新整理快取即可。
		 * If anything was rescheduled, re-sort to restore queue order; otherwise just
		 * refresh the cache.
		 */
		if (reschedule.length)
		{
			this.timer.sort();
		}
		else
		{
			this.timer._cache_refresh();
		}
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
	run = (): this =>
	{
		for (const current of this._runCore())
		{
			current.callback(current, this.timer);
		}

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
	runAsync = async (): Promise<this> =>
	{
		for (const current of this._runCore())
		{
			await current.callback(current, this.timer);
		}

		return this;
	};

	/**
	 * 推進虛擬時間並同步執行到期的計時器
	 * Advance fake time and synchronously run expired timers
	 *
	 * @param amount - 推進的時間量，可為毫秒數或 Duration 物件 / Amount of time to advance
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	start = (amount?: number | duration.Duration): this =>
	{
		this.advance(amount);

		if (this.timer.hasExpires())
		{
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
	startAsync = async (amount?: number | duration.Duration): Promise<this> =>
	{
		this.advance(amount);

		if (this.timer.hasExpires())
		{
			await this.runAsync();
		}

		return this;
	};
}

/**
 * 預設的全域 Timer 實例
 * Default global Timer instance
 */
export const defaultFakeTimer = new FakeTimer();

export default defaultFakeTimer;

/** 便捷匯出：直接使用全域 Timer 的 setTimeout / Convenience export: use global Timer's setTimeout */
export const setTimeout = defaultFakeTimer.setTimeout;

/** 便捷匯出：直接使用全域 Timer 的 setInterval / Convenience export: use global Timer's setInterval */
export const setInterval = defaultFakeTimer.setInterval;

/** 便捷匯出：直接使用全域 Timer 的 setImmediate / Convenience export: use global Timer's setImmediate */
export const setImmediate = defaultFakeTimer.setImmediate;

/** 便捷匯出：直接使用全域 Timer 的 clearTimeout / Convenience export: use global Timer's clearTimeout */
export const clearTimeout = defaultFakeTimer.clearTimeout;

/** 便捷匯出：直接使用全域 Timer 的 clearInterval / Convenience export: use global Timer's clearInterval */
export const clearInterval = defaultFakeTimer.clearInterval;

/** 便捷匯出：直接使用全域 Timer 的 clearImmediate / Convenience export: use global Timer's clearImmediate */
export const clearImmediate = defaultFakeTimer.clearImmediate;

/** 便捷匯出：直接使用全域 Timer 的 advance / Convenience export: use global Timer's advance */
export const advance = defaultFakeTimer.advance;

/** 便捷匯出：直接使用全域 Timer 的 run（同步）/ Convenience export: use global Timer's run (sync) */
export const run = defaultFakeTimer.run;

/** 便捷匯出：直接使用全域 Timer 的 runAsync（非同步）/ Convenience export: use global Timer's runAsync (async) */
export const runAsync = defaultFakeTimer.runAsync;

/** 便捷匯出：直接使用全域 Timer 的 start（同步）/ Convenience export: use global Timer's start (sync) */
export const start = defaultFakeTimer.start;

/** 便捷匯出：直接使用全域 Timer 的 startAsync（非同步）/ Convenience export: use global Timer's startAsync (async) */
export const startAsync = defaultFakeTimer.startAsync;

// @ts-ignore
if (process.env.TSDX_FORMAT !== 'esm')
{
	Object.defineProperty(defaultFakeTimer, "__esModule", { value: true });

	Object.defineProperty(defaultFakeTimer, "default", { value: defaultFakeTimer });
	Object.defineProperty(defaultFakeTimer, "FakeTimer", { value: FakeTimer });

	Object.defineProperty(defaultFakeTimer, "QueueTimer", { value: QueueTimer });
	Object.defineProperty(defaultFakeTimer, "TimeCore", { value: TimeCore });

	Object.defineProperty(defaultFakeTimer, "toDuration", { value: toDuration });

	Object.defineProperty(defaultFakeTimer, "setTimeout", { value: setTimeout });
	Object.defineProperty(defaultFakeTimer, "setInterval", { value: setInterval });
	Object.defineProperty(defaultFakeTimer, "setImmediate", { value: setImmediate });

	Object.defineProperty(defaultFakeTimer, "clearTimeout", { value: clearTimeout });
	Object.defineProperty(defaultFakeTimer, "clearInterval", { value: clearInterval });
	Object.defineProperty(defaultFakeTimer, "clearImmediate", { value: clearImmediate });

	Object.defineProperty(defaultFakeTimer, "advance", { value: advance });
	Object.defineProperty(defaultFakeTimer, "run", { value: run });
	Object.defineProperty(defaultFakeTimer, "runAsync", { value: runAsync });
	Object.defineProperty(defaultFakeTimer, "start", { value: start });
	Object.defineProperty(defaultFakeTimer, "startAsync", { value: startAsync });
}
