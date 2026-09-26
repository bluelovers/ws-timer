/**
 * Node.js native test for fake-timer
 * Usage: tsx --test test/*.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

import { FakeTimer as Timer, defaultFakeTimer as init, setTimeout as fakeSetTimeout, setImmediate as fakeSetImmediate, EnumTimerType, isValidDate } from '../src/index';
import { QueueTimer } from '../src/queue';
import { TimeCore } from '../src/time';

describe('Time', () =>
{
	it('should create with default data', () =>
	{
		const t = new TimeCore();

		assert.ok(t.data.real_init.isValid());
		assert.ok(t.data.virtual_init.isValid());
		assert.ok(t.data.virtual_now.isValid());
		assert.equal(typeof t.data.id, 'number');
	});

	it('should create with custom date', () =>
	{
		const customDate = new Date('2020-01-01');
		const t = new TimeCore(customDate as any);

		assert.ok(t.data.virtual_init.isValid());
	});

	it('should handle dayjs objects as immutable', () =>
	{
		const t = new TimeCore();
		const original = t.data.virtual_now;
		const mutated = t.data.virtual_now.add(1000);

		// dayjs is immutable: .add() returns new object, original unchanged
		assert.notEqual(mutated.valueOf(), original.valueOf());
		assert.equal(t.data.virtual_now.valueOf(), original.valueOf());
	});

	it('now() should return immutable reference', () =>
	{
		const t = new TimeCore();
		const a = t.now();
		const b = t.now();

		// dayjs is immutable, same reference is safe
		assert.equal(a.valueOf(), b.valueOf());
	});

	it('id() should auto increment', () =>
	{
		const t = new TimeCore();
		const first = t.id();
		const second = t.id();

		assert.equal(first, 0);
		assert.equal(second, 1);
	});

	it('id(true) should not increment', () =>
	{
		const t = new TimeCore();
		const a = t.id(true);
		const b = t.id(true);

		assert.equal(a, 0);
		assert.equal(b, 0);
	});

	it('update() should advance virtual_now by milliseconds', () =>
	{
		const t = new TimeCore();
		const before = t.now();

		t.update(500);
		const after = t.now();

		assert.ok(after.diff(before) >= 500);
	});

	it('update() with unit should advance by that unit', () =>
	{
		const t = new TimeCore();
		const before = t.now();

		t.update(2, 'second');
		const after = t.now();

		assert.ok(after.diff(before) >= 2000);
	});

	it('update() should store old value', () =>
	{
		const t = new TimeCore();
		const before = t.now();

		t.update(100);

		assert.ok(t.data.virtual_old);
		assert.equal(t.data.virtual_old.valueOf(), before.valueOf());
	});

	it('isValidDate should validate various inputs', () =>
	{
		assert.equal(isValidDate(new Date()), true);
		assert.equal(isValidDate(Date.now()), true);
		assert.equal(isValidDate('2020-01-01'), true);
		assert.equal(isValidDate('not-a-date'), false);
		assert.equal(isValidDate(null), false);
	});
});

describe('QueueTimer', () =>
{
	it('should create with empty queue', () =>
	{
		const q = QueueTimer.new();

		assert.equal(q.length, 0);
		assert.deepEqual(q.queue, []);
	});

	it('add() should add item with id, name, timing', () =>
	{
		const q = QueueTimer.new();
		const item = q.add({
			callback: () => {},
			virtualTiming: q.now().add(1000),
		});

		assert.equal(typeof item.id, 'number');
		assert.equal(typeof item.name, 'string');
		assert.ok(item.name.length > 0);
		assert.ok(item.virtualTiming.isValid());
		assert.equal(q.length, 1);
	});

	it('add() with duration timing should convert to absolute time', () =>
	{
		const q = QueueTimer.new();
		const before = q.now();

		const item = q.add({
			callback: () => {},
			virtualTiming: q.now().add(2000),
		});

		assert.ok(item.virtualTiming.diff(before) >= 2000);
	});

	it('sort() should sort queue by timing', () =>
	{
		const q = QueueTimer.new();

		q.add({ callback: () => {}, virtualTiming: q.now().add(2000) });
		q.add({ callback: () => {}, virtualTiming: q.now().add(1000) });

		q.sort();

		assert.ok(q.eq(0).virtualTiming <= q.eq(1).virtualTiming);
	});

	it('eq(-1) should return last item', () =>
	{
		const q = QueueTimer.new();

		q.add({ callback: () => {}, virtualTiming: q.now().add(1000) });
		q.add({ callback: () => {}, virtualTiming: q.now().add(2000) });

		const last = q.eq(-1);

		assert.equal(last['index'], 1);
	});

	it('remove by index should remove and return item', () =>
	{
		const q = QueueTimer.new();

		q.add({ callback: () => {}, virtualTiming: q.now().add(1000) });
		q.add({ callback: () => {}, virtualTiming: q.now().add(2000) });

		const removed = q.remove(0);

		assert.ok(removed);
		assert.equal(q.length, 1);
	});

	it('remove by name should remove and return item', () =>
	{
		const q = QueueTimer.new();

		const item = q.add({ callback: () => {}, virtualTiming: q.now().add(1000) });
		const removed = q.remove(item.name);

		assert.ok(removed);
		assert.equal(removed.name, item.name);
		assert.equal(q.length, 0);
	});

	it('remove by ITimeQueueItem should remove and return item', () =>
	{
		const q = QueueTimer.new();

		const item = q.add({ callback: () => {}, virtualTiming: q.now().add(1000) });
		const removed = q.remove(item);

		assert.ok(removed);
		assert.equal(q.length, 0);
	});

	it('hasExpires() should return true when timing is past', () =>
	{
		const q = QueueTimer.new();

		q.add({ callback: () => {}, virtualTiming: q.now().add(-1000) });
		q.sort();

		assert.equal(q.hasExpires(), true);
	});

	it('hasExpires() should return false when timing is in future', () =>
	{
		const q = QueueTimer.new();

		q.add({ callback: () => {}, virtualTiming: q.now().add(99999) });
		q.sort();

		assert.equal(q.hasExpires(), false);
	});

	it('should update cache.min and cache.max correctly', () =>
	{
		const q = QueueTimer.new();

		q.add({ callback: () => {}, virtualTiming: q.now().add(1000) });
		q.add({ callback: () => {}, virtualTiming: q.now().add(3000) });
		q.sort();

		assert.ok(q.cache.min);
		assert.ok(q.cache.max);
		assert.ok(q.cache.min <= q.cache.max);
	});
});

describe('Timer', () =>
{
	it('should create via constructor', () =>
	{
		const t = new Timer();

		assert.ok(t.timer);
		assert.ok(t.cache);
		assert.deepEqual(t.cache.done, []);
	});

	it('should be exported as singleton init', () =>
	{
		assert.ok(init);
		assert.ok(init instanceof Timer);
	});

	it('setTimeout should add item to queue', async () =>
	{
		const t = new Timer();

		const item = await t.setTimeout(() => {}, 1000);

		assert.ok(item);
		assert.equal(item['type'], EnumTimerType.setTimeout);
		assert.equal(t.timer.length, 1);
	});

	it('setInterval should add item to queue', async () =>
	{
		const t = new Timer();

		const item = await t.setInterval(() => {}, 500);

		assert.ok(item);
		assert.equal(item['type'], EnumTimerType.setInterval);
		assert.equal(t.timer.length, 1);
	});

	it('setTimeout with duration.Duration should add item to queue', async () =>
	{
		const t = new Timer();

		const item = await t.setTimeout(() => {}, dayjs.duration(2000));

		assert.ok(item);
		assert.equal(item['type'], EnumTimerType.setTimeout);
		assert.equal(t.timer.length, 1);
		assert.ok(item.virtualTiming.isValid());
	});

	it('setInterval with duration.Duration should add item to queue', async () =>
	{
		const t = new Timer();

		const item = await t.setInterval(() => {}, dayjs.duration(3000));

		assert.ok(item);
		assert.equal(item['type'], EnumTimerType.setInterval);
		assert.equal(t.timer.length, 1);
		assert.ok(item.virtualTiming.isValid());
	});

	it('setTimeout with duration.Duration should convert to absolute time', async () =>
	{
		const t = new Timer();
		const before = t.timer.now();

		const item = await t.setTimeout(() => {}, dayjs.duration(5000));

		assert.ok(item.virtualTiming.diff(before) >= 4500);
	});

	it('setImmediate should add item with zero timing', async () =>
	{
		const t = new Timer();

		const item = await t.setImmediate(() => {});

		assert.ok(item);
		assert.equal(item['type'], EnumTimerType.setImmediate);
		assert.equal(t.timer.length, 1);
	});

	it('run() should execute expired callbacks', async () =>
	{
		const t = new Timer();
		let called = false;

		await t.setImmediate(() =>
		{
			called = true;
		});

		await t.run();

		assert.equal(called, true);
		assert.equal(t.cache.done.length, 1);
	});

	it('run() should pass correct arguments to callback', async () =>
	{
		const t = new Timer();
		let receivedArgs: any[] = [];

		await t.setImmediate((current, self) =>
		{
			receivedArgs = [current, self];
		});

		await t.run();

		assert.ok(receivedArgs[0]);
		assert.ok(receivedArgs[1]);
		assert.equal(typeof receivedArgs[0].id, 'number');
	});

	it('start() should advance time and run expired items', async () =>
	{
		const t = new Timer();
		let called = false;

		await t.setTimeout(() =>
		{
			called = true;
		}, 1000);

		await t.start(-1);

		assert.equal(called, true);
	});

	it('start() should not run items not yet expired', async () =>
	{
		const t = new Timer();
		let called = false;

		await t.setTimeout(() =>
		{
			called = true;
		}, 999999);

		await t.start(100);

		assert.equal(called, false);
		assert.equal(t.timer.length, 1);
	});

	it('exported setTimeout should work as convenience function', async () =>
	{
		let called = false;

		await fakeSetTimeout(() =>
		{
			called = true;
		}, 1000);

		await init.start(-1);

		assert.equal(called, true);
	});

	it('exported setImmediate should work as convenience function', async () =>
	{
		let called = false;

		await fakeSetImmediate(() =>
		{
			called = true;
		});

		await init.start(-1);

		assert.equal(called, true);
	});
});
