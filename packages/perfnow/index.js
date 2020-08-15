"use strict";
/**
 * @file perfnow is a 0.1 kb performance.now high resolution timer polyfill with Date fallback
 * @author Daniel Lamb <dlamb.open.source@gmail.com>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.now = void 0;
const polyfill_1 = require("./polyfill");
const now = polyfill_1.getPerformanceNow();
exports.now = now;
exports.default = now;
//# sourceMappingURL=index.js.map