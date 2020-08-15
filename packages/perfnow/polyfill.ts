import { getPerformanceNowByProcess } from './lib/process';
import { getPerformanceNowByNodePerfHooks } from './lib/perf_hooks';
import { getPerformanceNowByGlobalThis } from './lib/globalthis';
import { getPerformanceNowByDate } from './lib/date';

export function getPerformanceNow(_global?: any): () => number
{
	const now = getPerformanceNowByGlobalThis(_global)
		?? getPerformanceNowByNodePerfHooks()
		?? getPerformanceNowByProcess()
		?? getPerformanceNowByDate()
	;

	return now
}

export default getPerformanceNow
