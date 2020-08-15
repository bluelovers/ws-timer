export function positiveNumber(n: number)
{
	if (isPositiveNumber(n))
	{
		return n
	}
}

export function isPositiveNumber(n: number)
{
	return (typeof n === 'number' && !Number.isNaN(n) && n >= 0)
}
