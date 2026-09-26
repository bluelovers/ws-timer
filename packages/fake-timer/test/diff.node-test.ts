/**
 * Node.js native test for fake-timer `diff()` logic coverage
 *
 * 本檔案專門檢查所有使用到 diff( 的內部邏輯是否符合預期。
 * This file specifically checks whether all internal logic that uses diff( behaves as expected.
 *
 * 涵蓋的 diff( 使用位置 / Covered diff( usages:
 *   - queue.ts  hasExpires()            : now().diff(cache.min)
 *   - queue.ts  queueSortCallback       : a.virtualTiming.diff(b.virtualTiming)
 *   - queue.ts  queueSortCallback2      : a.virtualTiming.diff(b.virtualTiming)
 *   - index.ts run()                    : now.diff(current.virtualTiming)
 *
 * Usage: tsx --test test/diff.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dayjs } from '../src/dayjs';

import { FakeTimer as Timer } from '../src/index';
import { QueueTimer, queueSortCallback, queueSortCallback2 } from '../src/queue';
import { ITimeQueueItem } from '../src/queue';

/**
 * 建立一個帶有 timing 與 id 的佇列項目
 * Build a queue item with timing and id
 */
function makeItem(virtualTiming: dayjs.Dayjs, id: number): ITimeQueueItem
{
	return {
		id,
		name: `item-${id}`,
		virtualTiming,
		callback: () => {},
	};
}

describe('diff() usage: hasExpires()', () =>
{
	it('should return true when now() is past cache.min (expired)', () =>
	{
		const q = QueueTimer.new();

		// 加入一個已經過期的項目（timing 早於 now）
		// Add an already-expired item (timing earlier than now)
		q.add({ callback: () => {}, virtualTiming: q.now().add(-1000) });
		q.sort();

		// now().diff(cache.min) >= 0 → 已到期
		// now().diff(cache.min) >= 0 → expired
		assert.equal(q.now().diff(q.cache.min) >= 0, true);
		assert.equal(q.hasExpires(), true);
	});

	it('should return false when now() is before cache.min (future)', () =>
	{
		const q = QueueTimer.new();

		// 加入一個未來才會觸發的項目
		// Add an item that triggers in the future
		q.add({ callback: () => {}, virtualTiming: q.now().add(99999) });
		q.sort();

		// now().diff(cache.min) < 0 → 尚未到期
		// now().diff(cache.min) < 0 → not yet expired
		assert.equal(q.now().diff(q.cache.min) < 0, true);
		assert.equal(q.hasExpires(), false);
	});

	it('should return true when now() equals cache.min (boundary)', () =>
	{
		const q = QueueTimer.new();

		// timing 與 now() 完全相同
		// timing exactly equals now()
		const now = q.now();
		q.add({ callback: () => {}, virtualTiming: now });
		q.sort();

		// diff == 0 仍視為到期（>= 0）
		// diff == 0 is still treated as expired (>= 0)
		assert.equal(q.now().diff(q.cache.min), 0);
		assert.equal(q.hasExpires(), true);
	});

	it('should reflect diff() >= 0 semantics after time advances', () =>
	{
		const q = QueueTimer.new();

		q.add({ callback: () => {}, virtualTiming: q.now().add(5000) });
		q.sort();
		assert.equal(q.hasExpires(), false);

		// 推進時間超過 cache.min
		// Advance time past cache.min
		q.update(5000);

		assert.equal(q.now().diff(q.cache.min) >= 0, true);
		assert.equal(q.hasExpires(), true);
	});
});

