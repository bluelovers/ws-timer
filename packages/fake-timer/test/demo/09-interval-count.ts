/**
 * 週期性 timer（setInterval）能否從回呼取得「觸發次數」。
 * Whether a periodic timer (setInterval) can read its fire count from the callback.
 */
import { FakeTimer as Timer } from '../../src/index';

const t = new Timer();
const log: string[] = [];

t.setInterval((current) =>
{
	log.push(`tick #${current.count} @ ${current.virtualTiming.diff(t.timer.data.virtual_init)}ms`);
}, 50);

t.start(200); // 預期 50/100/150/200 → 4 次

const expected = [
	'tick #1 @ 50ms',
	'tick #2 @ 100ms',
	'tick #3 @ 150ms',
	'tick #4 @ 200ms',
];

let allPass = true;

for (let i = 0; i < expected.length; i++)
{
	const ok = log[i] === expected[i];

	console.log(ok ? '✅' : '❌', log[i] ?? '(missing)');

	if (!ok) allPass = false;
}

console.log('fires:', log.length);

if (!allPass) process.exit(1);
