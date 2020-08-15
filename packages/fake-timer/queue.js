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
exports.queueSortCallback2 = exports.queueSortCallback = exports.QueueTimer = void 0;
const moment_1 = __importDefault(require("moment"));
const shortid_1 = __importDefault(require("shortid"));
const time_1 = require("./lib/time");
const decorators_1 = require("./lib/decorators");
let QueueTimer = class QueueTimer extends time_1.Time {
    constructor() {
        super(...arguments);
        this.queue = [];
        this.cache = {
            min: null,
            max: null,
        };
        //this.data.sort = queueSortCallback;
    }
    get length() {
        return this.queue.length;
    }
    add(q) {
        q.timing = q.timing || this.now();
        q = Object.assign({
            id: null,
            name: null,
            timing: null,
        }, q, {
            id: this.id(),
            name: shortid_1.default(),
            timing: moment_1.default.isDuration(q.timing) ? this.now().add(q.timing) : q.timing.clone(),
            index: this.length,
        });
        this._cache_timing(q.timing);
        this.queue.push(q);
        return q;
    }
    _cache_refresh() {
        this.cache.min = this.length ? this.eq(0).timing : null;
        this.cache.max = this.length ? this.eq(-1).timing : null;
    }
    _cache_timing(timing, reset) {
        if (reset) {
            this.cache.max = null;
            this.cache.min = null;
        }
        this.cache.max = this.cache.max ? moment_1.default.max(this.cache.max, timing) : timing;
        this.cache.min = this.cache.min ? moment_1.default.min(this.cache.min, timing) : timing;
    }
    sort(cb) {
        let self = this;
        let q = this.queue.sort(cb || this.data.sort || queueSortCallback);
        this._cache_timing(null, true);
        this.queue.map(function (q, index) {
            q.index = index;
            self._cache_timing(q.timing);
        });
        return this;
    }
    eq(idx) {
        if (idx == -1) {
            idx = this.length - 1;
        }
        return this.queue[idx];
    }
    _remove(idx) {
        let q = this.queue.splice(idx, 1);
        //console.log(777, q.length, q);
        if (q.length == 1) {
            return q[0];
        }
        return null;
    }
    remove(id) {
        //console.log(typeof id, id);
        // @ts-ignore
        if (typeof id == 'number' || (id in this.queue)) {
            return this._remove(id);
        }
        else if (id.name) {
            id = id.name;
        }
        id = this.queue.findIndex(function (q) {
            return (q.name == id);
        });
        if (id > -1) {
            return this._remove(id);
        }
        return null;
    }
    // @ts-ignore
    static new(options) {
        return super.new();
    }
    hasExpires() {
        let d = this.now().diff(this.cache.min);
        return (d >= 0);
    }
};
QueueTimer = __decorate([
    decorators_1.autobind,
    __metadata("design:paramtypes", [])
], QueueTimer);
exports.QueueTimer = QueueTimer;
exports.default = QueueTimer;
function queueSortCallback(a, b) {
    let d = a.timing.diff(b.timing);
    //console.log(d, a.id, b.id);
    if (d == 0) {
        return a.id > b.id;
    }
    return a.timing.diff(b.timing);
}
exports.queueSortCallback = queueSortCallback;
function queueSortCallback2(a, b) {
    let d = a.timing.diff(b.timing);
    //console.log(d, a.id, b.id);
    if (d == 0) {
        return a.id < b.id;
    }
    return a.timing.diff(b.timing);
}
exports.queueSortCallback2 = queueSortCallback2;
//# sourceMappingURL=queue.js.map