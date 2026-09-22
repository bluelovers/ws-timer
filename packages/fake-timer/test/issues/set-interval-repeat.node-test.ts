/**
 * Regression test: setInterval must repeat periodically (real repetition).
 *
 * 迴歸測試：setInterval 必須真正週期性重複觸發。
 *
 * Background / 背景：
 *   Previously run() removed every fired item permanently, so setInterval behaved
 *   exactly like setTimeout (fired once). Now run() reschedules items of
 *   `type: 'setInterval'` at `timing + interval`, preserving the same `name`/`id`
 *   so clearInterval (remove by name) still works, and stops cleanly if the
 *   callback removes itself.
 *
 *   舊版 run() 會永久移除所有已執行項目，使 setInterval 等同 setTimeout（只觸發一次）。
 *   現在 run() 會把 `type: 'setInterval'` 的項目以 `timing + interval` 重新排程，
 *   並保留原 name/id（clearInterval / remove 仍可有效停止），且若回呼內自行移除則不再重排程。
 *
 * Usage: tsx --test test/issues/set-interval-repeat.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FakeTimer as Timer } from '../../src/index';

describe('issue: setInterval must repeat periodically', () =>
{
	it('should fire repeatedly across multiple start() calls', async () =>
	{
		const t = new Timer();
		let count = 0;

		await t.setInterval(() => count++, 1000);

		await t.start(1000); // fires at 1000, reschedule to 2000
		await t.start(1000); // fires at 2000, reschedule to 3000
		await t.start(1000); // fires at 3000, reschedule to 4000

		assert.equal(count, 3);
	});

	it('should keep firing on further advances (no early stop)', async () =>
	{
		const t = new Timer();
		let count = 0;

		await t.setInterval(() => count++, 500);

		for (let i = 0; i < 10; i++)
		{
			await t.start(500);
		}

		assert.equal(count, 10);
	});

	it('should NOT repeat for setTimeout (one-shot)', async () =>
	{
		const t = new Timer();
		let count = 0;

		await t.setTimeout(() => count++, 1000);

		await t.start(1000);
		await t.start(1000);
		await t.start(1000);

		assert.equal(count, 1);
	});

	it('should reschedule at the correct absolute time (drift-free)', async () =>
	{
		const t = new Timer();
		const firedAt: number[] = [];

		await t.setInterval((current) =>
		{
			firedAt.push(t.timer.now().valueOf());
		}, 1000);

		await t.start(1000); // 1000
		await t.start(1000); // 2000
		await t.start(1000); // 3000

		// 每次都應在間隔邊界觸發（而非相對於上一次執行結束時間）
		// Each fire should land on the interval boundary (not relative to callback end)
		assert.equal(firedAt.length, 3);

		const diffs = firedAt.map((v, i) => (i === 0 ? v : v - firedAt[i - 1]));

		// 間隔應一致為 1000ms
		// Intervals should be consistently 1000ms
		for (let i = 1; i < diffs.length; i++)
		{
			assert.equal(diffs[i], 1000);
		}
	});

	it('should stop repeating when cleared by name after firing', async () =>
	{
		const t = new Timer();
		let count = 0;

		const item = await t.setInterval(() => count++, 1000);

		await t.start(1000); // fires once, reschedule (same name)
		assert.equal(count, 1);

		await t.timer.remove(item.name); // clearInterval

		await t.start(1000);
		await t.start(1000);

		assert.equal(count, 1);
	});

	it('should stop repeating when the callback clears itself', async () =>
	{
		const t = new Timer();
		let count = 0;

		await t.setInterval((current) =>
		{
			count++;
			// 在回呼內自行清除（等同 clearInterval）
			// Clear itself inside the callback (equivalent to clearInterval)
			t.timer.remove(current.name);
		}, 1000);

		await t.start(1000); // fires once, callback removes itself -> no reschedule
		await t.start(1000); // nothing fires

		assert.equal(count, 1);
	});
});
