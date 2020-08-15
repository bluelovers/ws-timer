"use strict";
/**
 * Created by user on 2017/11/10/010.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setImmediate = exports.setInterval = exports.setTimeout = exports.init = exports.Timer = void 0;
const moment_1 = __importDefault(require("moment"));
const queue_1 = require("./queue");
const decorators_1 = require("./lib/decorators");
let Timer = class Timer {
    constructor(options) {
        this.cache = {
            done: [],
        };
        this.timer = queue_1.QueueTimer.new(options);
    }
    async setTimeout(callback, delay, ...params) {
        let q = this.timer.add({
            callback: callback,
            timing: moment_1.default.duration(delay),
            params: params,
            type: 'setTimeout',
        });
        return q;
    }
    async setInterval(callback, delay, ...params) {
        let q = this.timer.add({
            callback: callback,
            timing: moment_1.default.duration(delay),
            params: params,
            type: 'setInterval',
        });
        return q;
    }
    async setImmediate(callback, ...params) {
        let q = this.timer.add({
            callback: callback,
            timing: moment_1.default.duration(0),
            params: params,
            type: 'setImmediate',
        });
        return q;
    }
    async start(amount) {
        if (amount < 0) {
            amount = this.timer.cache.min;
        }
        await this.timer.update(amount);
        await this.timer.sort();
        if (this.timer.hasExpires()) {
            await this.run();
        }
        return this;
    }
    async run() {
        let now = this.timer.now();
        this.cache.done = [];
        for (let idx in this.timer.queue) {
            let current = this.timer.queue[idx];
            if (now.diff(current.timing) >= 0) {
                current.active = moment_1.default();
                await current.callback(current, this.timer);
                this.timer.remove(idx);
                current.ending = moment_1.default();
                this.cache.done.push(current);
            }
            else {
                break;
            }
        }
        this.timer._cache_refresh();
        return this;
    }
};
Timer = __decorate([
    decorators_1.autobind,
    __metadata("design:paramtypes", [Object])
], Timer);
exports.Timer = Timer;
exports.init = new Timer();
exports.default = exports.init;
exports.setTimeout = exports.init.setTimeout;
exports.setInterval = exports.init.setInterval;
exports.setImmediate = exports.init.setImmediate;
//# sourceMappingURL=timer.js.map