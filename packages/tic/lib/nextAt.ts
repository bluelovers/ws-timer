import { positiveNumber } from './positiveNumber';

export function nextAt(next: number, at: number, ...argv: number[])
{
	return Math.max(0, Math.min(positiveNumber(next) ?? at, at, ...argv));
}

