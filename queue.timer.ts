/**
 * Created by user on 2017/11/10/010.
 */

import * as moment from 'moment';
import * as shortid from 'shortid';
import { Time, ITimeData as ITimeData2 } from './lib/time';
import { autobind } from './lib/decorators';

import * as array_shuffle from 'shuffle-array';

export type vMoment = moment.Moment | moment.Duration;

export interface ITimeQueueItem
{
	id?: number;
	timing?: moment.Moment;

	name?: string;
	callback?: ICallback;

	[key: string]: any;
}

export interface ITimeQueueItemAdd extends ITimeQueueItem
{
	timing?: moment.Moment | moment.Duration | any;
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
	(callback: ICallback, delay: number, immediate: boolean)
}

export interface ICallback extends Function
{
	(current: ITimeQueueItem, timer: QueueTimer)
}

@autobind
export class QueueTimer extends Time
{
	public queue = [] as ITimeQueueItem[];
	public cache = {
		min: null,
		max: null,
	} as any;

	public data: ITimeData;

	constructor()
	{
		super(...arguments);

		//this.data.sort = queueSortCallback;
	}

	get length()
	{
		return this.queue.length;
	}

	add(q: ITimeQueueItemAdd)
	{
		q.timing = q.timing || this.now();

		q = Object.assign({
			id: null,
			name: null,
			timing: null,
		}, q, {
			id: this.id(),
			name: shortid(),
			timing: moment.isDuration(q.timing) ? this.now().add(q.timing) : q.timing.clone(),
			index: this.length,
		});

		this._cache_timing(q.timing);

		this.queue.push(q as ITimeQueueItem);

		return this;
	}

	protected _cache_timing(timing, reset?: boolean)
	{
		if (reset)
		{
			this.cache.max = null;
			this.cache.min = null;
		}

		this.cache.max = this.cache.max ? moment.max(this.cache.max, timing) : timing;
		this.cache.min = this.cache.min ? moment.min(this.cache.min, timing) : timing;
	}

	sort(cb?: ISortCallback)
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
	}

	eq(idx: number)
	{
		return this.queue[idx];
	}

	protected _remove(idx)
	{
		let q = this.queue.splice(idx, 1);

		if (q.length == 1)
		{
			return q[0];
		}

		return null;
	}

	remove(id: number | string | ITimeQueueItem): null | ITimeQueueItem
	{
		if (typeof id == 'number')
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
	}

	// @ts-ignore
	static new(options?: ITimeData)
	{
		return super.new() as QueueTimer;
	}

	hasExpires()
	{
		let d = this.now().diff(this.cache.min);

		return (d >= 0);
	}
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

(async () =>
{
	let t = QueueTimer.new();

	function setTimeout2(cb: ICallback, delay)
	{
		return t.add({
			callback: cb,
			timing: moment.duration(delay, 'ms'),
		});
	}

	for (let i = 0; i < 30; i++)
	{
		let q = {
			timing: moment.duration(1 * i, 's'),
		};

		t.add(q);
	}

	{
		let q = {
			//id: i,
			//name: shortid(),
			timing: moment.duration(0, 's'),
		};

		t.add(q);
	}

	setTimeout2((timer) =>
	{

	}, 5000);

	console.log(t);

	//t.queue.reverse();

	array_shuffle(t.queue);

	t.sort();

	//t.update(5000, 'ms');

	let a = t.hasExpires();

	//console.log(t.queue, t.length);

	console.log(a);

	let r = t.remove(-1);

	console.log(r);

	console.log(t.queue);

	//await sleep(5000);

	//console.log(t.update(), t.now().diff(t.data.fake_old), moment().valueOf());
})();

function sleep(ms)
{
	return new Promise(function (done)
	{
		setTimeout(done, ms);
	});
}

function identity<T>(arg: T): T
{
	return arg;
}

let myIdentity: { <T>(arg: T): T } = identity;
