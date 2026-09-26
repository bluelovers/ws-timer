/**
 * Demo 06 — 正確讀取虛擬時鐘 / Reading the virtual clock correctly
 *
 *   - `timer.now()` 回傳的是 `dayjs.Dayjs`，「不是」數字。
 *     `timer.now()` returns a `dayjs.Dayjs`, NOT a number.
 *   - 要取得「自建立以來經過的毫秒數」，用 `timer.now().diff(timer.data.virtual_init)`。
 *     To get "elapsed fake ms since creation", use `timer.now().diff(timer.data.virtual_init)`.
 *   - 你也可以自己抓一個基準 `const base = timer.now()`，之後對它 diff。
 *     Or capture your own base `const base = timer.now()` and diff against it later.
 *
 * ❌ 不要直接呼叫 `timer.update(...)` 來移動時鐘。那是 `advance()` 內部才用的私有方法；
 *    自己呼叫會繞過 time-jump 防護與快取不變式。要移動時鐘請用公開的 `advance()` / `start()`。
 * ❌ Do NOT call `timer.update(...)` directly to move the clock. It is a private method used
 *    internally by `advance()`; calling it yourself bypasses the time-jump guard and cache
 *    invariants. Use the public `advance()` / `start()` to move time.
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

	// now() 是 dayjs 物件，不是數字
	// now() is a dayjs object, not a number
	check('now() 不是 number', typeof t.timer.now() !== 'number');
	check('now() 是 dayjs（有 diff 方法）/ now() is dayjs (has diff)', typeof t.timer.now().diff === 'function');

	// 經過的毫秒 = now().diff(virtual_init)
	// elapsed ms = now().diff(virtual_init)
	check('初始 elapsed = 0', t.timer.now().diff(t.timer.data.virtual_init) === 0);

	t.advance(1200);
	check('advance(1200) 後 elapsed = 1200', t.timer.now().diff(t.timer.data.virtual_init) === 1200);

	// 自己抓基準 / capture your own base
	const base = t.timer.now();
	t.advance(300);
	check('對自訂基準 diff 得到 300 / diff against custom base = 300', t.timer.now().diff(base) === 300);

	// ❌ 反例：直接呼叫內部 timer.update（不建議）
	// ❌ anti-example: calling internal timer.update directly (discouraged)
	const before = t.timer.now().diff(t.timer.data.virtual_init);
	t.timer.update(50); // 私有方法 / private method
	const after = t.timer.now().diff(t.timer.data.virtual_init);
	check('timer.update(50) 確實移動了時鐘（但這是內部 API）/ update moved clock (but it is internal API)', after - before === 50);
	console.log('   ↑ 這能動，但繞過了公開 API 的防護，不建議用 / works, but bypasses the public API guard — do not use');
}

console.log('\n— Demo 06 完成 / Demo 06 done —');
