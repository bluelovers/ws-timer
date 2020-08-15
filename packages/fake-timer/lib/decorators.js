"use strict";
/**
 * Created by user on 2017/8/5/005.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decorate = exports.enumerable = exports.nonenumerable = exports.writable = exports.configurable = exports.coreDecorators = exports.nonconfigurable = exports.readonly = exports.autobind = void 0;
const coreDecorators = __importStar(require("core-decorators"));
exports.coreDecorators = coreDecorators;
const core_decorators_1 = require("core-decorators");
Object.defineProperty(exports, "autobind", { enumerable: true, get: function () { return core_decorators_1.autobind; } });
Object.defineProperty(exports, "readonly", { enumerable: true, get: function () { return core_decorators_1.readonly; } });
Object.defineProperty(exports, "nonconfigurable", { enumerable: true, get: function () { return core_decorators_1.nonconfigurable; } });
/**
 * configurable：是否可刪除特性或修改特性的 writable、configurable 與 enumerable 屬性。
 */
function configurable(target, key, descriptor) {
    return decorate(target, key, {
        configurable: true,
    }, descriptor);
}
exports.configurable = configurable;
/**
 * writable：是否可修改特性值。
 */
function writable(target, key, descriptor) {
    return decorate(target, key, {
        writable: true,
    }, descriptor);
}
exports.writable = writable;
/**
 * enumerable：是否可使用 for (var prop in obj) 迭代。
 */
function nonenumerable(target, key, descriptor) {
    return decorate(target, key, {
        enumerable: false,
    }, descriptor);
}
exports.nonenumerable = nonenumerable;
/**
 * enumerable：是否可使用 for (var prop in obj) 迭代。
 */
function enumerable(target, key, descriptor) {
    return decorate(target, key, {
        enumerable: true,
    }, descriptor);
}
exports.enumerable = enumerable;
function decorate(target, key, attr, descriptor) {
    Object.defineProperty(target, key, attr);
    return descriptor;
}
exports.decorate = decorate;
//# sourceMappingURL=decorators.js.map