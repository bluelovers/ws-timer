/**
 * 測試 timer 系列對齊 Web/API/Window.setTimeout 的額外引數轉交行為。
 * Tests that the timer family forwards extra args like Web/API/Window.setTimeout.
 *
 * Usage: tsx --test test/timer-args.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import duration, { Duration } from 'dayjs/plugin/duration';
import { FakeTimer as Timer, normalizeDelay } from '../src/index';

dayjs.extend(duration);

describe('Timer args — Web/API/Window.setTimeout compatibility', () =>
{
	it('setTimeout(func) with no delay defaults to 0ms and fires', () =>
	{
		const t = new Timer();
		let fired = false;

		t.setTimeout(() =>
		{
			fired = true;
		});

		t.start(0);

		assert.equal(fired, true);
	});

	it('forwards extra args after delay to the callback (p1, p2, p3)', () =>
	{
		const t = new Timer();
		const received: any[] = [];

		t.setTimeout((_current, _self, a, b, c) =>
		{
			received.push(a, b, c);
		}, 100, 'x', 42, true);

		t.start(100);

		assert.deepEqual(received, ['x', 42, true]);
	});

	it('forwards nothing when no extra args are given', () =>
	{
		const t = new Timer();
		let count = 0;

		t.setTimeout((_current, _self) =>
		{
			count++;
		}, 50);

		t.start(50);

		assert.equal(count, 1);
	});

	it('setInterval forwards the same args on every tick', () =>
	{
		const t = new Timer();
		const calls: any[] = [];

		t.setInterval((_current, _self, tag) =>
		{
			calls.push(tag);
		}, 50, 'tick');

		t.start(200); // 觸發於 50/100/150/200 → 共 4 次

		assert.deepEqual(calls, ['tick', 'tick', 'tick', 'tick']);
	});

	it('setImmediate forwards extra args', () =>
	{
		const t = new Timer();
		const received: any[] = [];

		t.setImmediate((_current, _self, a, b) =>
		{
			received.push(a, b);
		}, 'p1', 'p2');

		t.start(10);

		assert.deepEqual(received, ['p1', 'p2']);
	});

	it('requestAnimationFrame forwards extra args', () =>
	{
		const t = new Timer();
		const received: any[] = [];

		t.requestAnimationFrame((_current, _self, frame) =>
		{
			received.push(frame);
		}, 'frame-data');

		t.start(1000);

		assert.deepEqual(received, ['frame-data']);
	});

	it('params are forwarded through runAsync as well', async () =>
	{
		const t = new Timer();
		const received: any[] = [];

		t.setTimeout((_current, _self, a) =>
		{
			received.push(a);
		}, 100, 'async');

		await t.startAsync(100);

		assert.deepEqual(received, ['async']);
	});

	it('throws RangeError on infinite delay (Infinity)', () =>
	{
		const t = new Timer();
		assert.throws(() => t.setTimeout(() => {}, Infinity), RangeError);
	});

	it('throws RangeError on negative-infinity delay', () =>
	{
		const t = new Timer();
		assert.throws(() => t.setTimeout(() => {}, -Infinity), RangeError);
	});

	it('throws RangeError on NaN delay', () =>
	{
		const t = new Timer();
		assert.throws(() => t.setTimeout(() => {}, NaN), RangeError);
	});

	it('throws RangeError on infinite delay for setInterval too', () =>
	{
		const t = new Timer();
		assert.throws(() => t.setInterval(() => {}, Infinity), RangeError);
	});

	it('still accepts no-delay / finite / Duration delays', () =>
	{
		const t = new Timer();
		let fired = 0;

		t.setTimeout(() => { fired++; });                    // undefined → 0
		t.setTimeout(() => { fired++; }, 100);                // finite number
		t.setTimeout(() => { fired++; }, dayjs.duration(100)); // Duration

		t.start(100);

		assert.equal(fired, 3);
	});

	it('throws RangeError on invalid Duration (dayjs.duration(NaN))', () =>
	{
		const t = new Timer();
		assert.throws(() => t.setTimeout(() => {}, dayjs.duration(NaN)), RangeError);
	});

	it('throws RangeError on invalid Duration (dayjs.duration(Infinity))', () =>
	{
		const t = new Timer();
		assert.throws(() => t.setTimeout(() => {}, dayjs.duration(Infinity)), RangeError);
	});

	it('negative delay still fires immediately (standard-aligned, not rejected)', () =>
	{
		const t = new Timer();
		let fired = 0;

		t.setTimeout(() => { fired++; }, -5); // 標準 API 把負數視為 0 → 立即觸發

		t.start(0);

		assert.equal(fired, 1);
	});

	it('callback can read registration time (current.virtualAdded) and elapsed delay from start', () =>
	{
		const t = new Timer();
		const infos: any[] = [];
		const registeredAt = t.timer.now().valueOf(); // 排程當下的虛擬時間

		t.setTimeout((current, self) => {
			infos.push({
				virtualAdded: current.virtualAdded?.valueOf(),
				elapsed: self.timer.now().diff(self.timer.data.virtual_init),
			});
		}, 250);

		t.start(250);

		assert.equal(infos.length, 1);
		assert.equal(infos[0].virtualAdded, registeredAt); // 註冊時間 = 排程當下虛擬時間
		assert.equal(infos[0].elapsed, 250);        // 從起始時間過了 250ms（虛擬 delay）
	});

	it('setInterval callback can read current.count (fire count)', () =>
	{
		const t = new Timer();
		const counts: number[] = [];

		t.setInterval((current) => {
			counts.push(current.count ?? -1);
		}, 50);

		t.start(200); // 預期在 50/100/150/200 觸發 → 4 次

		assert.deepEqual(counts, [1, 2, 3, 4]);
	});
});

describe('normalizeDelay (shared delay validation)', () =>
{
	it('undefined → 0', () =>
	{
		assert.equal(normalizeDelay(undefined), 0);
	});

	it('null → 0', () =>
	{
		assert.equal(normalizeDelay(null), 0);
	});

	it('passes a finite number through unchanged', () =>
	{
		assert.equal(normalizeDelay(100), 100);
	});

	it('clamps a negative number to 0 (standard Web API)', () =>
	{
		assert.equal(normalizeDelay(-5), 0);
	});

	it('throws RangeError on Infinity', () =>
	{
		assert.throws(() => normalizeDelay(Infinity), RangeError);
	});

	it('throws RangeError on NaN', () =>
	{
		assert.throws(() => normalizeDelay(NaN), RangeError);
	});

	it('passes a valid Duration through unchanged', () =>
	{
		assert.equal((normalizeDelay(dayjs.duration(100)) as Duration).asMilliseconds(), 100);
	});

	it('clamps a negative Duration to 0 (standard Web API)', () =>
	{
		assert.equal(normalizeDelay(dayjs.duration(-5)), 0);
	});

	it('throws RangeError on dayjs.duration(NaN)', () =>
	{
		assert.throws(() => normalizeDelay(dayjs.duration(NaN)), RangeError);
	});

	it('throws RangeError on dayjs.duration(Infinity)', () =>
	{
		assert.throws(() => normalizeDelay(dayjs.duration(Infinity)), RangeError);
	});
});

describe('initTime (public accessor for the initial virtual clock)', () =>
{
	it('exposes the initial virtual time as a dayjs, equal to underlying timer.data.virtual_init', () =>
	{
		const t = new Timer();

		assert.ok(dayjs.isDayjs(t.initTime));
		assert.equal(t.initTime.valueOf(), (t.timer.data.virtual_init as dayjs.Dayjs).valueOf());
	});

	it('initTime equals now() before any time advance', () =>
	{
		const t = new Timer();

		assert.equal(t.initTime.valueOf(), t.timer.now().valueOf());
	});

	it('initTime stays fixed while the clock advances', () =>
	{
		const t = new Timer();
		const init = t.initTime.valueOf();

		t.start(1000);
		t.start(500);

		assert.equal(t.initTime.valueOf(), init);
		assert.equal(t.timer.now().valueOf(), init + 1500);
	});
});
