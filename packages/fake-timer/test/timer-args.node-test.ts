/**
 * 測試 timer 系列對齊 Web/API/Window.setTimeout 的額外引數轉交行為。
 * Tests that the timer family forwards extra args like Web/API/Window.setTimeout.
 *
 * Usage: tsx --test test/timer-args.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FakeTimer as Timer } from '../src/index';

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
});
