/**
 * Regression test: clearAll / reset / requestAnimationFrame / global clock.
 *
 * 迴歸測試：clearAll / reset / requestAnimationFrame / 全域時鐘。
 *
 * Background / 背景：
 *   Follow-up API surface beyond the basic set* / clear* family:
 *   在基礎 set* / clear* 之上的延伸 API：
 *     - clearAll(): 清空佇列但不動時鐘 / clear queue without touching the clock
 *     - reset():    清空佇列並將時鐘還原至初始值 / clear queue AND reset the clock to its initial value
 *     - requestAnimationFrame / cancelAnimationFrame: 遊戲主迴圈用的影格排程 / frame scheduling for game loops
 *     - installGlobalClock / uninstallGlobalClock: 將 Date.now / performance.now 對齊虛擬時間 / align Date.now / performance.now with virtual time
 *
 * Usage: tsx --test test/issues/extra-api.node-test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	FakeTimer as Timer,
	UnsafeGlobalFakeTimer as UnsafeTimer,
	EnumGlobalClockState,
	getUnsafeGlobalFakeTimer,
} from '../../src/index';

describe('issue: clearAll / reset / requestAnimationFrame / global clock', () =>
{
	it('clearAll empties the queue but keeps the clock', () =>
	{
		const t = new Timer();
		t.setTimeout(() => {}, 1000);
		t.setTimeout(() => {}, 2000);

		assert.equal(t.timer.length, 2);

		const ret = t.clearAll();

		assert.equal(ret, t, 'clearAll returns the instance (chainable)');
		assert.equal(t.timer.length, 0, 'queue should be empty');
		assert.equal(t.timer.now().diff(t.timer.data.virtual_init), 0, 'clock must be unchanged');
	});

	it('reset clears the queue AND resets the clock', () =>
	{
		const t = new Timer();
		t.setTimeout(() => {}, 1000);
		t.advance(500);

		assert.equal(t.timer.now().diff(t.timer.data.virtual_init), 500);

		const ret = t.reset();

		assert.equal(ret, t, 'reset returns the instance (chainable)');
		assert.equal(t.timer.length, 0, 'queue should be empty');
		assert.equal(t.timer.now().diff(t.timer.data.virtual_init), 0, 'clock should be back to init');
	});

	it('requestAnimationFrame fires after one frame interval', () =>
	{
		const t = new Timer();
		let called = false;

		t.requestAnimationFrame(() => called = true);

		// Not yet — needs one full frame to elapse.
		t.advance(t.frameInterval);
		assert.equal(called, false, 'should not fire before the frame elapses');

		t.run();
		assert.equal(called, true, 'should fire once the frame elapses');
		assert.equal(t.timer.length, 0);
	});

	it('cancelAnimationFrame prevents a pending rAF callback', () =>
	{
		const t = new Timer();
		let called = false;

		const item = t.requestAnimationFrame(() => called = true);
		t.cancelAnimationFrame(item);

		t.advance(t.frameInterval);
		t.run();

		assert.equal(called, false, 'cancelled rAF must not fire');
		assert.equal(t.timer.length, 0);
	});

	it('a rAF-driven loop runs one frame per advance (game main loop pattern)', () =>
	{
		const t = new Timer();
		let frames = 0;

		const loop = () =>
		{
			frames++;
			// schedule the next frame, exactly like a real game loop
			t.requestAnimationFrame(loop);
		};

		t.requestAnimationFrame(loop);

		// drive 5 frames
		for (let i = 0; i < 5; i++)
		{
			t.advance(t.frameInterval);
			t.run();
		}

		assert.equal(frames, 5);
		assert.equal(t.timer.length, 1, 'one rAF pending for the next frame');
	});

	it('base FakeTimer does NOT expose the unsafe global-clock patching API', () =>
	{
		const t = new Timer();

		assert.equal((t as any).installGlobalClock, undefined, 'installGlobalClock must live on the subclass only');
		assert.equal((t as any).uninstallGlobalClock, undefined, 'uninstallGlobalClock must live on the subclass only');
	});

	it('UnsafeGlobalFakeTimer.installGlobalClock makes Date.now / performance.now track virtual time, then restores', () =>
	{
		const t = new UnsafeTimer();
		const originalDateNow = Date.now;

		t.installGlobalClock();

		try
		{
			const before = Date.now();          // equals virtual_init in ms
			const perfBefore = (globalThis as any).performance?.now?.() ?? 0;

			t.advance(1000);

			assert.equal(Date.now(), before + 1000, 'Date.now should advance with virtual time');
			assert.equal((globalThis as any).performance?.now?.() ?? 0, perfBefore + 1000, 'performance.now should advance with virtual time');
		}
		finally
		{
			t.uninstallGlobalClock();
		}

		// Verify Date.now is restored to its original function.
		assert.equal(Date.now, originalDateNow, 'Date.now must be restored after uninstall');
	});

	it('UnsafeGlobalFakeTimer.installGlobalClock is idempotent and uninstall is safe to call twice', () =>
	{
		const t = new UnsafeTimer();
		const originalDateNow = Date.now;

		t.installGlobalClock();
		t.installGlobalClock(); // second call should be a no-op

		t.uninstallGlobalClock();
		t.uninstallGlobalClock(); // safe no-op

		assert.equal(Date.now, originalDateNow, 'Date.now restored after paired uninstall');
	});

	it('double insurance: a second instance cannot double-patch the global clock', () =>
	{
		const a = new UnsafeTimer();
		const b = new UnsafeTimer();
		const originalDateNow = Date.now;

		// A installs first and captures the REAL Date.now.
		a.installGlobalClock();

		// B must be blocked by the module-level flag, NOT patch again.
		// If it patched, it would overwrite A's saved original with A's fake closure,
		// and the real Date.now would be lost forever.
		b.installGlobalClock();

		a.advance(1000);
		assert.equal(Date.now(), a.timer.now().valueOf(), 'Date.now should follow A');

		// Only A really installed, so only A's uninstall restores correctly.
		a.uninstallGlobalClock();

		assert.equal(Date.now, originalDateNow, 'real Date.now must be preserved (no double-patch)');
		b.uninstallGlobalClock(); // safe no-op (B never actually installed)
	});

	it('getUnsafeGlobalFakeTimer() returns a shared singleton exposing the unsafe API', () =>
	{
		const a = getUnsafeGlobalFakeTimer();
		const b = getUnsafeGlobalFakeTimer();

		// The getter must return the same instance on repeated calls.
		assert.equal(a, b, 'getUnsafeGlobalFakeTimer() is a singleton');

		assert.equal(typeof a.installGlobalClock, 'function', 'singleton exposes installGlobalClock');
		assert.equal(typeof a.uninstallGlobalClock, 'function', 'singleton exposes uninstallGlobalClock');

		const originalDateNow = Date.now;

		try
		{
			a.installGlobalClock();
			a.advance(1000);
			assert.equal(Date.now(), a.timer.now().valueOf(), 'singleton patches the global clock');
		}
		finally
		{
			a.uninstallGlobalClock();
		}

		assert.equal(Date.now, originalDateNow, 'Date.now restored after singleton uninstall');
	});

	it('globalClockState() reports none / self / global distinctly', () =>
	{
		const a = new UnsafeTimer();
		const b = new UnsafeTimer();

		// Before anything is installed: both see 'none'.
		assert.equal(a.globalClockState(), EnumGlobalClockState.none, 'a not installed yet');
		assert.equal(b.globalClockState(), EnumGlobalClockState.none, 'b not installed yet');

		a.installGlobalClock();

		// a installed it → 'self'; b sees a global registration → 'global'.
		assert.equal(a.globalClockState(), EnumGlobalClockState.self, 'a reports self');
		assert.equal(b.globalClockState(), EnumGlobalClockState.global, 'b reports global (installed by another instance)');

		a.uninstallGlobalClock();

		assert.equal(a.globalClockState(), EnumGlobalClockState.none, 'a back to none');
		assert.equal(b.globalClockState(), EnumGlobalClockState.none, 'b back to none');
	});

	it('cross-instance uninstall: a different instance can restore via the global registry', () =>
	{
		const a = new UnsafeTimer();
		const b = new UnsafeTimer();
		const originalDateNow = Date.now;

		a.installGlobalClock();
		a.advance(1000);
		assert.equal(Date.now(), a.timer.now().valueOf(), 'Date.now follows A after A installs');

		// B never installed, but uninstallGlobalClock must delegate to A's restore via the
		// globally-registered uninstall closure, correctly bringing back the real Date.now.
		b.uninstallGlobalClock();

		assert.equal(Date.now, originalDateNow, 'real Date.now restored even when B triggers uninstall');
		assert.equal(a.globalClockState(), EnumGlobalClockState.none, 'clock fully uninstalled');
		assert.equal(b.globalClockState(), EnumGlobalClockState.none, 'b sees none after delegated uninstall');
	});
});
