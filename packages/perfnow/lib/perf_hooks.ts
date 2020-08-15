import { Performance } from "perf_hooks";

export function getPerformanceByNodePerfHooks(): Performance
{
	try
	{
		const { performance } = require("perf_hooks")
		return performance
	}
	catch (e)
	{

	}
}

/**
 * @see https://github.com/myrne/performance-now/issues/28
 */
export function getPerformanceNowByNodePerfHooks(): () => number
{
	try
	{
		return getPerformanceByNodePerfHooks().now
	}
	catch (e)
	{

	}
}
