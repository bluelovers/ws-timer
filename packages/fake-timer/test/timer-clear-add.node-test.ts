/**
 * Node.js native test for fake-timer
 *
 * 驗證在 setTimeout / setInterval 的回呼中呼叫 clear 系列 API，
 * 以及呼叫 setTimeout / setInterval 來追加新計時器時的行為是否正確。
 *
 * Verify the behavior when clear* APIs are called inside setTimeout /
 * setInterval callbacks, and when setTimeout / setInterval are used inside
 * a callback to append new timers.
 *
 * Usage: tsx --test test/*.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FakeTimer as Timer, EnumTimerType } from '../src/index';

/**
 * 輔助：以固定步長逐步推進虛擬時間（模擬真實事件迴圈的一次 tick）
 * Helper: advance virtual time in fixed steps (simulating one event-loop tick)
 */
function tick(t: Timer, ms: number, times: number): void
{
	for (let i = 0; i < times; i++)
	{
		t.start(ms);
	}
}

describe('clear within setTimeout callback', () =>
{
	it('setTimeout callback calling clearTimeout(current) should be safe and run exactly once', () =>
	{
		const t = new Timer();
		let count = 0;

		t.setTimeout((current) =>
		{
			count++;

			// 一次性計時器自行清除自己（本質為 no-op，但必須安全不拋錯）
			// one-shot clearing itself (effectively a no-op, but must be safe)
			const removed = t.clearTimeout(current);

			assert.ok(removed);
			assert.equal(removed!.id, (current as any).id);
		}, 1000);

		t.start(1000);

		assert.equal(count, 1);
		assert.equal(t.timer.length, 0);
	});

	it('setTimeout callback calling clearAll should cancel future timers (incremental advance)', () =>
	{
		const t = new Timer();
		let a = 0;
		let b = 0;

		t.setTimeout(() =>
		{
			a++;

			// 在回呼中清空整個佇列
			// clear the whole queue from inside the callback
			t.clearAll();
		}, 1000);

		t.setTimeout(() =>
		{
			b++;
		}, 2000);

		// 逐步推進：a 在 t=1000 觸發並清空佇列（b 尚未到期，已從佇列移除）
		// step-by-step: a fires at t=1000 and clears the queue (b not yet expired, removed)
		t.start(1000);

		assert.equal(a, 1);
		assert.equal(b, 0);
		assert.equal(t.timer.length, 0);

		// 後續推進不應再觸發 b
		// further advancement must not fire b
		t.start(5000);
		assert.equal(b, 0);
	});

	it('setTimeout callback calling clearAll with bulk advance cancels already-due timers too', () =>
	{
		const t = new Timer();
		let a = 0;
		let b = 0;

		t.setTimeout(() =>
		{
			a++;
			t.clearAll();
		}, 1000);

		t.setTimeout(() =>
		{
			b++;
		}, 2000);

		// 一次性大幅度推進到 2000：a、b 都已在本次 run 中。
		// 在 a 的回呼內呼叫 clearAll 會清空即時佇列，b 因此被取消，不會執行——
		// 符合真實 API：被清除的計時器永不觸發。
		// Bulk advance to 2000: a and b are both in this run. clearAll inside a's
		// callback empties the live queue, so b is cancelled and never fires —
		// matching the real API: a cleared timer never runs.
		t.start(2000);

		assert.equal(a, 1);
		assert.equal(b, 0);
		assert.equal(t.timer.length, 0);
	});
});

