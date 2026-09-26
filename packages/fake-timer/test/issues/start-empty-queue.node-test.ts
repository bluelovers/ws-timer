/**
 * Regression test: start(-1) on an empty queue must not corrupt virtual_now.
 *
 * 迴歸測試：在空佇列上呼叫 start(-1) 不得破壞 virtual_now。
 *
 * Background / 背景：
 *   start(amount) treats any negative amount as "jump to the earliest queued
 *   time" by assigning `amount = this.timer.cache.min`. When the queue is empty,
 *   `cache.min` is `null`, so `update(null)` is called. Inside update(), `null`
 *   has `typeof === 'object'`, which takes the branch `dayjs(amount)` and turns
 *   `virtual_now` into an INVALID date.
 *
 *   start(amount) 把任何負數量解讀為「跳轉到最早佇列時間」，故賦值
 *   `amount = this.timer.cache.min`。當佇列為空時 cache.min 為 null，導致呼叫
 *   update(null)。在 update() 中 null 的 typeof 為 'object'，會走到 `dayjs(null)`
 *   分支，使 virtual_now 變成「無效日期」。
 *
 * Usage: tsx --test test/issues/start-empty-queue.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FakeTimer as Timer } from '../../src/index';

describe('issue: start(-1) on empty queue must not corrupt virtual_now', () =>
{
	it('should keep virtual_now valid after start(-1) on empty queue', async () =>
	{
		const t = new Timer();
		const before = t.timer.now();

		assert.ok(before.isValid(), 'precondition: initial virtual_now is valid');

		await t.start(-1);

		// virtual_now 不應變成無效日期
		// virtual_now must not become an invalid date
		assert.ok(t.timer.now().isValid(), 'virtual_now is still valid after start(-1) on empty queue');
		// 空佇列無最早時間可跳轉，時間應維持不變（或至少仍有效）
		// Empty queue has nothing to jump to; time should stay valid/unchanged
		assert.equal(t.timer.now().valueOf(), before.valueOf());
	});

	it('should keep virtual_now valid after start() with any negative amount on empty queue', async () =>
	{
		const t = new Timer();

		await t.start(-5);
		await t.start(-99999);

		assert.ok(t.timer.now().isValid());
	});

	it('should still work normally on a non-empty queue (no regression)', async () =>
	{
		const t = new Timer();
		let called = false;

		await t.setTimeout(() =>
		{
			called = true;
		}, 1000);

		// 負數仍應跳轉到最早項目並執行
		// Negative amount should still jump to earliest item and fire it
		await t.start(-1);

		assert.ok(t.timer.now().isValid());
		assert.equal(called, true);
	});
});
