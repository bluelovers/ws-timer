"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPositiveNumber = exports.positiveNumber = void 0;
function positiveNumber(n) {
    if (isPositiveNumber(n)) {
        return n;
    }
}
exports.positiveNumber = positiveNumber;
function isPositiveNumber(n) {
    return (typeof n === 'number' && !Number.isNaN(n) && n >= 0);
}
exports.isPositiveNumber = isPositiveNumber;
//# sourceMappingURL=positiveNumber.js.map