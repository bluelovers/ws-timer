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

	it('out-of-order scheduling (5000,1000,3000,2000) + single large fast-forward runs in ascending timing order', () =>
	{
		const t = new Timer();
		const order: number[] = [];

		// 故意以亂序插入 / inserted deliberately out of order
		t.setTimeout(() => order.push(5000), 5000);
		t.setTimeout(() => order.push(1000), 1000);
		t.setTimeout(() => order.push(3000), 3000);
		t.setTimeout(() => order.push(2000), 2000);

		// 一次性大量快轉（覆蓋所有項目）/ one-time large fast-forward covering all
		t.start(5000);

		// 執行順序由絕對觸發時間 timing 決定，與插入順序無關
		// execution order is decided by absolute timing, NOT insertion order
		assert.deepEqual(order, [1000, 2000, 3000, 5000]);
		assert.equal(t.timer.length, 0);
		assert.equal(t.cache.done.length, 4);
	});

	it('multiple large fast-forwards (5000,4000,3000) still run in ascending timing order', () =>
	{
		const t = new Timer();
		const order: number[] = [];

		t.setTimeout(() => order.push(5000), 5000);
		t.setTimeout(() => order.push(1000), 1000);
		t.setTimeout(() => order.push(3000), 3000);
		t.setTimeout(() => order.push(2000), 2000);

		// 分次快轉：第一跳即涵蓋全部到期項目，後續快轉無可執行項目
		// multiple fast-forwards: the first jump already covers all expired items;
		// later jumps have nothing left to run
		t.advance(5000);
		t.run();
		t.advance(4000);
		t.run();
		t.advance(3000);
		t.run();

		assert.deepEqual(order, [1000, 2000, 3000, 5000]);
		assert.equal(t.timer.length, 0);
	});

	it('mixed setInterval + setTimeout: single large fast-forward replays every interval tick within the window', () =>
	{
		const t = new Timer();
		const order: string[] = [];

		t.setInterval(() => order.push('A'), 1000); // periodic
		t.setTimeout(() => order.push('C'), 1500);  // normal

		// 一次快轉到 3000：A 的 1000/2000/3000 三跳全部在本輪 run 中執行；
		// C 依 timing 在 1500 交錯執行。
		// One jump to 3000: A's ticks at 1000/2000/3000 all fire in THIS run;
		// C interleaves at 1500 by timing.
		t.start(3000);

		assert.deepEqual(order, ['A', 'C', 'A', 'A']);
		// A 已被重新排程到下一跳（4000）並留在佇列中，等待下一次 run
		// A was rescheduled to its next tick (4000) and stays queued for the next run
		assert.equal(t.timer.length, 1);
		assert.equal(t.cache.done.length, 4);
	});

	it('lone setInterval: a single start() covering N periods fires N times', () =>
	{
		const t = new Timer();
		let count = 0;

		t.setInterval(() => count++, 1000);

		// 快轉 3000ms 涵蓋 1000/2000/3000 三個週期 → 應觸發 3 次
		// Fast-forward 3000ms covers 3 periods (1000/2000/3000) → should fire 3 times
		t.start(3000);

		assert.equal(count, 3);
		assert.equal(t.timer.length, 1, 'interval rescheduled to 4000 for the next run');
	});

	it('setInterval with interval 0 must not loop forever (fires once per run)', () =>
	{
		const t = new Timer();
		let count = 0;

		// interval 0（不推進時間）若無防護會在單次 run 中無限迴圈
		// interval 0 (no time advance) would infinite-loop in a single run without the guard
		t.setInterval(() => count++, 0);

		t.start(1000);

		assert.equal(count, 1, 'interval 0 fires exactly once per run, not infinitely');
		assert.equal(t.timer.length, 1, 'still queued for the next run');
	});

	it('mixed setInterval + setTimeout: stepped runs interleave strictly by timing', () =>
	{
		const t = new Timer();
		const order: string[] = [];

		t.setInterval(() => order.push('A'), 1000);
		t.setTimeout(() => order.push('C'), 1500);

		// 分三步快轉，每次 1000：週期與普通計時器純依 timing 交錯
		// Step three times, 1000 each: periodic and normal timers interleave purely by timing
		t.start(1000); // A@1000
		t.start(1000); // C@1500, A@2000
		t.start(1000); // A@3000

		// 交錯結果：A(1000) → C(1500) → A(2000) → A(3000)
		assert.deepEqual(order, ['A', 'C', 'A', 'A']);
		assert.equal(t.timer.length, 1, 'interval rescheduled to 4000');
	});

	it('setInterval and setTimeout at the same timing order by id (insertion), not by type', () =>
	{
		const t = new Timer();
		const order: string[] = [];

		t.setInterval(() => order.push('A'), 1000);
		t.setTimeout(() => order.push('C'), 1000);
		t.setImmediate(() => order.push('D'));

		t.start(1000);

		// D（timing 0）一定最先；A 與 C 同 timing（1000）以 id（插入順序）決定先後，
		// 與「是否為週期性」無關——A 先插入故排在 C 前。
		// D (timing 0) is always first; A and C share timing 1000 and are ordered by id
		// (insertion order), unrelated to whether they are periodic.
		assert.equal(order[0], 'D', 'setImmediate (timing 0) runs first');
		assert.deepEqual(order.slice(1), ['A', 'C'], 'A before C because A was inserted first (id tie-break)');
		assert.equal(t.timer.length, 1, 'interval A rescheduled');
	});
});

