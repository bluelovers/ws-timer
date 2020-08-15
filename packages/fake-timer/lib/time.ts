/**
 * Created by user on 2017/11/10/010.
 */

import * as moment from 'moment';

export interface ITimeData
{
	id?: number;
	real_init?: moment.Moment;

	fake_init?: moment.Moment;
	fake_now?: moment.Moment;
	fake_old?: moment.Moment;
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

		this.data = Object.assign(this.data, {
			id: 0,
			real_init: moment(),
			fake_init: moment(now),
			fake_now: moment(now),
		}, options);

		this._init();
	}

	_init()
	{
		for (let i in this.data)
		{
			if (this.data[i] instanceof moment)
			{
				this.data[i] = this.data[i].clone();
			}
		}
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
		if (who instanceof moment || who instanceof Date)
		{
			return true;
		}
		else if (typeof who == 'number' && moment(who).isValid())
		{
			return true;
		}
		else if (Date.parse(who))
		{
			return true;
		}

		return false;
	}

	update(amount: any = 100, unit?: string)
	{
		//this.data.real_update = moment();
		this.data.fake_old = this.data.fake_now.clone();

		if (moment.isDuration(amount))
		{
			this.data.fake_now.add(amount);
		}
		else if (typeof amount == 'object')
		{
			this.data.fake_now = moment(amount);
		}
		else if (unit || typeof amount == 'number')
		{
			this.data.fake_now.add(amount, unit);
		}
		else
		{
			this.data.fake_now.add(100);
		}

		return this;
	}

	id(bool?: boolean)
	{
		return bool ? this.data.id : this.data.id++;
	}

	now(): moment.Moment
	{
		return this.data.fake_now.clone();
	}
}

export default Time;


