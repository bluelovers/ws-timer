/**
 * Demo 01 — 基本用法 / Basic usage
 *
 * 重點 / Key points:
 *   1. 排程用 `setTimeout` / `setInterval`，它們「同步」回傳佇列項目（句柄）。
 *      Scheduling is synchronous: `setTimeout`/`setInterval` return the queue item (handle) right away.
 *   2. 推進時間並執行回呼，用 `start(ms)`（= `advance(ms)` + `run()`）。
 *      Advance the clock AND run callbacks with `start(ms)`.
 *   3. `advance(ms)` 只移動時鐘、不執行回呼；`run()` 只執行到期回呼、不移動時鐘。
 *      `advance(ms)` moves the clock only; `run()` executes due callbacks only.
 */

import { FakeTimer } from '../../src/index';

function check(label: string, cond: boolean): void
{
	if (!cond)
	{
		throw new Error(`❌ CHECK FAILED: ${label}`);
	}
	console.log(`✅ ${label}`);
}

const t = new FakeTimer();

// 排程兩個計時器 / schedule two timers
let aFired = false;
let bFired = false;

t.setTimeout(() => { aFired = true; }, 1000);   // 1 秒後 / after 1000ms
t.setInterval(() => { bFired = true; }, 500);    // 每 500ms / every 500ms

// 此時時鐘仍在 0，回呼尚未執行
// clock is still at 0, nothing has run yet
check('排程後時鐘仍為 0 / clock stays 0 before start', t.timer.now().diff(t.timer.data.fake_init) === 0);
check('回呼尚未執行 / callbacks not fired yet', !aFired && !bFired);

// advance() 只移動時鐘，不執行回呼
// advance() moves time only, does not run callbacks
t.advance(1000);
check('advance(1000) 後 a 仍沒執行 / a not fired after advance only', !aFired);
check('advance(1000) 後時鐘為 1000 / clock = 1000', t.timer.now().diff(t.timer.data.fake_init) === 1000);

// run() 執行到期回呼，時鐘不變
// run() executes due callbacks, clock unchanged
t.run();
check('run() 後 a 已執行 / a fired after run', aFired);
check('run() 後時鐘仍為 1000 / clock still 1000', t.timer.now().diff(t.timer.data.fake_init) === 1000);

// start(ms) = advance(ms) + run()，一次完成
// start(ms) does both in one call
const t2 = new FakeTimer();
let cFired = false;
t2.setTimeout(() => { cFired = true; }, 250);
t2.start(250);
check('start(250) 後 c 已執行 / c fired after start', cFired);
check('start(250) 後時鐘為 250 / clock = 250', t2.timer.now().diff(t2.timer.data.fake_init) === 250);

console.log('\n— Demo 01 完成 / Demo 01 done —');
