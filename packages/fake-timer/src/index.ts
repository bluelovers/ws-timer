/**
 * Created by user on 2017/11/10/010.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { QueueTimer, ICallback, ITimeQueueItem, ITimeQueueItemAdd, ITimeData } from './queue';
import { toDuration } from './time';

dayjs.extend(duration);

/**
 * 計時器函式介面，支援數值或 Duration 延遲
 * Timer function interface, supporting number or Duration delay
 */
export interface ITimerFunc extends Function
{
	(callback: ICallback, delay: number, ...params: any[]): Promise<ITimeQueueItem>;

	(callback: ICallback, delay: duration.Duration, ...params: any[]): Promise<ITimeQueueItem>;
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
export class Timer implements ITimer
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
	 * 模擬 setTimeout：將回呼函式排入佇列，延遲指定時間後執行
	 * Simulate setTimeout: queue a callback to execute after a specified delay
	 *
	 * @param callback - 到期時執行的回呼函式 / Callback function to execute on expiry
	 * @param delay - 延遲時間，可為毫秒數或 Duration 物件 / Delay time, can be milliseconds or Duration object
	 * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
	 * @returns 新增的佇列項目 / The newly added queue item
	 */
	setTimeout = async (callback: ICallback, delay: number | duration.Duration, ...params: any[]) =>
	{
		let q = this.timer.add({
			callback: callback,
			timing: toDuration(delay),
			params: params,
			type: 'setTimeout',
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
	setInterval = async (callback: ICallback, delay: number | duration.Duration, ...params: any[]) =>
	{
		let q = this.timer.add({
			callback: callback,
			timing: toDuration(delay),
			params: params,
			type: 'setInterval',
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
	setImmediate = async (callback: ICallback, ...params: any[]) =>
	{
		let q = this.timer.add({
			callback: callback,
			timing: dayjs.duration(0),
			params: params,
			type: 'setImmediate',
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
	start = async (amount?: number | duration.Duration) =>
	{
		/**
		 * 若 amount 為負數，改用佇列中最早的時間作為推進量
		 * If amount is negative, use the earliest time in queue as the advance amount
		 */
		if ((amount as number) < 0)
		{
			amount = this.timer.cache.min;
		}

		/** 推進虛擬時間 / Advance fake time */
		await this.timer.update(amount);

		/** 重新排序佇列 / Re-sort the queue */
		await this.timer.sort();

		/**
		 * 檢查是否有到期項目，若有則執行 run()
		 * Check for expired items, and run() if any exist
		 */
		if (this.timer.hasExpires())
		{
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
	run = async () =>
	{
		let now = this.timer.now();

		/** 清空已完成快取 / Clear the done cache */
		this.cache.done = [];

		for (let idx in this.timer.queue)
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

				/** 執行回呼函式 / Execute callback */
				await current.callback(current, this.timer);

				/** 從佇列中移除 / Remove from queue */
				this.timer.remove(idx);

				/** 記錄結束時間 / Record end time */
				current.ending = dayjs();

				/** 加入已完成快取 / Add to done cache */
				this.cache.done.push(current);
			}
			else
			{
				/** 佇列已排序，遇到未到期項目即可停止遍歷 / Queue is sorted, can stop at first unexpired item */
				break;
			}
		}

		/** 重新整理佇列快取（因已移除部分項目）/ Refresh queue cache (items were removed) */
		this.timer._cache_refresh();

		return this;
	};
}

/**
 * 預設的全域 Timer 實例
 * Default global Timer instance
 */
export const init = new Timer();

export default init;

/** 便捷匯出：直接使用全域 Timer 的 setTimeout / Convenience export: use global Timer's setTimeout */
export const setTimeout = init.setTimeout;

/** 便捷匯出：直接使用全域 Timer 的 setInterval / Convenience export: use global Timer's setInterval */
export const setInterval = init.setInterval;

/** 便捷匯出：直接使用全域 Timer 的 setImmediate / Convenience export: use global Timer's setImmediate */
export const setImmediate = init.setImmediate;

// @ts-ignore
if (process.env.TSDX_FORMAT !== 'esm')
{
	Object.defineProperty(init, "__esModule", { value: true });

	Object.defineProperty(init, "default", { value: init });
	Object.defineProperty(init, "Timer", { value: Timer });
	Object.defineProperty(init, "QueueTimer", { value: QueueTimer });

	Object.defineProperty(init, "setTimeout", { value: setTimeout });
	Object.defineProperty(init, "setInterval", { value: setInterval });
	Object.defineProperty(init, "setImmediate", { value: setImmediate });
}
