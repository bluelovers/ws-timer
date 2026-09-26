/**
 * Regression test: sync vs async API surface.
 *
 * 迴歸測試：同步 / 非同步 API 介面。
 *
 * Background / 背景：
 *   Per the requested design, the fake-async set* family is now genuinely
 *   synchronous (returns the queue item, not a Promise). The only truly
 *   async operations are runAsync() and startAsync(), which await callbacks
 *   so async callbacks are handled correctly. Sync run()/start() fire
 *   callbacks without awaiting. Both sync and async execution share a single
 *   implementation (_runCore) — the only difference is whether the callback
 *   is awaited.
 *
 *   依需求設計，原本「假非同步」的 set* 系列現在是真正同步的（直接回傳佇列項目，
 *   而非 Promise）。唯一真正非同步的是 runAsync() 與 startAsync()，它們會 await
 *   回呼以正確處理 async 回呼。同步的 run()/start() 則不等待回呼直接觸發。兩者共用
 *   單一實作 _runCore —— 差異只在回呼是否被 await。
 *
 * Usage: tsx --test test/issues/sync-async-api.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	FakeTimer as Timer,
	EnumTimerType,
} from '../../src/index';

describe('issue: sync vs async API surface', () =>
{
	it('setTimeout / setInterval / setImmediate return the queue item synchronously (no Promise)', () =>
	{
		const t = new Timer();
		let called = false;

		const item = t.setTimeout(() => called = true, 1000);

		// Not a Promise
		assert.equal(typeof (item as any).then, 'undefined');
		// Is a real queue item
		assert.equal(item.type, EnumTimerType.setTimeout);
		assert.equal(called, false, 'callback must not run until time advances');

		const interval = t.setInterval(() => {}, 500);
		assert.equal(typeof (interval as any).then, 'undefined');
		assert.equal(interval.type, EnumTimerType.setInterval);
		assert.ok(interval.interval != null);

		const immediate = t.setImmediate(() => {});
		assert.equal(typeof (immediate as any).then, 'undefined');
		assert.equal(immediate.type, EnumTimerType.setImmediate);
	});

	it('advance() moves time without running any callback', () =>
	{
		const t = new Timer();
		let called = false;

		t.setTimeout(() => called = true, 1000);
		t.advance(1000);

		assert.equal(called, false, 'advance must not fire callbacks');
		assert.equal(t.timer.hasExpires(), true, 'item should now be expired');
	});

	it('run() is synchronous: returns this and fires callbacks immediately', () =>
	{
		const t = new Timer();
		let called = false;

		t.setTimeout(() => called = true, 1000);
		t.advance(1000);

		const ret = t.run();

		assert.equal(called, true, 'run() must fire the expired callback synchronously');
		assert.equal(ret, t, 'run() returns the instance (chainable)');
		assert.equal(typeof (ret as any).then, 'undefined', 'run() is not a Promise');
		assert.equal(t.timer.length, 0);
		assert.equal(t.cache.done.length, 1);
	});

	it('runAsync() awaits an async callback before continuing', async () =>
	{
		const t = new Timer();
		let order: string[] = [];

		t.setTimeout(async () =>
		{
			await Promise.resolve();
			order.push('callback');
		}, 1000);
		t.advance(1000);

		const ret = t.runAsync();

		assert.ok(ret instanceof Promise, 'runAsync() returns a Promise');
		// Before awaiting, the async callback may not have resolved yet.
		await ret;

		assert.deepEqual(order, ['callback'], 'async callback should complete after await');
		assert.equal(t.timer.length, 0);
	});

	it('start() is synchronous and advances + runs in one call', () =>
	{
		const t = new Timer();
		let called = false;

		t.setTimeout(() => called = true, 1000);

		const ret = t.start(1000);

		assert.equal(called, true, 'start() must advance and run synchronously');
		assert.equal(ret, t, 'start() returns the instance (chainable)');
		assert.equal(typeof (ret as any).then, 'undefined', 'start() is not a Promise');
		assert.equal(t.timer.length, 0);
	});

	it('startAsync() awaits async callbacks', async () =>
	{
		const t = new Timer();
		let order: string[] = [];

		t.setTimeout(async () =>
		{
			await Promise.resolve();
			order.push('callback');
		}, 1000);

		const ret = t.startAsync(1000);

		assert.ok(ret instanceof Promise, 'startAsync() returns a Promise');
		await ret;

		assert.deepEqual(order, ['callback'], 'async callback should complete after startAsync');
		assert.equal(t.timer.length, 0);
	});

	it('start(-1) jumps to the earliest item and runs it synchronously', () =>
	{
		const t = new Timer();
		let early = false;
		let late = false;

		t.setTimeout(() => late = true, 5000); // far in the future
		t.setTimeout(() => early = true, 1000); // earliest

		t.start(-1);

		assert.equal(early, true, 'jump-to-earliest (-1) must run the earliest item');
		assert.equal(late, false, 'the later item must NOT run yet');
		assert.equal(t.timer.length, 1, 'the 5000ms item remains queued');
	});

	it('setInterval is drift-free under both sync and async runs', async () =>
	{
		const make = async (useAsync: boolean) =>
		{
			const t = new Timer();
			const fired: number[] = [];

			t.setInterval((item) =>
			{
				fired.push(t.timer.now().diff(item.virtualTiming));
			}, 1000);

			// Each step must complete before the next, otherwise concurrent runs
			// race on the shared virtual_now clock (same as the native single clock).
			// 每個步驟必須依序完成，否則並行的 run 會競爭共享的 virtual_now 時鐘
			//（與原生單一時鐘相同）。
			const step = () => useAsync ? t.startAsync(1000) : t.start(1000);
			await step();
			await step();
			await step();

			return fired;
		};

		// Each firing should occur exactly at its scheduled timing (drift == 0).
		const syncDrift = await make(false);
		const asyncDrift = await make(true);

		assert.deepEqual(syncDrift, [0, 0, 0], 'sync run keeps interval drift-free');
		assert.deepEqual(asyncDrift, [0, 0, 0], 'async run keeps interval drift-free');
		assert.equal(syncDrift.length, 3);
		assert.equal(asyncDrift.length, 3);
	});

	it('runGenerator() returns a generator (not this) and yields each executed item', () =>
	{
		const t = new Timer();
		const order: string[] = [];

		t.setTimeout(() => order.push('a'), 1000);
		t.setTimeout(() => order.push('b'), 2000);
		t.advance(2000);

		const gen = t.runGenerator();

		// Not the instance, not a Promise — it is an iterable generator.
		assert.notEqual(gen, t, 'runGenerator() must NOT return this');
		assert.equal(typeof (gen as any).then, 'undefined', 'runGenerator() is not a Promise');
		assert.equal(typeof gen[Symbol.iterator], 'function', 'runGenerator() is iterable');

		const items = [...gen];

		assert.deepEqual(order, ['a', 'b'], 'callbacks fire synchronously while iterating');
		assert.equal(items.length, 2, 'generator yields both executed items');
		assert.equal(items[0].type, EnumTimerType.setTimeout);
		assert.equal(t.timer.length, 0, 'queue drained after full iteration');
		assert.equal(t.cache.done.length, 2, 'two items recorded as done');
	});
});
