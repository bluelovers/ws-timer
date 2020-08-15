"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerformanceNow = void 0;
const process_1 = require("./lib/process");
const perf_hooks_1 = require("./lib/perf_hooks");
const globalthis_1 = require("./lib/globalthis");
const date_1 = require("./lib/date");
function getPerformanceNow(_global) {
    var _a, _b, _c;
    const now = (_c = (_b = (_a = globalthis_1.getPerformanceNowByGlobalThis(_global)) !== null && _a !== void 0 ? _a : perf_hooks_1.getPerformanceNowByNodePerfHooks()) !== null && _b !== void 0 ? _b : process_1.getPerformanceNowByProcess()) !== null && _c !== void 0 ? _c : date_1.getPerformanceNowByDate();
    return now;
}
exports.getPerformanceNow = getPerformanceNow;
exports.default = getPerformanceNow;
//# sourceMappingURL=polyfill.js.map