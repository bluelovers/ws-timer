export function getPerformanceNowByDate(): () => number
{
	return Date.now
		?? (function now()
		{
			return new Date().getTime();
		})
}