describe('diff() usage: queueSortCallback()', () =>
{
	it('should return 0 and prefer larger id when timing are equal', () =>
	{
		const base = dayjs();
		const a = makeItem(base, 5);
		const b = makeItem(base, 3);

		// timing 相同 → diff == 0
		// same timing → diff == 0
		assert.equal(a.virtualTiming.diff(b.virtualTiming), 0);

		// a.id(5) > b.id(3) → a 排在前面（返回 true）
		// a.id(5) > b.id(3) → a comes first (returns true)
		assert.equal(queueSortCallback(a, b), true);

		// 反過來：b 在前則回傳 false
		// reversed: b first returns false
		assert.equal(queueSortCallback(b, a), false);
	});

	it('should return numeric diff when timing differ (earlier first)', () =>
	{
		const t1 = dayjs();
		const t2 = t1.add(1000);

		const a = makeItem(t1, 1); // 較早 / earlier
		const b = makeItem(t2, 2); // 較晚 / later

		// a.virtualTiming < b.virtualTiming → diff 為負數 → a 排前面
		// a.virtualTiming < b.virtualTiming → negative diff → a comes first
		const d = a.virtualTiming.diff(b.virtualTiming);
		assert.ok(d < 0);

		// queueSortCallback 回傳 diff 值本身（負數 < 0 → 升冪排序）
		// queueSortCallback returns the diff value itself (negative < 0 → ascending sort)
		assert.equal(queueSortCallback(a, b), d);
		assert.ok(queueSortCallback(a, b) < 0);
	});

	it('should return positive diff when a.virtualTiming is later than b.virtualTiming', () =>
	{
		const t1 = dayjs();
		const t2 = t1.add(1000);

		const a = makeItem(t2, 1); // 較晚 / later
		const b = makeItem(t1, 2); // 較早 / earlier

		const d = a.virtualTiming.diff(b.virtualTiming);
		assert.ok(d > 0);

		assert.equal(queueSortCallback(a, b), d);
		assert.ok(queueSortCallback(a, b) > 0);
	});
});

describe('diff() usage: queueSortCallback2()', () =>
{
	it('should return 0 and prefer smaller id when timing are equal', () =>
	{
		const base = dayjs();
		const a = makeItem(base, 3);
		const b = makeItem(base, 5);

		// timing 相同 → diff == 0
		// same timing → diff == 0
		assert.equal(a.virtualTiming.diff(b.virtualTiming), 0);

		// a.id(3) < b.id(5) → a 排在前面（返回 true）
		// a.id(3) < b.id(5) → a comes first (returns true)
		assert.equal(queueSortCallback2(a, b), true);

		// 反過來：b(id=5) > a(id=3) → 回傳 false
		// reversed: b(id=5) > a(id=3) → returns false
		assert.equal(queueSortCallback2(b, a), false);
	});

	it('should behave identically to queueSortCallback on timing difference', () =>
	{
		const t1 = dayjs();
		const t2 = t1.add(1000);

		const early = makeItem(t1, 1);
		const late = makeItem(t2, 2);

		// 兩者對於 timing 差異的排序結果一致
		// Both agree on ordering when timing differ
		assert.equal(queueSortCallback2(early, late), queueSortCallback(early, late));
		assert.ok(queueSortCallback2(early, late) < 0);
		assert.ok(queueSortCallback2(late, early) > 0);
	});
});

describe('diff() usage: run() expiry gate', () =>
{
	it('should execute callback when now.diff(timing) >= 0', async () =>
	{
		const t = new Timer();
		let called = false;

		// setImmediate 的 timing 即為 now()，diff == 0 → 視為到期
		// setImmediate timing equals now(), diff == 0 → treated as expired
		await t.setImmediate(() =>
		{
			called = true;
		});

		await t.run();

		// run() 內部用 now.diff(current.virtualTiming) >= 0 決定是否執行
		// run() uses now.diff(current.virtualTiming) >= 0 internally to decide execution
		assert.equal(called, true);
		assert.equal(t.cache.done.length, 1);
		assert.equal(t.timer.now().diff(t.cache.done[0].virtualTiming) >= 0, true);
	});

	it('should skip callback when now.diff(timing) < 0 (future)', async () =>
	{
		const t = new Timer();
		let called = false;

		const item = await t.setTimeout(() =>
		{
			called = true;
		}, 999999);

		// 尚未推進時間 → now.diff(timing) < 0 → 不應執行
		// Time not advanced → now.diff(timing) < 0 → should not execute
		assert.equal(t.timer.now().diff(item.virtualTiming) < 0, true);

		await t.run();

		assert.equal(called, false);
		assert.equal(t.timer.length, 1);
	});

	it('should run only expired items and stop at first future one', async () =>
	{
		const t = new Timer();

		const calls: number[] = [];

		// 0ms：到期 / expires at 0ms
		await t.setImmediate(() => calls.push(0));
		// 1000ms：到期 / expires at 1000ms
		await t.setTimeout(() => calls.push(1), 1000);
		// 999999ms：未到期 / not expired
		await t.setTimeout(() => calls.push(2), 999999);

		// 推進到 1000ms，前兩個到期，最後一個仍為未來
		// Advance to 1000ms: first two expire, last is still future
		await t.start(1000);

		assert.deepEqual(calls, [0, 1]);
		assert.equal(t.timer.length, 1);
	});
});
