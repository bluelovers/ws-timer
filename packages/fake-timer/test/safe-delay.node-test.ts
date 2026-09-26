/**
 * 測試 FakeTimer 內部改用 normalizeDelaySafe 的行為：
 * - 未設定 safeMinDelay 時，預設下限 1/10 秒（100ms）。
 * - 可透過 new Timer({ safeMinDelay }) 設定自訂下限（必須 > 0，有限數值）。
 * - setImmediate 仍為「立即觸發」（delay 0），不受安全下限影響。
 *
 * Tests that FakeTimer internally uses normalizeDelaySafe:
 * - default floor is 1/10 s (100ms) when safeMinDelay is not set.
 * - a custom floor can be set via new Timer({ safeMinDelay }) (must be a finite number > 0).
 * - setImmediate remains "fire immediately" (delay 0), exempt from the safe floor.
 *
 * Usage: tsx --test test/safe-delay.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dayjs } from '../src/dayjs';

import { FakeTimer as Timer } from '../src/index';
import { ITimeQueueItem } from '../src/types';

/**
 * 取得佇列項目的 virtualTiming 相對於目前虛擬時間的毫秒數。
 * Get the ms offset of an item's virtualTiming relative to the current virtual time.
 */
function delayOf(t: Timer, item: ITimeQueueItem): number
{
	return item.virtualTiming.diff(t.timer.now());
}

describe('FakeTimer uses normalizeDelaySafe internally', () =>
{
	it('applies the default safe minimum (100ms) to a zero delay', () =>
	{
		const t = new Timer();
		const item = t.setTimeout(() => {}, 0);
		assert.equal(delayOf(t, item), 100);
	});

	it('applies the default safe minimum (100ms) to a negative delay', () =>
	{
		const t = new Timer();
		const item = t.setTimeout(() => {}, -5);
		assert.equal(delayOf(t, item), 100);
	});

	it('applies the default safe minimum (100ms) when delay is omitted', () =>
	{
		const t = new Timer();
		const item = t.setTimeout(() => {});
		assert.equal(delayOf(t, item), 100);
	});

	it('applies the default safe minimum (100ms) to a Duration(0)', () =>
	{
		const t = new Timer();
		const item = t.setTimeout(() => {}, dayjs.duration(0));
		assert.equal(delayOf(t, item), 100);
	});

	it('keeps a positive number delay unchanged', () =>
	{
		const t = new Timer();
		const item = t.setTimeout(() => {}, 50);
		assert.equal(delayOf(t, item), 50);
	});

	it('keeps a positive Duration delay unchanged', () =>
	{
		const t = new Timer();
		const item = t.setTimeout(() => {}, dayjs.duration(200));
		assert.equal(delayOf(t, item), 200);
	});

	it('honors a custom safeMinDelay set via the constructor option', () =>
	{
		const t = new Timer({ safeMinDelay: 250 });
		const item = t.setTimeout(() => {}, 0);
		assert.equal(delayOf(t, item), 250);
	});

	it('throws RangeError when safeMinDelay is not a finite number > 0', () =>
	{
		assert.throws(() => new Timer({ safeMinDelay: 0 }), RangeError);
		assert.throws(() => new Timer({ safeMinDelay: -10 }), RangeError);
		assert.throws(() => new Timer({ safeMinDelay: Infinity }), RangeError);
		assert.throws(() => new Timer({ safeMinDelay: NaN }), RangeError);
	});

	it('setImmediate still fires immediately (delay 0, exempt from the safe floor)', () =>
	{
		const t = new Timer();
		const item = t.setImmediate(() => {});
		assert.equal(delayOf(t, item), 0);
	});
});
