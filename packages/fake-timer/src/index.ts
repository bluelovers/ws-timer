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
export function toDuration(value: IDurationInput): duration.Duration
{
	return dayjs.isDuration(value) ? value : dayjs.duration(value);
}

/**
 * 驗證並正規化 delay，對齊標準 Web API 的處理方式（集中複用，不在各呼叫點重複寫死）。
 * Validate and normalize a delay, aligning with the standard Web API (shared/reusable, not inlined).
 *
 * 規則 / Rules:
 * - `undefined` / `null` → `0`（對齊 `setTimeout(func)` 省略 delay）。
 * - 數值非有限（Infinity / -Infinity / NaN）→ 拋 `RangeError`（避免產生失控計時器）。
 * - `dayjs.Duration` 解析後非有限（dayjs.duration(NaN) / dayjs.duration(Infinity)）→ 拋 `RangeError`。
 * - 負數 delay → 箝成 `0`（標準 Web API：timeout < 0 視為 0）。
 *
 * @returns 有限且有效的 delay（number | duration.Duration）
 */
export function normalizeDelay(delay: IDurationInput | null | undefined): IDurationInput
{
	const value = delay ?? 0;

	if (typeof value === 'number')
	{
		if (!Number.isFinite(value))
		{
			throw new RangeError(
				`fake-timer: delay must be a finite number; received ${String(delay)} ` +
				`(Infinity / -Infinity / NaN are not allowed — they create uncontrolled timers).`,
			);
		}

		return value < 0 ? 0 : value;
	}

	// value 為 dayjs.Duration
	if (!Number.isFinite(value.asMilliseconds()))
	{
		throw new RangeError(
			`fake-timer: delay Duration must resolve to a finite number of milliseconds; received ${String(delay)} ` +
			`(dayjs.duration(NaN) / dayjs.duration(Infinity) are not allowed).`,
		);
	}

	return value.asMilliseconds() < 0 ? 0 : value;
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
	 * 每個影格（frame）的間隔，供 requestAnimationFrame 使用。
	 * Per-frame interval used by requestAnimationFrame.
	 *
	 * 使用時機 / When to use：
	 *   僅在使用 `requestAnimationFrame` 時有意義；預設 1000/60 ms（約 60fps）。
	 *   Only relevant when using `requestAnimationFrame`; defaults to 1000/60 ms (~60fps).
	 *
	 * 優先使用 / Prefer：
	 *   一般計時器（`setTimeout` / `setInterval`）不受 `frameInterval` 影響，請用其各自 `delay` 控制間隔；
	 *   只有在想模擬不同刷新率時，才覆寫本屬性。
	 *   Ordinary timers (`setTimeout` / `setInterval`) ignore `frameInterval` — control them via their own
	 *   `delay`; only override this when simulating a different refresh rate.
	 *
	 * 預設為 1000/60 毫秒（約 60fps）。可直接覆寫以模擬不同刷新率。
	 * Defaults to 1000/60 ms (~60fps). Override directly to simulate other refresh rates.
	 */
	public frameInterval: duration.Duration = dayjs.duration(1000 / 60);

	/**
	 * 虛擬時鐘的初始時間（t=0 基準），唯讀。
	 * The initial virtual clock time (t=0 reference), read-only.
	 *
	 * 使用時機 / When to use：
	 *   需要「自建立以來經過的毫秒數」時：`self.timer.now().diff(self.initTime)`。
	 *   Use it to compute elapsed fake time since creation: `self.timer.now().diff(self.initTime)`.
	 *
	 * 優先使用 / Prefer：
	 *   請用 `initTime` 取代直接讀取底層 `timer.data.fake_init` —— 這是公開取值 API，不必操作內部 `data`。
	 *   Prefer `initTime` over reaching into the internal `timer.data.fake_init`; this is the public accessor.
	 */
	public get initTime(): dayjs.Dayjs
	{
		return this.timer.data.fake_init as dayjs.Dayjs;
	}

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
	} | null = null;

	/** 目前活躍 run 的快取生成器：run / runAsync / runGenerator 共用同一份狀態。
	 * Cached generator of the active run: run / runAsync / runGenerator share one state. */
	protected _gen: Generator<ITimeQueueItem, void, void> | null = null;

	/** 本次 run 開始前的虛擬時間（供 cancel / pause 修正時間使用）。
	 * Virtual time before this run started (used by cancel / pause to correct time). */
	protected _runStartNow: dayjs.Dayjs | null = null;

	/** 目前正被執行的佇列項目（供 pause / cancel 中斷時移除已觸發的項目）。
	 * The queue item currently being executed (used by pause / cancel to remove the already-fired item). */
	protected _current: ITimeQueueItem | null = null;

	/** 中斷旗標：pause / cancel 在回呼內設定，_runCore 於每次 yield 後檢查並結束本輪 run。
	 * 使用旗標而非 generator.return()，是因為回呼可能在自動觸發回呼的生成器內執行，
	 * 此時直接 return() 會拋出「Generator is already running」。
	 * Abort flag: set by pause / cancel inside a callback; _runCore checks it after each yield to
	 * end the run. A flag (not generator.return()) is used because the callback may run INSIDE a
	 * generator that auto-invokes callbacks, where return() would throw "Generator is already running". */
	protected _abort = false;

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
		const validatedDelay = normalizeDelay(delay);

		const timing = toDuration(validatedDelay);

		const item = this.timer.add({
			callback: callback,
			timing: timing,
			interval: type === EnumTimerType.setInterval ? timing : undefined,
			params: params,
			type: type,
		});

		/**
		 * 若目前正處於某次 run 當中，立刻把新增的項目併入該輪 run（經由內部 tryAdd）。
		 * 這使得「回呼內追加且已到期的計時器」能在同一輪執行、且不需反覆掃描佇列。
		 * If we are currently inside a run, immediately merge the new item into that run
		 * (via the internal tryAdd). This lets "due timers appended inside a callback" fire
		 * in the same run, without repeatedly scanning the queue.
		 */
		this._activeRun?.tryAdd(item);

		return item;
	}

	/**
	 * 模擬 setTimeout：將回呼函式排入佇列，延遲指定時間後執行
	 * Simulate setTimeout: queue a callback to execute after a specified delay
	 *
	 * 同步 API：直接回傳佇列項目，不回傳 Promise。
	 * Synchronous API: returns the queue item directly (no Promise).
	 *
	 * @see start - 推進虛擬時間並執行到期回呼（優先使用）/ advance + run (preferred)
	 * @see run - 只執行到期回呼（不推進時間）/ run only
	 *
	 * @param callback - 到期時執行的回呼函式 / Callback function to execute on expiry
	 * @param delay - 延遲時間，可為毫秒數或 Duration 物件 / Delay time, can be milliseconds or Duration object
	 * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
	 * @returns 新增的佇列項目 / The newly added queue item
	 */
	setTimeout = (callback: ICallback, delay?: IDurationInput, ...params: any[]): ITimeQueueItem =>
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
	 * @see start - 推進虛擬時間並執行到期回呼（優先使用）/ advance + run (preferred)
	 * @see run - 只執行到期回呼（不推進時間）/ run only
	 *
	 * @param callback - 每次間隔到期時執行的回呼函式 / Callback to execute each interval
	 * @param delay - 間隔時間，可為毫秒數或 Duration 物件 / Interval time, can be milliseconds or Duration object
	 * @param params - 傳遞給回呼函式的額外參數 / Additional parameters passed to callback
	 * @returns 新增的佇列項目 / The newly added queue item
	 */
	setInterval = (callback: ICallback, delay?: IDurationInput, ...params: any[]): ITimeQueueItem =>
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
	 * @see start - 推進虛擬時間並執行到期回呼（優先使用）/ advance + run (preferred)
	 * @see run - 只執行到期回呼（不推進時間）/ run only
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
	 * @see start - 推進虛擬時間並執行到期回呼（優先使用）/ advance + run (preferred)
	 * @see run - 只執行到期回呼（不推進時間）/ run only
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
	 * 優先使用 / Prefer：
	 *   絕大多數情況請用 `start()`（= `advance()` + `run()`）。只有在你刻意「只想移動時間、稍後再 `run()`」
	 *   時，才單獨呼叫 `advance()`。
	 *   Prefer `start()` (= `advance()` + `run()`) in almost all cases; call `advance()` alone only when you
	 *   deliberately want to move time without running yet.
	 *
	 * @param amount - 推進的時間量，可為毫秒數或 Duration 物件 / Amount of time to advance
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	advance = (amount?: IDurationInput): this =>
	{
		/**
		 * 時間跳躍防護：run 執行期間虛擬時間已鎖定，禁止再推進（避免回呼內改變 now 造成不可預期行為）。
		 * Time-jump guard: while a run is in progress the virtual time is locked; advancing is
		 * forbidden (a callback must not mutate `now` mid-run).
		 */
		if (this._activeRun)
		{
			throw new TypeError('advance() is forbidden while a run is in progress: time jumps during run are not allowed.');
		}

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
		/**
		 * 臨時執行陣列（pending）：即時佇列的淺拷貝（元素與即時佇列共享同一參考）。
		 * 本輪 run 完全由它驅動；執行期間不對即時佇列重新排序——週期性項目更新 timing 後
		 * 以二分插入回到此陣列的正確位置，最後才對即時佇列排序一次。
		 * Temporary execution array (pending): a shallow copy of the live queue (elements
		 * share the same references). This run is driven entirely by it; we never re-sort
		 * the live queue mid-run — a periodic item's updated timing is binary-inserted back
		 * into this array at the right spot, and the live queue is sorted just once at the end.
		 */
		const pending: ITimeQueueItem[] = [...this.timer.queue];

		/** 已納入 pending 的項目集合，用於 O(1) 去重，避免 syncPending 式反覆掃描整個佇列。
		 * 使用 WeakSet：不持有已從佇列移除項目的參考，便於垃圾回收。
		 * Set of items already in pending, for O(1) de-dup — avoids the repeated full-queue
		 * scan that the old syncPending did. A WeakSet is used so removed items can be GC'd. */
		const seen = new WeakSet<ITimeQueueItem>();
		for (const q of pending)
		{
			seen.add(q);
		}

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
		 * 回呼內透過 setTimeout / setInterval / setImmediate 追加的計時器，會經由 _schedule
		 * → tryAdd 直接併入本輪 run（若其觸發時間已 <= now）。如此「已到期則本輪執行」的
		 * 行為符合真實 API，且不需要 syncPending 反覆掃描整個佇列。
		 * Timers appended inside a callback reach here via _schedule → tryAdd, merged into
		 * this same run if their fire time is already <= now. This both matches the real API
		 * (due timers fire this run) and avoids the old syncPending repeatedly scanning the
		 * whole queue.
		 */
		const tryAdd = (item: ITimeQueueItem): void =>
		{
			if (seen.has(item))
			{
				return;
			}

			seen.add(item);

			if (now.diff(item.timing) >= 0)
			{
				insert(item);
			}
			// 尚未到期者留在即時佇列，供未來 run；不須併入 pending。
			// Not-yet-due items stay in the live queue for a future run; no need to merge.
		};

		/**
		 * 設為內部活躍 run 狀態：同時作為並發防護、時間跳躍防護，以及回呼追加計時器的入口。
		 * Set as the active run state: also serves as the re-entrancy guard, the time-jump
		 * guard, and the entry point for timers appended inside callbacks.
		 */
		this._activeRun = { now, pending, seen, tryAdd };

		try
		{
			while (pending.length > 0)
			{
				const current = pending[0];

				/** 記錄目前正被執行的項目，供 pause / cancel 使用 / record the item being executed, for pause / cancel */
				this._current = current;

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

			/** 中斷旗標：pause / cancel 在回呼內設定，此處結束本輪 run。
			 * Abort flag: pause / cancel set this inside a callback; end the run here. */
			if (this._abort)
			{
				break;
			}

			/** 記錄結束時間 / Record end time */
			current.ending = dayjs();

			/** 加入已完成快取 / Add to done cache */
			this.cache.done.push(current);

			/** 從臨時陣列移除（無論週期或一次性）/ remove from the temp array (periodic or one-shot) */
			pending.shift();

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
		}
		finally
		{
			/** 無論正常結束或回呼拋錯，都要釋放活躍 run 狀態，避免後續 run 被永久擋住。
			 * Always release the active run state, whether we finish normally or a callback
			 * throws, so future runs are never permanently blocked. */
			this._activeRun = null;
			this._gen = null;
			this._runStartNow = null;
			this._current = null;
			this._abort = false;
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
	 * @see start - 若想「推進時間 + 執行」一次完成，請改用 start() / use start() to advance + run at once
	 *
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	run = (): this =>
	{
		/**
		 * 並發防護：若已有一輪 run 在進行（例如回呼內又呼叫了 run / runAsync / runGenerator），
		 * 則本次呼叫為多餘的 no-op。run 系列皆透過 runGenerator() 取得同一份內部狀態，
		 * 不會雙重處理或競爭佇列。
		 * Re-entrancy guard: if a run is already active, this call is a redundant no-op. The run
		 * family all obtain the SAME internal state via runGenerator(), so there is no double
		 * processing or queue race.
		 */
		if (this._activeRun)
		{
			return this;
		}

		if (this._runStartNow == null)
		{
			this._runStartNow = this.timer.now();
		}

		// _runGenerator() 回傳的快取生成器已內含回呼觸發，故此處僅需迭代（不必再手動呼叫）。
		// The cached generator returned by _runGenerator() already fires callbacks, so we only iterate.
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
	runAsync = async (): Promise<this> =>
	{
		/**
		 * 並發防護：參見 run() 的說明。run 進行中再次呼叫 runAsync 視為多餘 no-op。
		 * Re-entrancy guard: see run(). Calling runAsync while a run is active is a redundant no-op.
		 */
		if (this._activeRun)
		{
			return this;
		}

		if (this._runStartNow == null)
		{
			this._runStartNow = this.timer.now();
		}

		// 非同步需要 await 回呼，故直接使用原始 _runCore() 迭代並自行 await；
		// 不經由會自動同步觸發回呼的快取生成器（_runGenerator / _wrapRunGen）。
		// Async needs to await callbacks, so iterate the raw _runCore() directly and await ourselves;
		// not via the cached generator (_runGenerator / _wrapRunGen) which fires callbacks synchronously.
		this._gen = this._runCore();

		for (const current of this._gen)
		{
			current.count = (current.count ?? 0) + 1;

			await current.callback(current, this, ...(current.params ?? []));
		}

		return this;
	};

	/**
	 * 包裝 _runCore() 的內部生成器：逐一執行到期項目時自動觸發回呼並 yield 已執行項目。
	 * Internal generator wrapping _runCore(): fires each callback automatically and yields the
	 * executed item — this is the original runGenerator behavior.
	 */
	protected *_wrapRunGen(): Generator<ITimeQueueItem, void, void>
	{
		for (const current of this._runCore())
		{
			current.count = (current.count ?? 0) + 1;

			current.callback(current, this, ...(current.params ?? []));

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
	protected _runGenerator(): Generator<ITimeQueueItem, void, void>
	{
		if (this._activeRun)
		{
			return this._gen!;
		}

		if (this._gen == null)
		{
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
	runGenerator(): Generator<ITimeQueueItem, void, void>
	{
		return this._runGenerator();
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
		/**
		 * 並發防護：run 進行中再次呼叫 start 視為多餘 no-op（也不會再去 advance 推進時間）。
		 * Re-entrancy guard: calling start while a run is active is a redundant no-op (and will
		 * not advance time again).
		 */
		if (this._activeRun)
		{
			return this;
		}

		this._runStartNow = this.timer.now();

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
		/**
		 * 並發防護：run 進行中再次呼叫 startAsync 視為多餘 no-op（也不會再去 advance 推進時間）。
		 * Re-entrancy guard: calling startAsync while a run is active is a redundant no-op (and will
		 * not advance time again).
		 */
		if (this._activeRun)
		{
			return this;
		}

		this._runStartNow = this.timer.now();

		this.advance(amount);

		if (this.timer.hasExpires())
		{
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
	 * 使用時機 / When to use：
	 *   僅在 run / start / runAsync / startAsync 執行回呼「期間」有意義；run 之外呼叫為 no-op。
	 *   適用於「想在回呼內中斷本輪、保留剩餘計時器、稍後再從中斷處續跑」的特殊需求。
	 *   Only meaningful WHILE a run is executing callbacks; a no-op otherwise. Use it when you need
	 *   to halt the current run from inside a callback yet keep the remaining timers to resume later.
	 *
	 * 優先使用 / Prefer：
	 *   一般推進與執行請用 `start()` / `run()`；若只是想移除某些計時器，請用 `clear*`（`clear` 主 API）。
	 *   `pause()` 僅供回呼內「中斷並保留進度」之用，不應作為常規流程。
	 *   For ordinary advance+run use `start()` / `run()`; to drop timers use `clear*` (`clear` is a
	 *   main API). `pause()` is only for halting-from-callback while preserving progress.
	 *
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	pause = (): this =>
	{
		if (!this._activeRun)
		{
			return this;
		}

		/** 目前正執行的項目尚未從佇列移除，計算「下一個待執行項目」時須排除它。
		 * The currently executing item is not yet removed from the queue; exclude it when
		 * computing the "next pending item". */
		const cur = this._current;

		this.timer.sort();

		let next: dayjs.Dayjs | null = null;

		for (const q of this.timer.queue)
		{
			if (q !== cur && (next == null || q.timing.diff(next) < 0))
			{
				next = q.timing;
			}
		}

		/** 設定中斷旗標（非 generator.return()，因為回呼可能在自動觸發回呼的生成器內執行）。
		 * Set the abort flag (not generator.return(), since the callback may run inside a
		 * generator that auto-invokes callbacks). */
		this._abort = true;

		/** 目前項目已觸發，從佇列移除以免日後續跑時重複執行 / the current item already fired → remove it to avoid double-firing on resume */
		if (cur)
		{
			this.timer.remove(cur);
		}

		/** 將虛擬時間修正為下一個待執行項目的觸發時間（若無剩餘項目則維持不變）。
		 * Correct the virtual time to the next pending item's fire time (unchanged if none remain). */
		if (next)
		{
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
	 * 使用時機 / When to use：
	 *   僅在 run / start / runAsync / startAsync 執行回呼「期間」有意義；run 之外呼叫為 no-op。
	 *   適用於「想放棄本輪剩餘項目，並把虛擬時間撤銷回 run 開始前」的場景（如測試中斷言失敗後還原）。
	 *   Only meaningful WHILE a run is executing callbacks; a no-op otherwise. Use it to abandon the
	 *   rest of a run and roll the virtual clock back to its pre-run value.
	 *
	 * 優先使用 / Prefer：
	 *   一般推進與執行請用 `start()` / `run()`；若只是想移除計時器，請用 `clear*`（`clear` 主 API）。
	 *   `cancel()` 僅供回呼內「撤銷本次 run 的時間跳躍」，不應作為常規流程。
	 *   For ordinary advance+run use `start()` / `run()`; to drop timers use `clear*`. `cancel()` only
	 *   undoes the run's time jump from within a callback.
	 *
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	cancel = (): this =>
	{
		if (!this._activeRun)
		{
			return this;
		}

		const startNow = this._runStartNow;

		/** 目前正執行的項目已觸發，從佇列移除以免日後續跑時重複執行。
		 * The currently executing item already fired → remove it to avoid double-firing later. */
		const cur = this._current;

		/** 設定中斷旗標（非 generator.return()，因為回呼可能在自動觸發回呼的生成器內執行）。
		 * Set the abort flag (not generator.return(), since the callback may run inside a
		 * generator that auto-invokes callbacks). */
		this._abort = true;

		if (cur)
		{
			this.timer.remove(cur);
		}

		/** 將虛擬時間修正回本次 run 開始前的值（撤銷時間跳躍）。
		 * Correct the virtual time back to the value before this run started (undoing the time jump). */
		if (startNow)
		{
			this.timer.data.fake_now = startNow;
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

/**
 * 取得全域時鐘變體（UnsafeGlobalFakeTimer）的惰性單例。
 * Get the lazy singleton of the global-clock variant (UnsafeGlobalFakeTimer).
 *
 * 使用時機 / When to use：
 *   需要一個「會替換全域 Date.now / performance.now」的 Timer 實例時，用本函式取得共享單例，
 *   避免重複 `new` 出多個互不配對的安裝實例。
 *   When you need a Timer that patches the global clock — use this shared singleton instead of
 *   `new UnsafeGlobalFakeTimer()` repeatedly.
 *
 * 優先使用 / Prefer：
 *   絕大多數場景請用純 `FakeTimer`；只有待測程式依賴真實全域時鐘、且你已準備好配對
 *   `uninstallGlobalClock()` 還原時，才使用本函式。
 *   Prefer the plain `FakeTimer` in almost all cases; reach for this only when driving code that
 *   depends on the real global clock and you are prepared to restore it.
 */
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
	protected _clockInstalled = false;

	/** 原始 Date.now 實作（用於還原）/ Original Date.now implementation (for restore) */
	protected _originalDateNow?: () => number;

	/** 原始 performance.now 實作（用於還原）/ Original performance.now implementation (for restore) */
	protected _originalPerfNow?: () => number;

	/**
	 * 實際執行還原（不重入、不委派），供 installGlobalClock 註冊的全域反安裝函式呼叫。
	 * Performs the actual restore (non-reentrant, non-delegating); invoked by the global
	 * uninstall closure registered during installGlobalClock.
	 */
	protected _doUninstall = (): void =>
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
	 * - 'self'   : 由本實例安裝 / installed by this instance
	 * - 'global' : 已由某實例安裝（可能是其它實例）/ installed globally (possibly by another instance)
	 *
	 * 使用時機 / When to use：
	 *   診斷目前全域時鐘安裝狀態，特別是跨實例安裝、需要確認「是否已有人安裝」時。
	 *   Diagnose the global-clock state, e.g. when multiple instances may install.
	 *
	 * 優先使用 / Prefer：
	 *   這是診斷 / 除錯用途，不影響排程；正常的排程與推進請用 `set*` / `start`，不要用它來控制時間流程。
	 *   Diagnostic only — it does not affect scheduling. Use `set*` / `start` for the actual flow.
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
	 * 使用時機 / When to use：
	 *   僅當待測程式「直接」讀取 `Date.now()` / `performance.now()`（而非接收時間參數）時才需要。
	 *   Only when the code under test reads `Date.now()` / `performance.now()` DIRECTLY.
	 *
	 * 優先使用 / Prefer：
	 *   若待測程式接受時間參數、或使用本庫的 `set*` / `start`，請用純 `FakeTimer`（不污染源端全域狀態）。
	 *   本方法是「不安全」的全域副作用，請在測試結尾（或 `finally`）一律配對 `uninstallGlobalClock()` 還原。
	 *   Prefer the plain `FakeTimer` (no global pollution) whenever the code accepts time params or uses
	 *   this library's `set*` / `start`. This method is an UNSAFE global side-effect — always pair it
	 *   with `uninstallGlobalClock()` at the end (or in `finally`).
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
	 * 使用時機 / When to use：
	 *   在測試結束、或任何 `installGlobalClock()` 之後，還原被替換的全域 `Date.now` / `performance.now`。
	 *   After `installGlobalClock()` (or at test teardown) to restore the patched globals.
	 *
	 * 優先使用 / Prefer：
	 *   每次 `installGlobalClock()` 都「必須」配對呼叫本方法；跨實例亦安全（會委託給真正安裝的實例）。
	 *   Every `installGlobalClock()` MUST be paired with this call; it is cross-instance safe.
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
	Object.defineProperty(defaultFakeTimer, "normalizeDelay", { value: normalizeDelay });

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
