/**
 * Demo 03 — 週期計時器的 catch-up（一次 start 跨越多個週期）
 *           Interval catch-up (a single start spans multiple periods)
 *
 * `setInterval(cb, 100)` 在 fake-timer 中，每次觸發後以 `timing + interval` 重排。
 * 若一次 `start()` 跨越多個週期邊界，會在同一輪 run 內依序補償觸發（不會漂移）。
 *
 * `setInterval(cb, 100)` reschedules itself at `timing + interval` after every fire.
 * When one `start()` spans several period boundaries, each boundary fires in the same
 * run (catch-up, no drift).
 *
 * 注意：和 Demo 02 一樣，每個回呼讀到的仍是「最終時間」，不是各自的週期邊界。
 * Note: like Demo 02, every callback still reads the FINAL time, not its period boundary.
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
	let count = 0;
	const times: number[] = [];

	t.setInterval(() => {
		count++;
		times.push(t.timer.now().diff(t.timer.data.fake_init));
	}, 100);

	// 一口氣推進 350ms：應補償觸發 100 / 200 / 300 三次
	// advance 350ms: should catch up and fire at 100 / 200 / 300 (three times)
	t.start(350);

	check('週期計時器觸發 3 次 / interval fired 3 times', count === 3);
	check('三個回呼都讀到最終時間 350 / all three see final time 350', times.every((v) => v === 350));

	// 再推進 500ms：從上次重排的 400 開始，應觸發 400 / 500 / 600 / 700 / 800（5 次）
	// advance another 500ms from the rescheduled 400: fires 400/500/600/700/800 (5 times)
	t.start(500);
	check('再觸發 5 次 / 5 more fires', count === 8);
}

// clearInterval 後不再觸發（用全新的實例，避免上一個 interval 干擾）
// after clearInterval, no more fires (fresh instance to avoid interference)
{
	const t = new FakeTimer();
	let count = 0;
	const handle = t.setInterval(() => { count++; }, 100);

	t.start(250);
	check('clearInterval 前已觸發 2 次 / 2 fires before clear', count === 2);

	t.clearInterval(handle);
	t.start(1000);
	check('clearInterval 後不再觸發 / no fire after clearInterval', count === 2);
}

console.log('\n— Demo 03 完成 / Demo 03 done —');