describe('clear within setInterval callback', () =>
{
	it('setInterval callback calling clearInterval(current) should stop the repeating timer', () =>
	{
		const t = new Timer();
		let count = 0;

		t.setInterval((current) =>
		{
			count++;

			// 在自己的回呼中停止自己
			// stop itself from inside its own callback
			t.clearInterval(current);
		}, 1000);

		// 第一次觸發（t=1000）
		// first fire (t=1000)
		t.start(1000);

		assert.equal(count, 1);
		assert.equal(t.timer.length, 0);

		// 繼續推進不應再觸發
		// further advancement must not fire again
		t.start(5000);
		assert.equal(count, 1);
	});

	it('setInterval callback should be able to stop only after N executions', () =>
	{
		const t = new Timer();
		let count = 0;

		t.setInterval((current) =>
		{
			count++;

			if (count >= 3)
			{
				t.clearInterval(current);
			}
		}, 1000);

		tick(t, 1000, 5);

		// 第 3 次觸發後停止：總共只執行 3 次
		// stops after the 3rd fire: exactly 3 executions
		assert.equal(count, 3);
		assert.equal(t.timer.length, 0);
	});

	it('clearing a future timer from a callback prevents it from firing (incremental advance)', () =>
	{
		const t = new Timer();
		let a = 0;
		let b = 0;

		const bHandle = t.setTimeout(() =>
		{
			b++;
		}, 5000);

		t.setInterval(() =>
		{
			a++;

			// 在第一次 tick 就取消尚未到期的 b
			// cancel not-yet-expired b on the first tick
			t.clearTimeout(bHandle);
		}, 1000);

		// 逐步推進到 t=6000：每次 run 前 b 都還未被排進快照，
		// 因此在 t=1000 被清除後永遠不會執行。
		// step-by-step to t=6000: b is never in a snapshot before being cleared
		// at t=1000, so it never runs.
		tick(t, 1000, 6);

		assert.equal(a, 6);
		assert.equal(b, 0);
		assert.equal(t.timer.length, 1); // 只留下 interval / only the interval remains
	});

	it('clearing another timer from a callback within a single bulk run prevents it from firing', () =>
	{
		const t = new Timer();
		let a = 0;
		let b = 0;

		const bHandle = t.setTimeout(() =>
		{
			b++;
		}, 5000);

		t.setInterval(() =>
		{
			a++;
			t.clearTimeout(bHandle);
		}, 1000);

		// 一次性推進到 6000：b 雖然排程在 t=5000，但在 t=1000 的回呼中已被清除，
		// 因此即使它已到期也不會執行——符合真實 API 行為。
		// Single bulk advance to 6000: although b is scheduled at t=5000, it is cleared
		// inside the t=1000 callback, so it never fires even though due — matching the
		// real API.
		t.start(6000);

		assert.equal(a, 6);
		assert.equal(b, 0);
		assert.equal(t.timer.length, 1); // 僅剩下 interval / only the interval remains
	});
});

describe('add timer within setTimeout callback', () =>
{
	it('setTimeout adding a new setTimeout fires only on the next run', () =>
	{
		const t = new Timer();
		let first = 0;
		let second = 0;

		t.setTimeout(() =>
		{
			first++;

			// 在回呼中追加一個 delay=500 的新計時器（timing = now+500 = 1500）
			// append a new timer with delay=500 inside the callback (timing=now+500)
			t.setTimeout(() =>
			{
				second++;
			}, 500);
		}, 1000);

		// 第一次 run：只觸發 first
		// first run: only first fires
		t.start(1000);

		assert.equal(first, 1);
		assert.equal(second, 0); // 新計時器不會在同一輪執行 / not fired in the same run

		// 第二次 run：second 才觸發
		// second run: second finally fires
		t.start(500);
		assert.equal(second, 1);
	});

	it('setTimeout adding setImmediate (already due) fires within the same run', () =>
	{
		const t = new Timer();
		let first = 0;
		let imm = 0;

		t.setTimeout(() =>
		{
			first++;

			t.setImmediate(() =>
			{
				imm++;
			});
		}, 1000);

		// setImmediate 排程時間 = now（已到期），應併入本輪 run 一併執行，
		// 符合真實 API（時鐘到達後所有到期計時器都會被排定執行）。
		// setImmediate's fire time == now (already due), so it is merged into the SAME
		// run — matching the real API (every due timer fires once the clock arrives).
		t.start(1000);
		assert.equal(first, 1);
		assert.equal(imm, 1);
	});

	it('setTimeout adding setInterval starts firing on subsequent runs', () =>
	{
		const t = new Timer();
		let first = 0;
		let iv = 0;

		t.setTimeout(() =>
		{
			first++;

			t.setInterval(() =>
			{
				iv++;
			}, 500);
		}, 1000);

		t.start(1000);
		assert.equal(first, 1);
		assert.equal(iv, 0);

		t.start(500); // now=1500 第一次觸發 / first interval fire
		assert.equal(iv, 1);

		t.start(500); // now=2000 第二次觸發 / second interval fire
		assert.equal(iv, 2);
	});
});

