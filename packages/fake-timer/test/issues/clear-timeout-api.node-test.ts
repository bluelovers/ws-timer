/**
 * Regression test: clearTimeout / clearInterval / clearImmediate API.
 *
 * 迴歸測試：clearTimeout / clearInterval / clearImmediate 系列 API。
 *
 * Background / 背景：
 *   The library only exposed set* scheduling and a low-level QueueTimer.remove().
 *   This adds the standard clear* API (clearTimeout / clearInterval / clearImmediate)
 *   as thin wrappers over remove(), accepting the queue item, its unique name, or
 *   its index. They are interchangeable (like the native API), and clearInterval
 *   stops a repeating setInterval because the rescheduled item keeps the same name.
 *
 *   此套件原本只提供 set* 排程與底層的 QueueTimer.remove()。本測試驗證新增的
 *   clear* 系列 API（clearTimeout / clearInterval / clearImmediate），它們是 remove()
 *   的薄封裝，可接受佇列項目、唯一名稱或索引。三者彼此通用（如同原生 API），且
 *   clearInterval 能停止 setInterval 重複，因為重排程項目會保留相同 name。
 *
 * Usage: tsx --test test/issues/clear-timeout-api.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	FakeTimer as Timer,
	defaultFakeTimer as init,
	setTimeout as fakeSetTimeout,
	clearTimeout as fakeClearTimeout,
	clearInterval as fakeClearInterval,
} from '../../src/index';

describe('issue: clearTimeout / clearInterval / clearImmediate API', () =>
{
	it('clearTimeout should cancel a pending setTimeout (callback never fires)', async () =>
	{
		const t = new Timer();
		let called = false;

		const item = await t.setTimeout(() => called = true, 1000);
		t.clearTimeout(item);

		await t.start(1000);

		assert.equal(called, false);
		assert.equal(t.timer.length, 0);
	});

	it('clearInterval should stop a repeating setInterval after it fired once', async () =>
	{
		const t = new Timer();
		let count = 0;

		const item = await t.setInterval(() => count++, 1000);

		await t.start(1000); // fires once, reschedule (same name)
		assert.equal(count, 1);

		t.clearInterval(item); // clears the rescheduled instance

		await t.start(1000);
		await t.start(1000);

		assert.equal(count, 1);
	});

	it('clearImmediate should cancel a pending setImmediate', async () =>
	{
		const t = new Timer();
		let called = false;

		const item = await t.setImmediate(() => called = true);
		t.clearImmediate(item);

		await t.run();

		assert.equal(called, false);
		assert.equal(t.timer.length, 0);
	});

	it('clearTimeout should accept the item name (string)', async () =>
	{
		const t = new Timer();
		let called = false;

		const item = await t.setTimeout(() => called = true, 1000);
		t.clearTimeout(item.name);

		await t.start(1000);

		assert.equal(called, false);
	});

	it('clear after the item already fired should be a no-op returning null', async () =>
	{
		const t = new Timer();

		const item = await t.setImmediate(() => {});
		await t.run();

		const removed = t.clearImmediate(item);

		assert.equal(removed, null);
		assert.equal(t.timer.length, 0);
	});

	it('clear with undefined handle should be a no-op returning null', async () =>
	{
		const t = new Timer();

		assert.equal(t.clearTimeout(undefined), null);
		assert.equal(t.clearInterval(undefined), null);
		assert.equal(t.clearImmediate(undefined), null);
	});

	it('convenience global clearTimeout should cancel the global timer item', async () =>
	{
		let called = false;

		const item = await fakeSetTimeout(() => called = true, 1000);
		fakeClearTimeout(item);

		await init.start(1000);

		assert.equal(called, false);
	});

	it('convenience global clearInterval should stop the global repeating timer', async () =>
	{
		let count = 0;

		const item = await init.setInterval(() => count++, 1000);

		await init.start(1000);
		assert.equal(count, 1);

		fakeClearInterval(item);

		await init.start(1000);
		await init.start(1000);

		assert.equal(count, 1);
	});
});
