/**
 * 通用工具函式（純函式、無副作用），由 TimeCore / QueueTimer / FakeTimer 共用，避免在各處重複實作。
 * Shared utility functions (pure, side-effect-free) used by TimeCore / QueueTimer / FakeTimer to avoid duplication.
 */

import { dayjs, duration } from './dayjs';

import { IDurationInput, ITimeQueueItem } from './types';

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
 * 驗證傳入值是否為有效的日期表示（內部輔助）
 * Validate whether the passed value is a valid date representation (internal helper)
 *
 * 公開不需要直接使用。
 * Not needed publicly.
 *
 * 支援的型別：dayjs.Dayjs、Date、數字（時間戳）、可解析的日期字串
 * Supported types: dayjs.Dayjs, Date, number (timestamp), parseable date string
 *
 * @param who - 待驗證的值 / value to validate
 * @returns 是否為有效日期表示 / whether it is a valid date representation
 */
export function isValidDate(who): boolean
{
	if (dayjs.isDayjs(who) || who instanceof Date)
	{
		return true;
	}
	else if (typeof who == 'number' && dayjs(who).isValid())
	{
		return true;
	}
	else if (Date.parse(who))
	{
		return true;
	}

	return false;
}

/**
 * 將數值或 Duration 轉換為 Duration 型別
 * Converts a number or Duration to a Duration type
 *
 * 若輸入已是 Duration，則直接回傳；否則以數值建立 Duration（單位為毫秒）
 * If input is already a Duration, return it directly; otherwise create a Duration from the number (in milliseconds)
 *
 * @param value - 數值或 Duration / number or Duration
 * @returns Duration 型別 / Duration instance
 */
export function toDuration(value: IDurationInput): duration.Duration
{
	return dayjs.isDuration(value) ? value : dayjs.duration(value);
}

/**
 * 核心正規化：給定已解析出的毫秒數 `ms` 與原始值 `value`，先驗證有限值，再將負數箝成 0。
 * Core normalization: given the resolved millisecond amount `ms` and the original `value`,
 * validate finiteness, then clamp negatives to 0.
 *
 * 數值與 dayjs.Duration 兩條路徑「本質相同」，差別只在「如何取得 ms」：
 * The number and dayjs.Duration paths are *essentially identical*; the only difference is how `ms` is obtained:
 * - 數值（number）：ms 即 value 本身。
 *   number: ms is value itself.
 * - Duration：ms 為 value.asMilliseconds()。
 *   Duration: ms is value.asMilliseconds().
 *
 * - ms 非有限 → 拋 RangeError（兩條路徑共用同一處理，訊息合併）。
 *   Non-finite ms → throw RangeError (shared by both paths, with a merged message).
 * - ms < 0 → 回傳 0；否則回傳原始 value（number 或 Duration 交由呼叫方傳入決定）。
 *   ms < 0 → return 0; otherwise return the original value (number or Duration, as passed by the caller).
 */
