/**
 * Created by user on 2017/11/10/010.
 */
import moment from 'moment';
import { Time, ITimeData as ITimeData2 } from './lib/time';
export declare type vMoment = moment.Moment | moment.Duration;
export interface ITimeQueueItem {
    id?: number;
    timing?: moment.Moment;
    active?: moment.Moment;
    ending?: moment.Moment;
    name?: string;
    callback?: ICallback;
    params?: any[];
    [key: string]: any;
}
export interface ITimeQueueItemAdd extends ITimeQueueItem {
    timing?: moment.Moment | moment.Duration | any;
}
export interface ITimeData extends ITimeData2 {
    sort?: ISortCallback;
}
export interface ISortCallback extends Function {
    (a: ITimeQueueItem, b: ITimeQueueItem): any;
}
export interface ISetTimeout extends Function {
    (callback: ICallback, delay: number, immediate: boolean): any;
    (callback: ICallback, delay: moment.Duration, immediate: boolean): any;
}
export interface ICallback extends Function {
    (current: ITimeQueueItem, timer: QueueTimer, self?: any): any;
}
export declare class QueueTimer extends Time {
    queue: ITimeQueueItem[];
    cache: any;
    data: ITimeData;
    constructor();
    get length(): number;
    add(q: ITimeQueueItemAdd): ITimeQueueItem;
    _cache_refresh(): void;
    _cache_timing(timing: any, reset?: boolean): void;
    sort(cb?: ISortCallback): this;
    eq(idx: number): ITimeQueueItem;
    protected _remove(idx: any): ITimeQueueItem;
    remove(id: number | string | ITimeQueueItem): null | ITimeQueueItem;
    static new(options?: ITimeData): QueueTimer;
    hasExpires(): boolean;
}
export default QueueTimer;
export declare function queueSortCallback(a: ITimeQueueItem, b: ITimeQueueItem): number | boolean;
export declare function queueSortCallback2(a: ITimeQueueItem, b: ITimeQueueItem): number | boolean;
