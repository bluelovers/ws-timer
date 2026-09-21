/**
 * Created by user on 2017/11/10/010.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { QueueTimer, ICallback, ITimeQueueItem, ITimeQueueItemAdd, ITimeData } from './queue';
import { toDuration } from './time';

dayjs.extend(duration);

export interface ITimerFunc extends Function
{
	(callback: ICallback, delay: number, ...params: any[]);

	(callback: ICallback, delay: duration.Duration, ...params: any[]);
}

export interface ITimer
{
	setTimeout: ITimerFunc;
	setInterval: ITimerFunc;

	setImmediate(callback: ICallback, ...params: any[]);
}

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

	setTimeout = async (callback: ICallback, delay: number | duration.Duration, ...params: any[]) =>
	{
		let q = this.timer.add({
			callback: callback,
			timing: toDuration(delay),
			params: params,
			type: 'setTimeout',
		});

		return q;
	};

	setInterval = async (callback: ICallback, delay: number | duration.Duration, ...params: any[]) =>
	{
		let q = this.timer.add({
			callback: callback,
			timing: toDuration(delay),
			params: params,
			type: 'setInterval',
		});

		return q;
	};

	setImmediate = async (callback: ICallback, ...params: any[]) =>
	{
		let q = this.timer.add({
			callback: callback,
			timing: dayjs.duration(0),
			params: params,
			type: 'setImmediate',
		});

		return q;
	};

	start = async (amount?: number | duration.Duration) =>
	{
		if ((amount as number) < 0)
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
	};

	run = async () =>
	{
		let now = this.timer.now();

		this.cache.done = [];

		for (let idx in this.timer.queue)
		{
			let current = this.timer.queue[idx];

			if (now.diff(current.timing) >= 0)
			{
				current.active = dayjs();
				await current.callback(current, this.timer);

				this.timer.remove(idx);

				current.ending = dayjs();
				this.cache.done.push(current);
			}
			else
			{
				break;
			}
		}

		this.timer._cache_refresh();

		return this;
	};
}

export const init = new Timer();

export default init;

export const setTimeout = init.setTimeout;
export const setInterval = init.setInterval;
export const setImmediate = init.setImmediate;
