"use strict";
/**
 * Created by user on 2017/11/10/010.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Time = void 0;
const moment_1 = __importDefault(require("moment"));
class Time {
    constructor(options) {
        this.data = {};
        let now;
        if (this.static.isValidDate(options)) {
            [options, now] = [{}, options];
        }
        this.data = Object.assign(this.data, {
            id: 0,
            real_init: moment_1.default(),
            fake_init: moment_1.default(now),
            fake_now: moment_1.default(now),
        }, options);
        this._init();
    }
    _init() {
        for (let i in this.data) {
            if (this.data[i] instanceof moment_1.default) {
                this.data[i] = this.data[i].clone();
            }
        }
    }
    static new(options) {
        let t = new this(options);
        return t;
    }
    get static() {
        // @ts-ignore
        return this.__proto__.constructor;
    }
    static isValidDate(who) {
        if (who instanceof moment_1.default || who instanceof Date) {
            return true;
        }
        else if (typeof who == 'number' && moment_1.default(who).isValid()) {
            return true;
        }
        else if (Date.parse(who)) {
            return true;
        }
        return false;
    }
    update(amount = 100, unit) {
        //this.data.real_update = moment();
        this.data.fake_old = this.data.fake_now.clone();
        if (moment_1.default.isDuration(amount)) {
            this.data.fake_now.add(amount);
        }
        else if (typeof amount == 'object') {
            this.data.fake_now = moment_1.default(amount);
        }
        else if (unit || typeof amount == 'number') {
            this.data.fake_now.add(amount, unit);
        }
        else {
            this.data.fake_now.add(100);
        }
        return this;
    }
    id(bool) {
        return bool ? this.data.id : this.data.id++;
    }
    now() {
        return this.data.fake_now.clone();
    }
}
exports.Time = Time;
exports.default = Time;
//# sourceMappingURL=time.js.map