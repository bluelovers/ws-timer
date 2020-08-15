/**
 * Created by user on 2017/11/10/010.
 */
import moment from 'moment';
export interface ITimeData {
    id?: number;
    real_init?: moment.Moment;
    fake_init?: moment.Moment;
    fake_now?: moment.Moment;
    fake_old?: moment.Moment;
}
export declare class Time {
    data: ITimeData;
    constructor(options?: ITimeData);
    _init(): void;
    static new(options?: ITimeData): Time;
    get static(): any;
    static isValidDate(who: any): boolean;
    update(amount?: any, unit?: string): this;
    id(bool?: boolean): number;
    now(): moment.Moment;
}
export default Time;
