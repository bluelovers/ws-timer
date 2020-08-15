"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextAt = void 0;
const positiveNumber_1 = require("./positiveNumber");
function nextAt(next, at, ...argv) {
    var _a;
    return Math.max(0, Math.min((_a = positiveNumber_1.positiveNumber(next)) !== null && _a !== void 0 ? _a : at, at, ...argv));
}
exports.nextAt = nextAt;
//# sourceMappingURL=nextAt.js.map