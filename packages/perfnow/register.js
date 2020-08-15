"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
var _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
const polyfill_1 = __importDefault(require("globalthis/polyfill"));
const index_1 = __importDefault(require("./index"));
const perf_hooks_1 = require("./lib/perf_hooks");
const _g = polyfill_1.default();
try {
    // @ts-ignore
    (_a = (_c = _g).performance) !== null && _a !== void 0 ? _a : (_c.performance = perf_hooks_1.getPerformanceByNodePerfHooks());
    (_b = (_d = _g.performance).now) !== null && _b !== void 0 ? _b : (_d.now = index_1.default);
}
catch (e) {
}
//# sourceMappingURL=register.js.map