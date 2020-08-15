import getGlobalThis from 'globalthis/polyfill';

export function getPerformanceByGlobalThis(_global?: any): typeof global.performance
{
	return (_global ?? getGlobalThis())?.performance
}

export function getPerformanceNowByGlobalThis(_global?: any): () => number
{
	const perf = getPerformanceByGlobalThis(_global) as any;

	if (typeof perf !== 'undefined')
	{
		return perf.now
			?? perf.mozNow
			?? perf.msNow
			?? perf.oNow
			?? perf.webkitNow
	}
}
