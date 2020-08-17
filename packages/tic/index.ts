/*
 * tic
 * https://github.com/shama/tic
 *
 * Copyright (c) 2014 Kyle Robinson Young
 * Licensed under the MIT license.
 */

import { now } from 'performance-now2/index';
import { nextAt } from './lib/nextAt';
import { positiveNumber, isPositiveNumber } from './lib/positiveNumber';
import { IThing, IThingInput } from './lib/types';
import { ITSResolvable } from 'ts-type/lib/generic';
import { LeastRecentlyMap } from 'least-recently-record/map';

export class Tic
{
	protected _things: Map<number, IThing<any[]>>;
	protected _dt = -1;
	protected _id = 0;
	protected _next: number;

	protected _now: number = 0;
	#_timestamp_base: number;

	constructor(options?: {
		disableLeastRecentlyMode?: boolean,
	})
	{
		if (options?.disableLeastRecentlyMode)
		{
			this._things = new Map();
		}
		else
		{
			this._things = new LeastRecentlyMap();
		}
	}

	get now()
	{
		return this._now
	}

	protected _stack<T extends any[]>(thing: IThingInput<T>)
	{
		if (isPositiveNumber(thing.limit))
		{
			thing.limit ||= 1;
		}
		else if (thing.limit < 0)
		{
			thing.limit = Infinity
		}

		const id = ++this._id;

		this.#_timestamp_base ??= now();

		if (!Number.isFinite(this._now) && this._now > 0)
		{
			thing.at = this._now + thing.timeout;
		}
		else
		{
			thing.at = thing.timeout;
		}

		this._next = nextAt(this._next, thing.at);

		this._things.set(id, thing as IThing<any>);

		return () =>
		{
			return this.delete(id);
		}
	}

	interval<T extends any[]>(fn: IThing<T>["fn"], timeout: number, ...args: T)
	{
		return this._stack({
			fn,
			timeout,
			args,
			elapsed: 0,
			limit: -1,
		});
	}

	add<T extends any[]>(fn: IThing<T>["fn"], timeout: number, ...args: T)
	{
		return this._stack({
			fn,
			timeout,
			args,
			elapsed: 0,
			limit: 1,
		});
	}

	delete(id: number)
	{
		if (isPositiveNumber(this._next) && this._things.has(id))
		{
			let _next: number;

			this._things.forEach(((thing, key) =>
			{

				if (key !== id)
				{
					_next = nextAt(_next, thing.at);
				}

			}))

			this._next = _next;
		}

		return this._things.delete(id);
	}

	tick(dt?: number)
	{
		if (arguments.length < 1)
		{
			this.#_timestamp_base ??= now();

			if (!isPositiveNumber(this._next))
			{
				dt = now() - this.#_timestamp_base;
			}
			else
			{
				dt = this._next - this.now;
			}
		}

		if (!isPositiveNumber(dt))
		{
			throw new TypeError(`${dt} should be a positive number`)
		}

		this._dt = dt;

		const _next_now = this.now + dt;
		let _now = Math.min(_next_now, this._next);

		do
		{
			let _next: number;
			let _bool: boolean;

			for (const [key, thing] of this._things.entries())
			{
				if (_now >= thing.at)
				{
					thing.fn(thing, key, thing.args);

					if (--thing.limit > 0)
					{
						thing.elapsed = _now;

						thing.at += thing.timeout;

						_next = nextAt(_next, thing.at);

						this._things.set(key, thing);
					}
					else
					{
						this._things.delete(key);
					}

					_bool = true;
				}
				else
				{
					_next = nextAt(_next, thing.at);
				}
			}

			this._next = _next;

			if (_bool === true)
			{
				_now = _next ?? _now
			}
			else
			{
				_now = _next_now;
				break;
			}

		}
		while (_next_now >= _now)

		this._now = _next_now;

		return this
	}

	async tickAsync(dt?: number)
	{
		if (arguments.length < 1)
		{
			this.#_timestamp_base ??= now();

			if (!isPositiveNumber(this._next))
			{
				dt = now() - this.#_timestamp_base;
			}
			else
			{
				dt = this._next - this.now;
			}
		}

		if (!isPositiveNumber(dt))
		{
			throw new TypeError(`${dt} should be a positive number`)
		}

		this._dt = dt;

		const _next_now = this.now + dt;
		let _now = Math.min(_next_now, this._next);

		do
		{
			let _next: number;
			let _bool: boolean;

			for await (const [key, thing] of this._things.entries())
			{
				if (_now >= thing.at)
				{
					await thing.fn(thing, key, thing.args);

					if (--thing.limit > 0)
					{
						thing.elapsed = _now;

						thing.at += thing.timeout;

						_next = nextAt(_next, thing.at);
					}
					else
					{
						this._things.delete(key);
					}

					_bool = true;
				}
				else
				{
					_next = nextAt(_next, thing.at);
				}
			}

			this._next = _next;

			if (_bool === true)
			{
				_now = _next ?? _now
			}
			else
			{
				_now = _next_now;
				break;
			}

		}
		while (_next_now >= _now)

		this._now = _next_now;

		return this
	}

	get length()
	{
		return this._things.size
	}

}

export default Tic
