/**
 * 對齊 Web/API/Window.setTimeout：delay 之後的額外引數會原樣轉交給回呼。
 * Align with Web/API/Window.setTimeout: extra args after `delay` are forwarded verbatim
 * to the callback when it fires.
 *
 * 支援的用法 / Supported usages:
 *   setTimeout(func)
 *   setTimeout(func, delay)
 *   setTimeout(func, delay, param1)
 *   setTimeout(func, delay, param1, param2)
 *   setTimeout(func, delay, param1, ..., paramN)
 */
import { FakeTimer } from '../../src/index';

const t = new FakeTimer();
const log: string[] = [];
const order: string[] = [];

// 1) setTimeout(func) —— 無 delay，預設 delay = 0（立即排入）
//    setTimeout(func) — no delay, defaults to 0 (queued immediately)
t.setTimeout((current, self, ...rest) =>
{
	order.push('no-delay');
	log.push(`no-delay args=${JSON.stringify(rest)}`);
});

// 2) setTimeout(func, delay)
t.setTimeout((current, self, ...rest) =>
{
	order.push('with-delay');
	log.push(`with-delay args=${JSON.stringify(rest)}`);
}, 100);

// 3) setTimeout(func, delay, p1)
t.setTimeout((current, self, a) =>
{
	order.push('one-param');
	log.push(`one-param a=${a}`);
}, 200, 'hello');

// 4) setTimeout(func, delay, p1, p2)
t.setTimeout((current, self, a, b) =>
{
	order.push('two-params');
	log.push(`two-params a=${a} b=${b}`);
}, 300, 'x', 42);

// 5) setInterval 同樣會轉交額外引數，且每次重排都沿用同一組 params
t.setInterval((current, self, tag) =>
{
	order.push(`interval:${tag}`);
	log.push(`interval:${tag}`);
}, 50, 'tick');

t.start(350);

const checks: Array<[string, boolean]> = [
	['no-delay 轉交空陣列 / forwards []', log.includes('no-delay args=[]')],
	['with-delay 轉交空陣列 / forwards []', log.includes('with-delay args=[]')],
	['one-param 轉交 a=hello', log.includes('one-param a=hello')],
	['two-params 轉交 a=x b=42', log.includes('two-params a=x b=42')],
	['setInterval 也轉交額外引數 / interval forwards args', log.some((l) => l.startsWith('interval:tick'))],
];

let allPass = true;

for (const [name, ok] of checks)
{
	console.log(ok ? '✅' : '❌', name);

	if (!ok) allPass = false;
}

console.log('執行順序 / execution order:', order.join(' -> '));

if (!allPass) process.exit(1);
