"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerformanceNowByGlobalThis = exports.getPerformanceByGlobalThis = void 0;
const polyfill_1 = __importDefault(require("globalthis/polyfill"));
function getPerformanceByGlobalThis(_global) {
    var _a;
    return (_a = (_global !== null && _global !== void 0 ? _global : polyfill_1.default())) === null || _a === void 0 ? void 0 : _a.performance;
}
exports.getPerformanceByGlobalThis = getPerformanceByGlobalThis;
function getPerformanceNowByGlobalThis(_global) {
    var _a, _b, _c, _d;
    const perf = getPerformanceByGlobalThis(_global);
    if (typeof perf !== 'undefined') {
        return (_d = (_c = (_b = (_a = perf.now) !== null && _a !== void 0 ? _a : perf.mozNow) !== null && _b !== void 0 ? _b : perf.msNow) !== null && _c !== void 0 ? _c : perf.oNow) !== null && _d !== void 0 ? _d : perf.webkitNow;
    }
}
exports.getPerformanceNowByGlobalThis = getPerformanceNowByGlobalThis;
//# sourceMappingURL=globalthis.js.map