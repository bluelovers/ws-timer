/// <reference types="node" />
import { Performance } from "perf_hooks";
export declare function getPerformanceByNodePerfHooks(): Performance;
/**
 * @see https://github.com/myrne/performance-now/issues/28
 */
export declare function getPerformanceNowByNodePerfHooks(): () => number;
