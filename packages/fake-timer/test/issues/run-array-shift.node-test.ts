/**
 * Regression test: run() must not skip items when removing during iteration.
 *
 * 迴歸測試：run() 在迭代中移除項目時不得跳過任何項目。
 *
 * Background / 背景：
 *   The previous run() used `for (let idx in this.timer.queue)` together with
 *   `this.timer.remove(idx)` (which calls `splice`), causing the underlying array
 *   to shift after each removal while `for...in` advanced to the next string key.
 *   The net effect was that an item immediately following a removed one was skipped
 *   and never executed (even when its `diff == 0` meant it should have fired).
 *
 *   舊版 run() 使用 `for...in` 遍歷，並在每次迭代呼叫 `remove(idx)`（內部用
 *   `splice` 刪除）。移除後陣列向左位移，但 `for...in` 仍推進到下一個「字串鍵名」，
 *   導致被位移補位的下一個項目永遠不被訪問，即使其 diff == 0 應到期執行。
 *
 * Usage: tsx --test test/issues/run-array-shift.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

import { FakeTimer as Timer } from '../../src/index';

describe('issue: run() must not skip items after removing during iteration', () =>
{
	it('should execute every expired item (no skip) when several expire in one run()', async () =>
	{
		const t = new Timer();

		const calls: number[] = [];

		// 三個項目都會在本次 run() 中到期：
		//   - item0: 立即（diff == 0）
		//   - item1: 1000ms（推進後 diff == 0，邊界到期）
		//   - item2: 2000ms（推進後 diff == 0，邊界到期）
		await t.setImmediate(() => calls.push(0));
		await t.setTimeout(() => calls.push(1), 1000);
		await t.setTimeout(() => calls.push(2), 2000);

		// 推進 2000ms，使三個項目全部到期
		// Advance 2000ms so all three items are expired
		await t.start(2000);

		// 關鍵斷言：三個都必須執行，不得因陣列位移而被跳過
		// Key assertion: all three must run, none skipped due to array shift
		assert.deepEqual(calls, [0, 1, 2]);
		assert.equal(t.timer.length, 0);
		assert.equal(t.cache.done.length, 3);
	});

	it('should execute boundary (diff == 0) items that immediately follow another removed item', async () =>
	{
		const t = new Timer();

		const calls: number[] = [];

		// item0 到期，item1 與其同一時刻（diff == 0）緊接在後
		// item0 expires, item1 at the exact same moment (diff == 0) right after
		await t.setImmediate(() => calls.push(0));
		await t.setTimeout(() => calls.push(1), 0);

		await t.start(0);

		// 舊 bug 會因移除 item0 後跳過位移補位的 item1
		// Old bug skipped item1 (which shifted into index 0 after item0 removed)
		assert.deepEqual(calls, [0, 1]);
		assert.equal(t.timer.length, 0);
	});

	it('should preserve execution order by timing (ascending)', async () =>
	{
		const t = new Timer();

		const order: number[] = [];

		await t.setTimeout(() => order.push(30), 3000);
		await t.setTimeout(() => order.push(10), 1000);
		await t.setTimeout(() => order.push(20), 2000);
		await t.setImmediate(() => order.push(0));

		// 推進足夠時間讓全部到期
		// Advance enough so all expire
		await t.start(3000);

		assert.deepEqual(order, [0, 10, 20, 30]);
	});

	it('should stop at the first unexpired item and keep the rest queued', async () =>
	{
		const t = new Timer();

		const calls: number[] = [];

		await t.setImmediate(() => calls.push(0));
		await t.setTimeout(() => calls.push(1), 1000);
		// 遠未到期，應留在佇列中不被執行
		// Far in the future, should remain queued and not executed
		await t.setTimeout(() => calls.push(2), 999999);

		await t.start(1000);

		// 前兩個到期執行，第三個因未到期而停止遍歷
		// First two expire & run; third stops the loop (not yet expired)
		assert.deepEqual(calls, [0, 1]);
		assert.equal(t.timer.length, 1);
	});

	it('should handle a larger batch of consecutive expirations without skipping', async () =>
	{
		const t = new Timer();

		const calls: number[] = [];
		const total = 10;

		for (let i = 0; i < total; i++)
		{
			// 每個項目間隔 100ms，全部小於推進量
			// Each item 100ms apart, all below the advance amount
			await t.setTimeout(() => calls.push(i), i * 100);
		}

		await t.start((total - 1) * 100);

		// 預期收到 0..9 全部，且順序正確
		// Expect to receive all 0..9 in order
		assert.deepEqual(calls, Array.from({ length: total }, (_, i) => i));
		assert.equal(t.timer.length, 0);
		assert.equal(t.cache.done.length, total);
	});
});