describe('add timer within setInterval callback', () =>
{
	it('setInterval adding setTimeout: interval keeps running, new timer fires later', () =>
	{
		const t = new Timer();
		let iv = 0;
		let once = 0;

		t.setInterval(() =>
		{
			iv++;

			if (iv === 1)
			{
				// 在第 1 次 tick 追加一個一次性計時器（timing = now+500）
				// append a one-shot timer on the 1st tick (timing=now+500)
				t.setTimeout(() =>
				{
					once++;
				}, 500);
			}
		}, 1000);

		t.start(1000);
		assert.equal(iv, 1);
		assert.equal(once, 0);

		t.start(500); // now=1500：once 觸發；interval 重新排程到 2000
		// now=1500: once fires; interval rescheduled to 2000
		assert.equal(once, 1);
		assert.equal(iv, 1);

		t.start(500); // now=2000：interval 再次觸發
		// now=2000: interval fires again
		assert.equal(iv, 2);
	});

	it('setInterval adding setTimeout then clearing itself stops further ticks', () =>
	{
		const t = new Timer();
		let iv = 0;
		let once = 0;

		t.setInterval((current) =>
		{
			iv++;

			if (iv === 1)
			{
				t.setTimeout(() =>
				{
					once++;
				}, 500);
			}

			if (iv === 3)
			{
				t.clearInterval(current);
			}
		}, 1000);

		t.start(1000);
		assert.equal(iv, 1);
		assert.equal(once, 0);

		t.start(1000);
		assert.equal(iv, 2);

		t.start(1000); // t=3000：第 3 次觸發並停止自己
		// t=3000: 3rd fire, stops itself
		assert.equal(iv, 3);

		t.start(1000); // 不應再觸發 / must not fire again
		assert.equal(iv, 3);

		// 第 1 次 tick 追加的計時器（timing=1500）仍可正常觸發
		// the timer appended on the 1st tick (timing=1500) still fires normally
		t.start(500);
		assert.equal(once, 1);
	});
});

describe('clear API null-safety and return values', () =>
{
	it('clearTimeout/clearInterval/clearImmediate with no handle return null safely', () =>
	{
		const t = new Timer();

		assert.equal(t.clearTimeout(), null);
		assert.equal(t.clearInterval(), null);
		assert.equal(t.clearImmediate(), null);
		assert.equal(t.clearTimeout(undefined), null);
		assert.equal(t.clearInterval(void 0), null);
	});

	it('clearTimeout returns the removed item and empties the queue', () =>
	{
		const t = new Timer();
		const item = t.setTimeout(() => {}, 1000);

		const removed = t.clearTimeout(item);

		assert.ok(removed);
		assert.equal(removed!.id, item.id);
		assert.equal(t.timer.length, 0);
	});

	it('clearTimeout with a stale handle returns null (already removed)', () =>
	{
		const t = new Timer();
		const item = t.setTimeout(() => {}, 1000);

		assert.ok(t.clearTimeout(item));
		assert.equal(t.clearTimeout(item), null);
		assert.equal(t.timer.length, 0);
	});
});

