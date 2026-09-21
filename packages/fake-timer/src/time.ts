/**
 * Created by user on 2017/11/10/010.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

export function toDuration(value: number | duration.Duration): duration.Duration
{
	return dayjs.isDuration(value) ? value : dayjs.duration(value);
}

export interface ITimeData
{
	id?: number;
	real_init?: dayjs.Dayjs;

	fake_init?: dayjs.Dayjs;
	fake_now?: dayjs.Dayjs;
	fake_old?: dayjs.Dayjs;
}

export class Time
{
	public data = {} as ITimeData;

	constructor(options?: ITimeData)
	{
		let now;

		if (this.static.isValidDate(options))
		{
			[options, now] = [{}, options];
		}

		now = dayjs(now);

		this.data = Object.assign(this.data, {
			id: 0,
			real_init: dayjs(),
			fake_init: now,
			fake_now: now,
		}, options);

		this._init();
	}

	_init()
	{
		// dayjs is immutable, no clone needed
	}

	static new(options?: ITimeData)
	{
		let t = new this(options);

		return t;
	}

	get static()
	{
		// @ts-ignore
		return this.__proto__.constructor;
	}

	static isValidDate(who)
	{
		if (dayjs.isDayjs(who) || who instanceof Date)
		{
			return true;
		}
		else if (typeof who == 'number' && dayjs(who).isValid())
		{
			return true;
		}
		else if (Date.parse(who))
		{
			return true;
		}

		return false;
	}

	update(amount: any = 100, unit?: dayjs.ManipulateType)
	{
		this.data.fake_old = this.data.fake_now as dayjs.Dayjs;

		if (dayjs.isDuration(amount))
		{
			this.data.fake_now = (this.data.fake_now as dayjs.Dayjs).add(amount);
		}
		else if (typeof amount == 'object')
		{
			this.data.fake_now = dayjs(amount);
		}
		else if (unit || typeof amount == 'number')
		{
			this.data.fake_now = (this.data.fake_now as dayjs.Dayjs).add(amount, unit);
		}
		else
		{
			this.data.fake_now = (this.data.fake_now as dayjs.Dayjs).add(100);
		}

		return this;
	}

	id(bool?: boolean)
	{
		return bool ? this.data.id : this.data.id++;
	}

	now(): dayjs.Dayjs
	{
		return this.data.fake_now as dayjs.Dayjs;
	}
}

export default Time;
