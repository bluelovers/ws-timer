/**
 * Created by user on 2017/11/10/010.
 */

import * as moment from 'moment';
import { QueueTimer, ICallback, ITimeQueueItem, ITimeQueueItemAdd, ITimeData } from './queue.timer';
import { autobind, readonly, nonconfigurable, coreDecorators } from './lib/decorators';

export interface ITimerFunc extends Function
{
	(callback: ICallback, delay: number, ...params);

	(callback: ICallback, delay: moment.Duration, ...params);
}

export interface ITimer
{
	setTimeout: ITimerFunc;
	setInterval: ITimerFunc;

	setImmediate(callback: ICallback, ...params);
}

@autobind
export class Timer implements ITimer
{

	public timer: QueueTimer;
	public cache = {
		done: [] as ITimeQueueItem[],
	};

	constructor(options?: ITimeData)
	{
		this.timer = QueueTimer.new(options);
	}

	async setTimeout(callback: ICallback, delay: number | moment.Duration, ...params)
	{
		let q = this.timer.add({
			callback: callback,
			timing: moment.duration(delay),
			params: params,
			type: 'setTimeout',
		});

		return q;
	}

	async setInterval(callback: ICallback, delay: number | moment.Duration, ...params)
	{
		let q = this.timer.add({
			callback: callback,
			timing: moment.duration(delay),
			params: params,
			type: 'setInterval',
		});

		return q;
	}

	async setImmediate(callback: ICallback, ...params)
	{
		let q = this.timer.add({
			callback: callback,
			timing: moment.duration(0),
			params: params,
			type: 'setImmediate',
		});

		return q;
	}

	async start(amount?: number | moment.Duration)
	{
		if (amount < 0)
		{
			amount = this.timer.cache.min;
		}

		await this.timer.update(amount);
		await this.timer.sort();

		if (this.timer.hasExpires())
		{
			await this.run();
		}

		return this;
	}

	async run()
	{
		let now = this.timer.now();

		this.cache.done = [];

		for (let idx in this.timer.queue)
		{
			let current = this.timer.queue[idx];

			if (now.diff(current.timing) >= 0)
			{
				current.active = moment();
				await current.callback(current, this.timer);

				this.timer.remove(idx);

				current.ending = moment();
				this.cache.done.push(current);
			}
			else
			{
				break;
			}
		}

		this.timer._cache_refresh();

		return this;
	}
}

export const init = new Timer();

export default init;

export const setTimeout = init.setTimeout;
export const setInterval = init.setInterval;
export const setImmediate = init.setImmediate;