describe('run / runAsync / runGenerator concurrency & run-time invariants', () =>
{
	/**
	 * 併發防護：run 進行中再次呼叫 run / runAsync / runGenerator 應為 no-op，
	 * 不得雙重處理同一個計時器。
	 * Re-entrancy guard: a run already in progress must make nested run / runAsync /
	 * runGenerator calls no-ops, never double-processing a timer.
	 */
	it('nested run() inside a callback is a no-op (no double processing)', () =>
	{
		const t = new Timer();
		let a = 0;
		let b = 0;

		t.setTimeout(() =>
		{
			a++;
			t.run(); // 重入呼叫，應為 no-op / re-entrant call, must be a no-op
		}, 1000);

		t.setTimeout(() =>
		{
			b++;
		}, 1000);

		t.start(1000);

		assert.equal(a, 1);
		assert.equal(b, 1); // 若無防護會變成 2 / would be 2 without the guard
	});

	it('runGenerator: nested run() during iteration is a no-op', () =>
	{
		const t = new Timer();
		let a = 0;
		let b = 0;

		t.setTimeout(() => { a++; }, 1000);
		t.setTimeout(() => { b++; }, 1000);

		// 先推進虛擬時間，再透過 runGenerator 執行（runGenerator 不會推進時間，但會自動觸發回呼）
		// advance the virtual clock first, then drive execution via runGenerator
		// (runGenerator never advances time, but DOES auto-invoke callbacks)
		t.advance(1000);

		for (const _ of t.runGenerator())
		{
			t.run(); // 重入呼叫，應為 no-op / re-entrant call, must be a no-op
		}

		assert.equal(a, 1);
		assert.equal(b, 1);
	});

	it('runGenerator() returns the SAME cached generator on repeated calls', () =>
	{
		const t = new Timer();

		t.setTimeout(() => {}, 1000);

		const g1 = t.runGenerator();
		const g2 = t.runGenerator();

		// 多次呼叫只會得到同一份 _runGenerator() 狀態（不會重複產生導致雙重處理）
		// repeated calls yield the same _runGenerator() state (no duplicate generation / double-processing)
		assert.strictEqual(g1, g2);
	});

	it('runAsync: nested run() / advance() inside async callback are guarded', async () =>
	{
		const t = new Timer();
		let count = 0;
		let advanceThrew = false;

		t.setTimeout(async () =>
		{
			count++;
			t.run(); // 重入 no-op / re-entrant no-op

			try
			{
				t.advance(1000); // 執行期間禁止時間跳躍 / time jump forbidden during run
			}
			catch
			{
				advanceThrew = true;
			}
		}, 1000);

		await t.startAsync(1000);

		assert.equal(count, 1);
		assert.equal(advanceThrew, true);
	});

	/**
	 * 時間跳躍防護：run 執行期間禁止 advance() 推進虛擬時間。
	 * Time-jump guard: advance() is forbidden while a run is in progress.
	 */
	it('advance() inside a callback throws (time jump forbidden during run)', () =>
	{
		const t = new Timer();
		let threw = false;

		t.setTimeout(() =>
		{
			try
			{
				t.advance(1000);
			}
			catch
			{
				threw = true;
			}
		}, 1000);

		t.start(1000);

		assert.equal(threw, true);
		// 活躍 run 狀態應已被釋放，後續 run 正常 / active run must be released so later runs work
		assert.equal((t as any)._activeRun, null);
	});

	it('active run state is released after a normal run (sequential runs work)', () =>
	{
		const t = new Timer();
		let count = 0;

		t.setTimeout(() => { count++; }, 1000);
		t.start(1000);
		assert.equal(count, 1);
		assert.equal((t as any)._activeRun, null);

		// 第二輪 run 應正常執行，不受前次影響 / a second run must work normally
		t.setTimeout(() => { count++; }, 1000);
		t.start(1000);
		assert.equal(count, 2);
	});

	/**
	 * 回呼內追加「已到期」計時器，經由內部 tryAdd 直接併入本輪 run，
	 * 不需要反覆掃描佇列（pending 內部 API）。
	 * A due timer appended inside a callback is merged into the SAME run via the internal
	 * tryAdd (the pending internal API), without repeatedly scanning the queue.
	 */
	it('appended due timer is merged into the current run via internal pending API', () =>
	{
		const t = new Timer();
		let first = 0;
		let imm = 0;

		t.setTimeout(() =>
		{
			first++;

			t.setImmediate(() =>
			{
				imm++;
			});
		}, 1000);

		t.start(1000);

		assert.equal(first, 1);
		assert.equal(imm, 1); // 經由 tryAdd 併入同一輪 / merged into the same run via tryAdd
	});

	/**
	 * 中斷（cancel / pause）：執行期間禁止時間跳躍已在前述測試驗證，此處驗證中斷後的時間修正。
	 * Interruption (cancel / pause): time-jump-during-run is already verified above; here we
	 * verify the time correction after interruption.
	 */
	it('cancel() during a callback aborts remaining timers and reverts the virtual time', () =>
	{
		const t = new Timer();
		const start0 = t.timer.now().valueOf();
		let count = 0;

		t.setTimeout(() =>
		{
			count++;
			t.cancel(); // 中止本輪 run / abort this run
		}, 1000);

		t.setTimeout(() =>
		{
			count++;
		}, 2000);

		// 推進到 3000 並執行；第一個回呼內 cancel 會撤銷時間跳躍
		// advance to 3000 and run; cancel inside the 1st callback undoes the time jump
		t.start(3000);

		// 只有第一個計時器執行（第二個被取消）
		// only the first timer runs (the second is cancelled)
		assert.equal(count, 1);

		// 虛擬時間回到本次 run 開始前的值（start 推進前）
		// virtual time is back to the value before this run (before start's advance)
		assert.equal(t.timer.now().valueOf(), start0);
	});

	it('pause() during a callback stops and corrects time to the next pending item', () =>
	{
		const t = new Timer();
		const start0 = t.timer.now().valueOf();
		let count = 0;

		t.setTimeout(() =>
		{
			count++;
			t.pause(); // 在第一個回呼內暫停 / pause inside the 1st callback
		}, 1000);

		t.setTimeout(() =>
		{
			count++;
		}, 2000);

		t.start(3000);

		// 第一個執行後暫停，第二個未執行
		// 1st fires then pauses; 2nd does not
		assert.equal(count, 1);

		// 時間修正為下一個待執行項目（原排程 2000）的觸發時間
		// time is corrected to the next pending item's scheduled time (2000)
		assert.equal(t.timer.now().valueOf(), start0 + 2000);

		// 續跑：時間已修正到 2000，再 run 即觸發第二個
		// resume: time is already at 2000, run() fires the 2nd immediately
		t.start(0);
		assert.equal(count, 2);
	});

	it('cancel() while idle is a safe no-op', () =>
	{
		const t = new Timer();
		const start0 = t.timer.now().valueOf();

		t.setTimeout(() => {}, 1000);
		t.cancel();
		t.pause();

		assert.equal(t.timer.now().valueOf(), start0);
		assert.equal(t.timer.length, 1);
	});
});
