"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerformanceNowByProcess = void 0;
/**
 * @see https://github.com/myrne/performance-now/blob/master/src/performance-now.coffee
 */
function getPerformanceNowByProcess() {
    if (typeof process !== 'undefined' && typeof process.hrtime === 'function' && typeof process.uptime === 'function') {
        function getNanoSeconds() {
            const hr = process.hrtime();
            return hr[0] * 1e9 + hr[1];
        }
        const nodeLoadTime = getNanoSeconds() - (process.uptime() * 1e9);
        return function now() {
            return (getNanoSeconds() - nodeLoadTime) / 1e6;
        };
    }
}
exports.getPerformanceNowByProcess = getPerformanceNowByProcess;
//# sourceMappingURL=process.js.map