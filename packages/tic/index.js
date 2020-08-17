"use strict";
/*
 * tic
 * https://github.com/shama/tic
 *
 * Copyright (c) 2014 Kyle Robinson Young
 * Licensed under the MIT license.
 */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __timestamp_base;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tic = void 0;
const index_1 = require("performance-now2/index");
const nextAt_1 = require("./lib/nextAt");
const positiveNumber_1 = require("./lib/positiveNumber");
const map_1 = require("least-recently-record/map");
class Tic {
    constructor(options) {
        this._dt = -1;
        this._id = 0;
        this._now = 0;
        __timestamp_base.set(this, void 0);
        if (options === null || options === void 0 ? void 0 : options.disableLeastRecentlyMode) {
            this._things = new Map();
        }
        else {
            this._things = new map_1.LeastRecentlyMap();
        }
    }
    get now() {
        return this._now;
    }
    _stack(thing) {
        var _a;
        if (positiveNumber_1.isPositiveNumber(thing.limit)) {
            thing.limit || (thing.limit = 1);
        }
        else if (thing.limit < 0) {
            thing.limit = Infinity;
        }
        const id = ++this._id;
        __classPrivateFieldSet(this, __timestamp_base, (_a = __classPrivateFieldGet(this, __timestamp_base)) !== null && _a !== void 0 ? _a : index_1.now());
        if (!Number.isFinite(this._now) && this._now > 0) {
            thing.at = this._now + thing.timeout;
        }
        else {
            thing.at = thing.timeout;
        }
        this._next = nextAt_1.nextAt(this._next, thing.at);
        this._things.set(id, thing);
        return () => {
            return this.delete(id);
        };
    }
    interval(fn, timeout, ...args) {
        return this._stack({
            fn,
            timeout,
            args,
            elapsed: 0,
            limit: -1,
        });
    }
    add(fn, timeout, ...args) {
        return this._stack({
            fn,
            timeout,
            args,
            elapsed: 0,
            limit: 1,
        });
    }
    delete(id) {
        if (positiveNumber_1.isPositiveNumber(this._next) && this._things.has(id)) {
            let _next;
            this._things.forEach(((thing, key) => {
                if (key !== id) {
                    _next = nextAt_1.nextAt(_next, thing.at);
                }
            }));
            this._next = _next;
        }
        return this._things.delete(id);
    }
    tick(dt) {
        var _a;
        if (arguments.length < 1) {
            __classPrivateFieldSet(this, __timestamp_base, (_a = __classPrivateFieldGet(this, __timestamp_base)) !== null && _a !== void 0 ? _a : index_1.now());
            if (!positiveNumber_1.isPositiveNumber(this._next)) {
                dt = index_1.now() - __classPrivateFieldGet(this, __timestamp_base);
            }
            else {
                dt = this._next - this.now;
            }
        }
        if (!positiveNumber_1.isPositiveNumber(dt)) {
            throw new TypeError(`${dt} should be a positive number`);
        }
        this._dt = dt;
        const _next_now = this.now + dt;
        let _now = Math.min(_next_now, this._next);
        do {
            let _next;
            let _bool;
            for (const [key, thing] of this._things.entries()) {
                if (_now >= thing.at) {
                    thing.fn(thing, key, thing.args);
                    if (--thing.limit > 0) {
                        thing.elapsed = _now;
                        thing.at += thing.timeout;
                        _next = nextAt_1.nextAt(_next, thing.at);
                        this._things.set(key, thing);
                    }
                    else {
                        this._things.delete(key);
                    }
                    _bool = true;
                }
                else {
                    _next = nextAt_1.nextAt(_next, thing.at);
                }
            }
            this._next = _next;
            if (_bool === true) {
                _now = _next !== null && _next !== void 0 ? _next : _now;
            }
            else {
                _now = _next_now;
                break;
            }
        } while (_next_now >= _now);
        this._now = _next_now;
        return this;
    }
    async tickAsync(dt) {
        var _a;
        if (arguments.length < 1) {
            __classPrivateFieldSet(this, __timestamp_base, (_a = __classPrivateFieldGet(this, __timestamp_base)) !== null && _a !== void 0 ? _a : index_1.now());
            if (!positiveNumber_1.isPositiveNumber(this._next)) {
                dt = index_1.now() - __classPrivateFieldGet(this, __timestamp_base);
            }
            else {
                dt = this._next - this.now;
            }
        }
        if (!positiveNumber_1.isPositiveNumber(dt)) {
            throw new TypeError(`${dt} should be a positive number`);
        }
        this._dt = dt;
        const _next_now = this.now + dt;
        let _now = Math.min(_next_now, this._next);
        do {
            let _next;
            let _bool;
            for await (const [key, thing] of this._things.entries()) {
                if (_now >= thing.at) {
                    await thing.fn(thing, key, thing.args);
                    if (--thing.limit > 0) {
                        thing.elapsed = _now;
                        thing.at += thing.timeout;
                        _next = nextAt_1.nextAt(_next, thing.at);
                    }
                    else {
                        this._things.delete(key);
                    }
                    _bool = true;
                }
                else {
                    _next = nextAt_1.nextAt(_next, thing.at);
                }
            }
            this._next = _next;
            if (_bool === true) {
                _now = _next !== null && _next !== void 0 ? _next : _now;
            }
            else {
                _now = _next_now;
                break;
            }
        } while (_next_now >= _now);
        this._now = _next_now;
        return this;
    }
    get length() {
        return this._things.size;
    }
}
exports.Tic = Tic;
__timestamp_base = new WeakMap();
exports.default = Tic;
//# sourceMappingURL=index.js.map