/**
 * Created by user on 2017/11/10/010.
 */
import moment from 'moment';
import { QueueTimer, ICallback, ITimeQueueItem, ITimeData } from './queue';
export interface ITimerFunc extends Function {
    (callback: ICallback, delay: number, ...params: any[]): any;
    (callback: ICallback, delay: moment.Duration, ...params: any[]): any;
}
export interface ITimer {
    setTimeout: ITimerFunc;
    setInterval: ITimerFunc;
    setImmediate(callback: ICallback, ...params: any[]): any;
}
export declare class Timer implements ITimer {
    timer: QueueTimer;
    cache: {
        done: ITimeQueueItem[];
    };
    constructor(options?: ITimeData);
    setTimeout(callback: ICallback, delay: number | moment.Duration, ...params: any[]): Promise<ITimeQueueItem>;
    setInterval(callback: ICallback, delay: number | moment.Duration, ...params: any[]): Promise<ITimeQueueItem>;
    setImmediate(callback: ICallback, ...params: any[]): Promise<ITimeQueueItem>;
    start(amount?: number | moment.Duration): Promise<this>;
    run(): Promise<this>;
}
export declare const init: Timer;
export default init;
export declare const setTimeout: (callback: ICallback, delay: number | moment.Duration, ...params: any[]) => Promise<ITimeQueueItem>;
export declare const setInterval: (callback: ICallback, delay: number | moment.Duration, ...params: any[]) => Promise<ITimeQueueItem>;
export declare const setImmediate: (callback: ICallback, ...params: any[]) => Promise<ITimeQueueItem>;
