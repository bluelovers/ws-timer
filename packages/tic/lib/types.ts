import { ITSResolvable } from 'ts-type/lib/generic';

export interface IThingInput<T extends any[] = any[]>
{
	fn: (thing: IThing<T>, key: number, argv: T) => ITSResolvable<any>;
	timeout: number,
	args: T;
	elapsed: number;
	limit: number;
	at?: number;
}

export interface IThing<T extends any[] = any[]> extends IThingInput<T>
{
	at: number;
}
