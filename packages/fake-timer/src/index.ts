/**
 * Created by user on 2017/11/10/010.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { QueueTimer, EnumTimerType } from './queue';
import type { ICallback, ITimeQueueItem, ITimeQueueItemAdd, ITimeData, ITimerHandle, IDurationInput, IRemovedTimer } from './queue';
import { TimeCore } from './time';

export { QueueTimer };
export { TimeCore };
export { EnumTimerType };
export { ITimerHandle, IDurationInput, IRemovedTimer };

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
export function toDuration(value: IDurationInput): duration.Duration
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
	 * 每個影格（frame）的間隔，供 requestAnimationFrame 使用
	 * Per-frame interval used by requestAnimationFrame
	 *
	 * 預設為 1000/60 毫秒（約 60fps）。可直接覆寫以模擬不同刷新率。
	 * Defaults to 1000/60 ms (~60fps). Override directly to simulate other refresh rates.
	 */
	public frameInterval: duration.Duration = dayjs.duration(1000 / 60);

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
	protected _schedule(type: EnumTimerType, callback: ICallback, delay: IDurationInput, params: any[]): ITimeQueueItem
	{
		return this.timer.add({
			callback: callback,
			timing: toDuration(delay),
			interval: type === EnumTimerType.setInterval ? toDuration(delay) : undefined,
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
	setTimeout = (callback: ICallback, delay: IDurationInput, ...params: any[]): ITimeQueueItem =>
	{
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
	setInterval = (callback: ICallback, delay: IDurationInput, ...params: any[]): ITimeQueueItem =>
	{
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
	setImmediate = (callback: ICallback, ...params: any[]): ITimeQueueItem =>
	{
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
	requestAnimationFrame = (callback: ICallback, ...params: any[]): ITimeQueueItem =>
	{
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
	cancelAnimationFrame = (handle?: ITimerHandle): IRemovedTimer =>
	{
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
	protected _clear(handle?: ITimerHandle): IRemovedTimer
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
	clearTimeout = (handle?: ITimerHandle): IRemovedTimer =>
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
	clearInterval = (handle?: ITimerHandle): IRemovedTimer =>
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
	clearImmediate = (handle?: ITimerHandle): IRemovedTimer =>
	{
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
	clearAll = (): this =>
	{
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
	reset = (): this =>
	{
		this.timer.clear();
		this.timer.reset();

		/** 一併清空已完成項目的歷史快取 / Also clear the done-history cache */
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
	advance = (amount?: IDurationInput): this =>
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
		const now = this.timer.now();

		/** 清空已完成快取 / Clear the done cache */
		this.cache.done = [];

		/**
		 * 臨時執行陣列：即時佇列的淺拷貝（元素與即時佇列共享同一參考）。
		 * 本輪 run 完全由它驅動，執行期間「不」對即時佇列重新排序——
		 * 週期性項目更新 timing 後以二分插入回到此陣列的正確位置，最後才對即時佇列排序一次。
		 * Temporary execution array: a shallow copy of the live queue (elements share the
		 * same references as the live queue). This run is driven entirely by it, so we never
		 * re-sort the live queue mid-run — a periodic item's updated timing is binary-inserted
		 * back into this array at the right spot, and the live queue is sorted just once at the end.
		 */
		const pending = [...this.timer.queue];

		/**
		 * 二分插入，保持 pending 依 (timing 升冪, id 升冪) 有序（與 queueSortCallback 一致）。
		 * Binary insert keeping pending ordered by (timing asc, id asc), matching queueSortCallback.
		 */
		const insert = (item: ITimeQueueItem): void =>
		{
			let lo = 0;
			let hi = pending.length;

			while (lo < hi)
			{
				const mid = (lo + hi) >> 1;
				const m = pending[mid];
				const d = m.timing.diff(item.timing);

				// (timing 升冪, id 升冪)：m 應排在 item 之前時向右收斂
				// (timing asc, id asc): converge right when m should come before item
				if (d < 0 || (d === 0 && (m.id ?? 0) < (item.id ?? 0)))
				{
					lo = mid + 1;
				}
				else
				{
					hi = mid;
				}
			}

			pending.splice(lo, 0, item);
		};

		/**
		 * 將「即時佇列中已到期、但尚未進入 pending」的項目併入 pending。
		 * Merge into pending any live-queue items that are already expired but not yet
		 * in pending.
		 *
		 * 回呼內透過 setTimeout / setInterval / setImmediate 追加、且其觸發時間已 <= 現在
		 * 的計時器，會被併入同一輪 run 中執行——這才符合真實 API 行為
		 * （原生計時器在時間到達後會被一併排定執行，而非被丟棄）。
		 * Timers appended during a callback (via setTimeout / setInterval / setImmediate)
		 * whose fire time is already <= now are merged into the SAME run, matching the
		 * real API: once the clock reaches a time, every due timer fires (sinon/jest
		 * exhaustive-run semantics).
		 */
		const syncPending = (): void =>
		{
			for (const q of this.timer.queue)
			{
				if (now.diff(q.timing) >= 0 && !pending.includes(q))
				{
					insert(q);
				}
			}
		};

		while (pending.length > 0)
		{
			const current = pending[0];

			/** 佇列已排序，最早者若未到期即可停止 / earliest item unexpired → stop */
			if (now.diff(current.timing) < 0)
			{
				break;
			}

			/**
			 * 若該項目已在更早的回呼中被清除（clearTimeout / clearInterval / clearImmediate /
			 * clearAll / reset），則不應執行——符合真實 API：被取消的計時器永不觸發。
			 * 必須在 yield 前檢查，否則會發生「已清除的計時器仍被執行」的快照錯誤。
			 * If the item was already cleared during an earlier callback
			 * (clearTimeout / clearInterval / clearImmediate / clearAll / reset), it must
			 * NOT fire — matching the real API where a cancelled timer never runs. This
			 * check must happen BEFORE yield, otherwise we would re-execute an already
			 * cancelled timer (the old snapshot bug).
			 */
			if (!this.timer.queue.includes(current))
			{
				pending.shift();

				continue;
			}

			/** 記錄實際執行時間 / Record actual execution time */
			current.active = dayjs();

			/**
			 * 將項目交給驅動器執行回呼（同步或 async）；
			 * yield 後續的結束時間記錄 / 移除 / 重排程由本生成器在恢復後完成。
			 * Hand the item to the driver to invoke the callback (sync or async);
			 * the ending-time / removal / rescheduling after this is done by this generator once it resumes.
			 */
			yield current;

			/** 記錄結束時間 / Record end time */
			current.ending = dayjs();

			/** 加入已完成快取 / Add to done cache */
			this.cache.done.push(current);

			/** 從臨時陣列移除（無論週期或一次性）/ remove from the temp array (periodic or one-shot) */
			pending.shift();

			/**
			 * 回呼可能已追加新的計時器：將其中已到期的併入 pending，使本輪 run 能一併執行。
			 * The callback may have appended new timers: merge any due ones into pending
			 * so this same run picks them up.
			 */
			syncPending();

			/**
			 * 若回呼內已自行移除該項目（例如 clearInterval / clearTimeout(current)），則不處理。
			 * If the callback already removed this item (e.g. clearInterval / clearTimeout(current)), skip handling.
			 */
			if (!this.timer.queue.includes(current))
			{
				continue;
			}

			if (current.type === EnumTimerType.setInterval && current.interval != null)
			{
				const oldTiming = current.timing as dayjs.Dayjs;
				const nextTiming = oldTiming.add(current.interval as duration.Duration);

				/**
				 * 重新排程後「時間有推進」且仍 <= now：就地推進 timing，並以二分插入
				 * 回到臨時陣列繼續在本輪 run 內觸發（修正單次觸發問題）。
				 * Rescheduled timing actually advanced AND still <= now: advance timing in
				 * place and binary-insert back into the temp array to keep firing within
				 * the SAME run (fixes the single-fire issue).
				 */
				if (nextTiming.valueOf() > oldTiming.valueOf() && nextTiming.valueOf() <= now.valueOf())
				{
					current.timing = nextTiming;

					insert(current);

					continue;
				}

				/**
				 * 下一跳超出視窗（或 interval<=0 不推進）：timing 已更新為 nextTiming，
				 * 留在即時佇列中供未來 run 使用；不插回臨時陣列（本輪不再觸發）。
				 * Next tick beyond window (or non-advancing interval): timing advanced to
				 * nextTiming, kept in the live queue for a future run; not re-inserted here.
				 */
				current.timing = nextTiming;
			}
			else
			{
				/** 一次性計時器：從即時佇列移除（保持順序，不重新排序）/ one-shot: remove from live queue (order-preserving, no re-sort) */
				this.timer.remove(current);
			}
		}

		/**
		 * 本輪執行期間即時佇列的 interval timing 是被就地更新的，故最後排序一次以恢復有序性。
		 * During this run, interval timings in the live queue were updated in place, so
		 * sort it once at the end to restore order.
		 */
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
	 * 以生成器逐個執行到期項目（同步呼叫回呼）
	 * Run expired items one-by-one as a generator (invokes callbacks synchronously)
	 *
	 * 與 run() 同樣會執行每個回呼，但改以生成器形式逐個 yield 已執行的佇列項目，
	 * 而非回傳 this，方便呼叫者在項目之間插入觀察或處理邏輯。
	 * Same as run() in that it invokes each callback, but yields each executed queue item
	 * via a generator instead of returning this — handy for observing/handling between items.
	 *
	 * @returns 執行項目的生成器（不回傳 this）/ generator of executed items (does NOT return this)
	 */
	*runGenerator(): Generator<ITimeQueueItem, void, void>
	{
		for (const current of this._runCore())
		{
			current.callback(current, this.timer);

			yield current;
		}
	}

	/**
	 * 推進虛擬時間並同步執行到期的計時器
	 * Advance fake time and synchronously run expired timers
	 *
	 * @param amount - 推進的時間量，可為毫秒數或 Duration 物件 / Amount of time to advance
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	start = (amount?: IDurationInput): this =>
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
	startAsync = async (amount?: IDurationInput): Promise<this> =>
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
 * 模組層級的全域時鐘安裝註冊（雙重保險之一）
 * Module-level global-clock installation registry (one half of the double-insurance)
 *
 * 不為單純布林，而是一個「反安裝函式」：
 * Not a plain boolean, but an uninstall closure:
 *   - 未定義（undefined）與 false 同義：視為未安裝。
 *   - undefined is equivalent to false: treated as NOT installed.
 *   - 註冊全域時，會被指派為真正安裝該時鐘的實例所提供的反安裝函式 (() => uninstall)，
 *     使任何實例都能委託它回到正確的實例執行還原，從而解決跨類別 / 跨實例 uninstall 的問題。
 *   - when globally registered, it is assigned the uninstall closure provided by the instance
 *     that actually installed the clock, so any instance can delegate the restore to the
 *     correct one — solving the cross-instance uninstall problem.
 */
let _globalClockInstalled: (() => void) | undefined;

/** 預設的全域「會掛載全域時鐘」Timer 實例 / Default global Timer instance that also patches the global clock */
let globalFakeTimer: UnsafeGlobalFakeTimer;

export function getUnsafeGlobalFakeTimer()
{
	return globalFakeTimer ??= new UnsafeGlobalFakeTimer();
}

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
export const enum EnumGlobalClockState
{
	none = 'none',
	self = 'self',
	global = 'global',
}

export class UnsafeGlobalFakeTimer extends FakeTimer
{
	/** 全域時鐘是否由「本實例」安裝 / Whether the global clock was installed by THIS instance */
	private _clockInstalled = false;

	/** 原始 Date.now 實作（用於還原）/ Original Date.now implementation (for restore) */
	private _originalDateNow?: () => number;

	/** 原始 performance.now 實作（用於還原）/ Original performance.now implementation (for restore) */
	private _originalPerfNow?: () => number;

	/**
	 * 實際執行還原（不重入、不委派），供 installGlobalClock 註冊的全域反安裝函式呼叫。
	 * Performs the actual restore (non-reentrant, non-delegating); invoked by the global
	 * uninstall closure registered during installGlobalClock.
	 */
	private _doUninstall = (): void =>
	{
		if (this._originalDateNow)
		{
			// @ts-ignore
			Date.now = this._originalDateNow;
		}

		const perf = (globalThis as any).performance;
		if (perf && this._originalPerfNow)
		{
			perf.now = this._originalPerfNow;
		}

		this._clockInstalled = false;
		_globalClockInstalled = undefined;
	};

	/**
	 * 查詢全域時鐘的安裝狀態，區分是由本實例或全域（可能是其它實例）安裝。
	 * Inspect the global-clock installation state, distinguishing whether it was installed
	 * by THIS instance or globally (possibly by another instance).
	 *
	 * - 'none'   : 未安裝 / not installed
	 * - 'this'   : 由本實例安裝 / installed by this instance
	 * - 'global' : 已由某實例安裝（可能是其它實例）/ installed globally (possibly by another instance)
	 */
	globalClockState(): EnumGlobalClockState
	{
		if (this._clockInstalled)
		{
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
	installGlobalClock = (): this =>
	{
		// 雙重保險：本實例已安裝，或全域已註冊（未定義等同 false），即視為已安裝，避免重複掛載。
		// Double insurance: already installed by this instance, or a global registration exists
		// (undefined is equivalent to false) → treat as installed, preventing double-patch.
		if (this._clockInstalled || _globalClockInstalled != null)
		{
			return this;
		}

		// @ts-ignore
		this._originalDateNow = Date.now;

		const perf = (globalThis as any).performance;
		this._originalPerfNow = (perf && typeof perf.now === 'function') ? perf.now.bind(perf) : undefined;

		// @ts-ignore
		Date.now = () => this.timer.now().valueOf();

		if (perf && this._originalPerfNow)
		{
			perf.now = () => this.timer.now().valueOf() - (this.timer.data.fake_init as dayjs.Dayjs).valueOf();
		}

		this._clockInstalled = true;
		// 全域註冊為「反安裝函式」：任何實例都能委託它回到真正安裝的實例執行還原，
		// 解決跨類別 / 跨實例 uninstall 的問題。未定義時與 false 同義。
		// Register the uninstall closure globally: any instance can delegate to it to restore
		// via the instance that actually installed the patch, solving the cross-instance problem.
		// When undefined, it is equivalent to false (not installed).
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
	uninstallGlobalClock = (): this =>
	{
		// 本實例未安裝且全域亦未註冊 → 無事可做
		// Neither this instance nor the global registration is active → nothing to do.
		if (!this._clockInstalled && _globalClockInstalled == null)
		{
			return this;
		}

		// 委派給全域註冊的反安裝函式（由真正安裝的實例提供），解決跨實例 uninstall。
		// Delegate to the globally-registered uninstall closure (provided by the installing
		// instance), solving cross-instance uninstall.
		if (_globalClockInstalled != null)
		{
			_globalClockInstalled();

			return this;
		}

		// 僅本實例安裝時，直接還原
		// Only this instance installed → restore directly.
		this._doUninstall();

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

/** 便捷匯出：直接使用全域 Timer 的 clearAll / Convenience export: use global Timer's clearAll */
export const clearAll = defaultFakeTimer.clearAll;

/** 便捷匯出：直接使用全域 Timer 的 reset / Convenience export: use global Timer's reset */
export const reset = defaultFakeTimer.reset;

/** 便捷匯出：直接使用全域 Timer 的 requestAnimationFrame / Convenience export: use global Timer's requestAnimationFrame */
export const requestAnimationFrame = defaultFakeTimer.requestAnimationFrame;

/** 便捷匯出：直接使用全域 Timer 的 cancelAnimationFrame / Convenience export: use global Timer's cancelAnimationFrame */
export const cancelAnimationFrame = defaultFakeTimer.cancelAnimationFrame;

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

	Object.defineProperty(defaultFakeTimer, "clearAll", { value: clearAll });
	Object.defineProperty(defaultFakeTimer, "reset", { value: reset });
	Object.defineProperty(defaultFakeTimer, "requestAnimationFrame", { value: requestAnimationFrame });
	Object.defineProperty(defaultFakeTimer, "cancelAnimationFrame", { value: cancelAnimationFrame });

	Object.defineProperty(defaultFakeTimer, "UnsafeGlobalFakeTimer", { value: UnsafeGlobalFakeTimer });
	Object.defineProperty(defaultFakeTimer, "getUnsafeGlobalFakeTimer", { value: getUnsafeGlobalFakeTimer });
}
