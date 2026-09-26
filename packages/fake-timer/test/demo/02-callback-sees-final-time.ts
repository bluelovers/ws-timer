/**
 * Demo 02 — 回呼讀到的是「最終時間」，不是「排程邊界」
 *           Callbacks observe the FINAL time, not each timer's scheduled boundary
 *
 * 這是最常被誤解的一點 / This is the #1 misunderstanding.
 *
 * `start(350)` 的行為：先把虛擬時鐘「一口氣推到 350」，再執行所有 `timing <= 350`
 * 的回呼。因此回呼內讀到的時鐘一律是 350 —— 而不是各自原定的 100 / 200 / 300。
 *
 * `start(350)` first jumps the clock straight to 350, THEN runs every timer with
 * `timing <= 350`. So inside any callback the clock reads 350 — not the individual
 * 100 / 200 / 300 you scheduled them at.
 *
 * 這與原生 `setTimeout` 一致：原生環境下時間是真實流逝的，回呼執行當下 `Date.now()`
 * 讀到的是「跳躍後的當下時間」，不是當初設定的延遲值。
 * This also matches native `setTimeout`: in the real world time has actually elapsed,
 * so `Date.now()` inside a callback is the current (post-jump) time, not the original delay.
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
	const seen: number[] = [];

	// 週期計時器，每 100ms 觸發一次
	// a repeating timer that fires every 100ms
	t.setInterval(() => {
		// 回呼內讀到的時鐘
		// clock read inside the callback
		seen.push(t.timer.now().diff(t.timer.data.virtual_init));
	}, 100);

	// 一口氣推進 350ms
	// advance 350ms in one shot
	t.start(350);

	console.log('實際觀察到的觸發時刻 / observed fire times:', seen);

	// 正確預期：全部都是 350（最終時間）
	// correct expectation: every entry is 350 (the final time)
	check('所有回呼都讀到最終時間 350 / all callbacks see the final time 350', seen.every((v) => v === 350));
	check('共觸發 3 次（100/200/300 都已到期）/ fired 3 times', seen.length === 3);

	// ❌ 常見的錯誤預期（fake-timer 不會這樣做）：
	// ❌ the WRONG expectation (what fake-timer does NOT do):
	//     seen === [100, 200, 300]
	check('NOT [100,200,300]（回呼不會各自讀到排程邊界）/ NOT [100,200,300]', JSON.stringify(seen) !== JSON.stringify([100, 200, 300]));
}

console.log('\n— Demo 02 完成：回呼讀到最終時間，符合原生行為 / Demo 02 done —');
