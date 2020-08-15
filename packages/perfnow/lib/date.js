"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerformanceNowByDate = void 0;
function getPerformanceNowByDate() {
    var _a;
    return (_a = Date.now) !== null && _a !== void 0 ? _a : (function now() {
        return new Date().getTime();
    });
}
exports.getPerformanceNowByDate = getPerformanceNowByDate;
//# sourceMappingURL=date.js.map