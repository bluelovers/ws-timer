/**
 * 通用工具函式（純函式、無副作用），由 TimeCore / QueueTimer / FakeTimer 共用，避免在各處重複實作。
 * Shared utility functions (pure, side-effect-free) used by TimeCore / QueueTimer / FakeTimer to avoid duplication.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import type { IDurationInput } from './queue';

dayjs.extend(duration);

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
 * 驗證並正規化 delay，對齊標準 Web API 的處理方式（集中複用，不在各呼叫點重複寫死）。
 * Validate and normalize a delay, aligning with the standard Web API (shared/reusable, not inlined).
 *
 * 規則 / Rules:
 * - `undefined` / `null` → `0`（對齊 `setTimeout(func)` 省略 delay）。
 * - 數值非有限（Infinity / -Infinity / NaN）→ 拋 `RangeError`（避免產生失控計時器）。
 * - `dayjs.Duration` 解析後非有限（dayjs.duration(NaN) / dayjs.duration(Infinity)）→ 拋 `RangeError`。
 * - 負數 delay → 箝成 `0`（標準 Web API：timeout < 0 視為 0）。
 *
 * @param delay - 延遲（數值 / Duration / undefined / null）/ delay (number / Duration / undefined / null)
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