function normalizeFiniteDelay(ms: number, value: IDurationInput): IDurationInput
{
	if (!Number.isFinite(ms))
	{
		throw new RangeError(
			`fake-timer: delay must resolve to a finite number of milliseconds; received ${String(value)} ` +
			`(Infinity / -Infinity / NaN / dayjs.duration(NaN) / dayjs.duration(Infinity) are not allowed).`,
		);
	}

	return ms < 0 ? 0 : value;
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
 * 數值與 Duration 兩條路徑委託給 normalizeFiniteDelay 處理，僅傳入各自的 ms 取法。
 * Both the number and Duration paths delegate to normalizeFiniteDelay, passing only their own way of getting ms.
 *
 * @param delay - 延遲（數值 / Duration / undefined / null）/ delay (number / Duration / undefined / null)
 * @returns 有限且有效的 delay（number | duration.Duration）
 */
export function normalizeDelay(delay: IDurationInput | null | undefined): IDurationInput
{
	const value = delay ?? 0;

	if (typeof value === 'number')
	{
		return normalizeFiniteDelay(value, value);
	}

	// value 為 dayjs.Duration：以 asMilliseconds() 解析出的毫秒數做驗證與箝制
	// value is a dayjs.Duration: validate/clamp using its resolved milliseconds
	return normalizeFiniteDelay(value.asMilliseconds(), value);
}

/**
 * 純比較兩個佇列項目的 id（不考慮 timing），是 id 排序的唯一邏輯來源。
 * Pure comparison of two queue items' ids (ignoring timing); the single source of truth for id ordering.
 *
 * 回傳值遵循比較子慣例：a.id 較小回傳 -1、相等回傳 0、a.id 較大回傳 1（即 id 升冪）。
 * Returns a comparator-style value: -1 if a.id is smaller, 0 if equal, 1 if larger (ascending id).
 *
 * id 為可選（undefined 視為 0），與佇列其他地方一致。
 * id is optional (undefined treated as 0), consistent with the rest of the queue.
 *
 * 被以下邏輯共用，避免 id 排序規則散落在多處：
 * Shared by the following so the id rule isn't duplicated:
 * - queueSortByTimingThenIdDesc / queueSortByTimingThenIdAsc（取正/負決定升降冪）
 * - index.ts 內部 pending 的二分插入（判斷 m 是否應排在 item 之前）
 */
export function compareQueueItemIdAsc(a: ITimeQueueItem, b: ITimeQueueItem): number
{
	const ai = a.id ?? 0;
	const bi = b.id ?? 0;

	return ai < bi ? -1 : (ai > bi ? 1 : 0);
}

/**
 * 內部排序比較子：先比 timing（升冪），再比 id（降冪，id 大者排前面）。
 * Internal sort comparator: timing first (ascending), then id (descending, larger id first).
 *
 * 公開 API 不需要直接使用；內部用於維持佇列依 (timing 升冪, id 降冪) 有序。
 * Not needed by the public API; used internally to keep the queue ordered by (timing asc, id desc).
 *
 * 比較子必須回傳負數 / 0 / 正數，才能讓 Array.sort 正確重排：
 * The comparator must return negative / 0 / positive so Array.sort reorders correctly:
 * - 先比較 timing，較早觸發者在前（diff 為負表示 a 較早 → 回傳負數）。
 *   Compare timing first; earlier fire time comes first (negative diff means a is earlier → return negative).
 * - timing 相同時，id 大者排前面：取 compareQueueItemIdAsc 的相反值（即 id 降冪）。
 *   When timing equal, larger id comes first: negate compareQueueItemIdAsc (i.e. descending id).
 */
export function queueSortByTimingThenIdDesc(a: ITimeQueueItem, b: ITimeQueueItem): number
{
	// 先比 timing：較早觸發者在前（升冪）
	// Compare timing first: earlier fire time comes first (ascending)
	const d = a.virtualTiming.diff(b.virtualTiming);
	if (d !== 0)
	{
		return d;
	}

	// timing 相同 → id 大者排前面（降冪）：取 id 升冪比較的相反
	// Same timing → larger id comes first (descending): negate the ascending id comparison
	return -compareQueueItemIdAsc(a, b);
}

/**
 * 內部排序比較子：先比 timing（升冪），再比 id（升冪，id 小者排前面）。
 * Internal sort comparator: timing first (ascending), then id (ascending, smaller id first).
 *
 * 公開 API 不需要直接使用；與 queueSortByTimingThenIdDesc 唯一差別在 id 相等時的排序方向相反（取正/負）。
 * Not needed by the public API; identical to queueSortByTimingThenIdDesc except the id tie-break sign is reversed.
 *
 * - timing 相同時，id 小者排前面：直接套用 compareQueueItemIdAsc（id 升冪）。
 *   When timing equal, smaller id comes first: use compareQueueItemIdAsc directly (ascending id).
 */
export function queueSortByTimingThenIdAsc(a: ITimeQueueItem, b: ITimeQueueItem): number
{
	// 先比 timing：較早觸發者在前（升冪）
	// Compare timing first: earlier fire time comes first (ascending)
	const d = a.virtualTiming.diff(b.virtualTiming);
	if (d !== 0)
	{
		return d;
	}

	// timing 相同 → id 小者排前面（升冪）
	// Same timing → smaller id comes first (ascending)
	return compareQueueItemIdAsc(a, b);
}
