import { IThing, IThingInput } from './lib/types';
export declare class Tic {
    #private;
    protected _things: Map<number, IThing<any[]>>;
    protected _dt: number;
    protected _id: number;
    protected _next: number;
    protected _now: number;
    get now(): number;
    protected _stack<T extends any[]>(thing: IThingInput<T>): () => boolean;
    interval<T extends any[]>(fn: IThing<T>["fn"], timeout: number, ...args: T): () => boolean;
    add<T extends any[]>(fn: IThing<T>["fn"], timeout: number, ...args: T): () => boolean;
    delete(id: number): boolean;
    tick(dt?: number): this;
    tickAsync(dt?: number): Promise<this>;
    get length(): number;
}
export default Tic;
