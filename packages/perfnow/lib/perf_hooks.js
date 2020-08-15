"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerformanceNowByNodePerfHooks = exports.getPerformanceByNodePerfHooks = void 0;
function getPerformanceByNodePerfHooks() {
    try {
        const { performance } = require("perf_hooks");
        return performance;
    }
    catch (e) {
    }
}
exports.getPerformanceByNodePerfHooks = getPerformanceByNodePerfHooks;
/**
 * @see https://github.com/myrne/performance-now/issues/28
 */
function getPerformanceNowByNodePerfHooks() {
    try {
        return getPerformanceByNodePerfHooks().now;
    }
    catch (e) {
    }
}
exports.getPerformanceNowByNodePerfHooks = getPerformanceNowByNodePerfHooks;
//# sourceMappingURL=perf_hooks.js.map