describe('issue: mixed one-shot + periodic timers, single large fast-forward', () =>
{
	it('the 9-timer scenario interleaves strictly by timing (with id tie-break), replaying every interval tick', () =>
	{
		const t = new Timer();

		/**
		 * 記錄每一筆執行的 (標籤, 絕對觸發時間)。
		 * Record each execution as (label, absolute timing).
		 *
		 * 回呼會收到 `current`（佇列項目本身）作為第一個參數，故可從
		 * `current.virtualTiming` 取得該次「本應觸發的絕對時間」，而不會被統一的
		 * 虛擬 now 混淆（run 期間 now 固定不動）。
		 * The callback receives `current` (the queue item) as its first arg, so we
		 * read `current.virtualTiming` for the absolute scheduled time — not the fixed
		 * virtual `now`, which stays constant during the run.
		 */
		const order: Array<{ label: string; at: number }> = [];

		/**
		 * 記錄快轉前的基底時間，用來把「絕對觸發時間」還原成「相對於起點的延遲 ms」。
		 * Record the base time before fast-forwarding, so we can turn the absolute
		 * `timing` back into a delay (ms relative to the start).
		 */
		const base = t.timer.now().valueOf();

		const T = (label: string, delay: number) =>
			t.setTimeout((item: any) => order.push({ label, at: item.virtualTiming.valueOf() - base }), delay);
		const I = (label: string, delay: number) =>
			t.setInterval((item: any) => order.push({ label, at: item.virtualTiming.valueOf() - base }), delay);

		// 插入順序即 id 順序（id 自增），同 timing 時依 id 升冪交錯。
		// Insertion order == id order; same timing interleaves by id ascending.
		T('T3000', 3000);
		I('I3000', 3000);
		T('T6000', 6000);
		T('T2000', 2000);
		I('I2000', 2000);
		T('T5000', 5000);
		T('T1000', 1000);
		I('I1000', 1000);
		T('T4000', 4000);

		// 一次快轉覆蓋到 6000：所有一次性與週期性 tick（<=6000）都應在本輪 run 內執行。
		// One fast-forward up to 6000: all one-shots and interval ticks (<=6000) run in this round.
		t.start(6000);

		// 共 17 筆：6 個一次性 + 週期性 tick（I1000×6, I2000×3, I3000×2）= 11。
		// Total 17: 6 one-shots + periodic ticks (I1000×6, I2000×3, I3000×2) = 11.
		assert.equal(order.length, 17, 'all one-shots and every in-window interval tick fired');

		// 執行時間（at）必須嚴格不遞減（依 timing 升冪交錯）。
		// Execution times (at) must be non-decreasing (interleaved by timing ascending).
		const at = order.map((o) => o.at);

		assert.deepEqual(at, [
			1000, 1000,            // @1000: T1000, I1000
			2000, 2000, 2000,      // @2000: T2000, I2000, I1000
			3000, 3000, 3000,      // @3000: T3000, I3000, I1000
			4000, 4000, 4000,      // @4000: I2000, I1000, T4000
			5000, 5000,            // @5000: T5000, I1000
			6000, 6000, 6000, 6000 // @6000: I3000, T6000, I2000, I1000
		]);

		// 標籤序列編碼了 tie-break 順序（同 timing 依插入 id 升冪）。
		// The label sequence encodes the tie-break (same timing ordered by insertion id ascending).
		assert.deepEqual(order.map((o) => o.label), [
			'T1000', 'I1000',
			'T2000', 'I2000', 'I1000',
			'T3000', 'I3000', 'I1000',
			'I2000', 'I1000', 'T4000',
			'T5000', 'I1000',
			'I3000', 'T6000', 'I2000', 'I1000'
		]);

		// 三個週期性計時器已被推進到下個視窗外（7000/8000/9000）並留在佇列。
		// The three intervals were advanced beyond the window (7000/8000/9000) and stay queued.
		assert.equal(t.timer.length, 3, 'intervals rescheduled beyond the window remain queued');
		assert.equal(t.cache.done.length, 17);
	});
});
