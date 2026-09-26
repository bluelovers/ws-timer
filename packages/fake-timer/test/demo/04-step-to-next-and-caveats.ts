/**
 * Demo 04 — `start(-1)`：跳到「最早排程」並執行 + 它的陷阱
 *           `start(-1)`: jump to the earliest scheduled timer and run it + its pitfall
 *
 * `start(-1)` 的語意：把負數交給 `advance(-1)`，而 `advance` 遇到負數時，會把
 * `timer.cache.min`（最早排程的絕對時間）當作「目標時間」直接 `set` 過去，再 `run()`。
 * 所以 `start(-1)` = 「推進到最早的那個計時器並執行它」——內建的逐格前進語意。
 *
 * `start(-1)` semantics: a negative amount makes `advance` SET the clock to
 * `timer.cache.min` (the earliest scheduled absolute time), then `run()`. So
 * `start(-1)` = "advance to the earliest timer and run it" — the built-in step.
 *
 * ⚠️ 陷阱 / Pitfall：
 * `cache.min` 是「增量快取」，`remove()` / `clearTimeout()` 並不會刷新它。
 * 因此「取消最早的那個計時器之後」再呼叫 `start(-1)`，會跳到已失效的 `cache.min`
 * （時鐘甚至可能往回跳），而不是剩下來最早的那個。
 *
 * `cache.min` is an incremental cache that `remove()`/`clearTimeout()` does NOT refresh.
 * After cancelling the earliest timer, `start(-1)` may jump to the STALE `cache.min`
 * (the clock can even move backward) instead of the real next timer.
 *
 * 安全做法 / Safe alternative: 呼叫 `timer.sort()` 重建 cache，或改用 `run()`（只執行
 * 已到期項目、不移動時鐘）/ 明確的正數 `advance(ms)`。
 * Call `timer.sort()` to rebuild the cache first, or just use `run()` (executes due
 * items without moving the clock) / an explicit positive `advance(ms)`.
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

// ---- A. 正常用法：從時鐘 0 逐格前進 / Normal use: step from clock 0 ----
console.log('— A. 正常逐格前進 / normal stepping —');
{
	const t = new FakeTimer();
	const seen: number[] = [];
	t.setTimeout(() => seen.push(t.timer.now().diff(t.timer.data.fake_init)), 500);
	t.setTimeout(() => seen.push(t.timer.now().diff(t.timer.data.fake_init)), 1500);

	t.start(-1); // 跳到 500 並執行 / jump to 500 and run
	check('第一次 start(-1) 後 seen=[500]', JSON.stringify(seen) === JSON.stringify([500]));
	check('時鐘停在 500 / clock at 500', t.timer.now().diff(t.timer.data.fake_init) === 500);

	t.start(-1); // 跳到 1500 並執行 / jump to 1500 and run
	check('第二次 start(-1) 後 seen=[500,1500]', JSON.stringify(seen) === JSON.stringify([500, 1500]));
	check('時鐘停在 1500 / clock at 1500', t.timer.now().diff(t.timer.data.fake_init) === 1500);
}

// ---- B. 陷阱：取消最早計時器後，start(-1) 跳到失效的 cache.min ----
console.log('\n— B. 陷阱：取消後 start(-1) 跳到失效快取 / pitfall after cancel —');
{
	const t = new FakeTimer();
	const seen: number[] = [];
	const a = t.setTimeout(() => seen.push('a'), 500);
	t.setTimeout(() => seen.push('b'), 1500);

	// 先把時鐘推到 1000（a 已到期但未 run；b 還沒到期）
	// advance clock to 1000 (a is due but not run yet; b not due)
	t.advance(1000);
	const before = t.timer.now().diff(t.timer.data.fake_init);

	// 取消最早的 a；cache.min 並未因此刷新，仍記得 500
	// cancel the earliest (a); cache.min is NOT refreshed, still remembers 500
	t.clearTimeout(a);

	t.start(-1); // 期望：跳到 1500 執行 b。實際：跳到失效的 500，b 不會執行
	// expectation: jump to 1500 and run b. reality: jumps to stale 500, b never runs
	const after = t.timer.now().diff(t.timer.data.fake_init);

	console.log(`   取消 a 前時鐘=${before}，start(-1) 後時鐘=${after}，seen=${JSON.stringify(seen)}`);
	check('start(-1) 把時鐘從 1000 跳回 500（往回跳！）/ clock jumped BACKWARD 1000→500', after === 500);
	check('b 沒有被執行（陷阱重現）/ b did NOT fire (pitfall reproduced)', seen.length === 0);
}

// ---- C. 安全做法：先 sort() 再 start(-1) ----
console.log('\n— C. 安全做法：先 timer.sort() 再 start(-1) / safe: sort() then start(-1) —');
{
	const t = new FakeTimer();
	const seen: number[] = [];
	const a = t.setTimeout(() => seen.push('a'), 500);
	t.setTimeout(() => seen.push('b'), 1500);

	t.advance(1000);
	t.clearTimeout(a);

	t.timer.sort();     // 重建 cache.min（現在會是正確的 1500）
	t.start(-1);        // 這次正確跳到 1500 並執行 b

	check('sort() 後 start(-1) 正確執行 b / after sort(), start(-1) correctly runs b', JSON.stringify(seen) === JSON.stringify(['b']));
	check('時鐘停在 1500 / clock at 1500', t.timer.now().diff(t.timer.data.fake_init) === 1500);
}

console.log('\n— Demo 04 完成 / Demo 04 done —');
