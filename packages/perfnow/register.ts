import getPolyfill from 'globalthis/polyfill'
import now from './index';
import { getPerformanceByNodePerfHooks } from './lib/perf_hooks';
import { Performance } from "perf_hooks";

const _g = getPolyfill();

try
{
	// @ts-ignore
	(_g as any).performance ??= getPerformanceByNodePerfHooks();
	_g.performance.now ??= now
}
catch (e)
{

}

export {}
