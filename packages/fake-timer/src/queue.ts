/**
 * Created by user on 2017/11/10/010.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import minMax from 'dayjs/plugin/minMax';
import { nanoid } from 'nanoid';
import { Time, ITimeData as ITimeData2 } from './time';

dayjs.extend(duration);
dayjs.extend(minMax);

export type vMoment = dayjs.Dayjs | duration.Duration;

export interface ITimeQueueItem
{
	id?: number;
	timing?: dayjs.Dayjs;
	active?: dayjs.Dayjs;
	ending?: dayjs.Dayjs;

	name?: string;
	callback?: ICallback;

	params?: any[],

	[key: string]: any;
}

export interface ITimeQueueItemAdd extends ITimeQueueItem
{
	timing?: dayjs.Dayjs | duration.Duration | any;
}

export interface ITimeData extends ITimeData2
{
	sort?: ISortCallback;
}

export interface ISortCallback extends Function
{
	(a: ITimeQueueItem, b: ITimeQueueItem);
}

export interface ISetTimeout extends Function
{
	(callback: ICallback, delay: number, immediate: boolean);
	(callback: ICallback, delay: duration.Duration, immediate: boolean);
}

export interface ICallback extends Function
{
	(current: ITimeQueueItem, timer: QueueTimer, self?)
}

export class QueueTimer extends Time
{
	public queue = [] as ITimeQueueItem[];
	public cache = {
		min: null,
		max: null,
	} as any;

	public override data: ITimeData;

	constructor()
	{
		super(...arguments);

		//this.data.sort = queueSortCallback;
	}

	get length()
	{
		return this.queue.length;
	}

	add = (q: ITimeQueueItemAdd): ITimeQueueItem =>
	{
		q.timing = q.timing || this.now();

		q = Object.assign({
			id: null,
			name: null,
			timing: null,
		}, q, {
			id: this.id(),
			name: nanoid(),
			timing: dayjs.isDuration(q.timing) ? this.now().add(q.timing) : q.timing,
			index: this.length,
		});

		this._cache_timing(q.timing);

		this.queue.push(q as ITimeQueueItem);

		return q as ITimeQueueItem;
	};

	_cache_refresh = (): void =>
	{
		this.cache.min = this.length ? this.eq(0).timing : null;
		this.cache.max = this.length ? this.eq(-1).timing : null;
	};

	_cache_timing = (timing, reset?: boolean): void =>
	{
		if (reset)
		{
			this.cache.max = null;
			this.cache.min = null;
		}

		this.cache.max = this.cache.max ? dayjs.max(this.cache.max, timing) : timing;
		this.cache.min = this.cache.min ? dayjs.min(this.cache.min, timing) : timing;
	};

	sort = (cb?: ISortCallback): this =>
	{
		let self = this;

		let q = this.queue.sort(cb || this.data.sort || queueSortCallback);

		this._cache_timing(null, true);

		this.queue.map(function (q, index)
		{
			q.index = index;

			self._cache_timing(q.timing);
		});

		return this;
	};

	eq = (idx: number): ITimeQueueItem =>
	{
		if (idx == -1)
		{
			idx = this.length - 1;
		}

		return this.queue[idx];
	};

	protected _remove = (idx): ITimeQueueItem | null =>
	{
		let q = this.queue.splice(idx, 1);

		//console.log(777, q.length, q);

		if (q.length == 1)
		{
			return q[0];
		}

		return null;
	};

	remove = (id: number | string | ITimeQueueItem): null | ITimeQueueItem =>
	{
		//console.log(typeof id, id);

		// @ts-ignore
		if (typeof id == 'number' || (id in this.queue))
		{
			return this._remove(id);
		}
		else if ((id as ITimeQueueItem).name)
		{
			id = (id as ITimeQueueItem).name;
		}

		id = this.queue.findIndex(function (q)
		{
			return (q.name == id);
		});

		if (id > -1)
		{
			return this._remove(id);
		}

		return null;
	};

	// @ts-ignore
	static new(options?: ITimeData)
	{
		return super.new() as QueueTimer;
	}

	hasExpires = (): boolean =>
	{
		let d = this.now().diff(this.cache.min);

		return (d >= 0);
	};
}

export default QueueTimer;

export function queueSortCallback(a: ITimeQueueItem, b: ITimeQueueItem)
{
	let d = a.timing.diff(b.timing);

	//console.log(d, a.id, b.id);

	if (d == 0)
	{
		return a.id > b.id;
	}

	return a.timing.diff(b.timing);
}

export function queueSortCallback2(a: ITimeQueueItem, b: ITimeQueueItem)
{
	let d = a.timing.diff(b.timing);

	//console.log(d, a.id, b.id);

	if (d == 0)
	{
		return a.id < b.id;
	}

	return a.timing.diff(b.timing);
}
