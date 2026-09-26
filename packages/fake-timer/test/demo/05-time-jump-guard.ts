/**
 * Demo 05 — 時間跳躍防護（time-jump guard）與回呼內排程
 *           The time-jump guard and scheduling inside callbacks
 *
 * 當 `run()` / `start()` / `runAsync()` 正在執行回呼時，虛擬時鐘是被「鎖定」的：
 * While a `run()`/`start()`/`runAsync()` is executing callbacks, the virtual clock is LOCKED:
 *
 *   - 在回呼內呼叫 `advance()` 會丟出 TypeError。
 *     Calling `advance()` inside a callback throws a TypeError.
 *   - 在回呼內呼叫 `start()` 是「多餘的 no-op」（不會再次推進時間）。
 *     Calling `start()` inside a callback is a redundant no-op (won't advance again).
 *
 * 所以你「不能」在回呼裡用 `advance()`/`start()` 把時鐘往前推。
 * So you CANNOT push the clock forward from inside a callback via `advance()`/`start()`.
 *
 * 正確做法：若想讓更多計時器在這一輪觸發，請「排程」它們
 * （`setTimeout`/`setInterval`）。回呼內新增「已到期」的計時器會經由內部 `tryAdd`
 * 自動併入同一輪 run 並執行。
 * Correct approach: to make more timers fire in this round, SCHEDULE them. A timer added
 * inside a callback that is already due is merged into the same run via internal `tryAdd`
 * and fires immediately.
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

{
	const t = new FakeTimer();
	const log: string[] = [];

	t.setTimeout(() => {
		log.push('outer ran');

		// (1) advance() 在 run 進行中會丟 TypeError
		let threw = false;
		try
		{
			t.advance(100);
		}
		catch (e)
		{
			threw = e instanceof TypeError;
		}
		log.push(`advance() threw TypeError = ${threw}`);

		// (2) start() 在 run 進行中是 no-op
		const before = t.timer.now().diff(t.timer.data.fake_init);
		t.start(100); // no-op while run active
		const after = t.timer.now().diff(t.timer.data.fake_init);
		log.push(`start() no-op = ${before === after}`);

		// (3) 正確：在回呼內「排程」一個已到期的計時器 → 同一輪就會執行
		t.setTimeout(() => log.push('inner (due) ran'), 0);
	}, 100);

	t.start(250); // 時鐘先跳到 250，再執行回呼

	console.log('執行順序 / execution log:', JSON.stringify(log));
	check('advance() 在回呼內丟 TypeError', log.includes('advance() threw TypeError = true'));
	check('start() 在回呼內是 no-op', log.includes('start() no-op = true'));
	check('回呼內排程的已到期計時器在同一輪執行', log.includes('inner (due) ran'));
}

console.log('\n— Demo 05 完成 / Demo 05 done —');
