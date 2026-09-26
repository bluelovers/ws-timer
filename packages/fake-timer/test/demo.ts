/**
 * Created by user on 2017/11/10/010.
 */

import defaultFakeTimer, { setTimeout, setImmediate } from '../src/index';
import dayjs from 'dayjs';

setTimeout(function (current, self)
{
	console.log('timer a id', current.id, {
		selfIsFakeTimer: self === defaultFakeTimer,
		selfTimerLength: self.timer.length,
		registrationTime: current.added?.valueOf(),
		elapsedFromStartMs: self.timer.now().diff(self.timer.data.fake_init),
		current,
	});
}, 1500);

let q = setTimeout(function (current, self)
{
	console.log('timer b id', current.id, {
		selfIsFakeTimer: self === defaultFakeTimer,
		selfTimerLength: self.timer.length,
		registrationTime: current.added?.valueOf(),
		elapsedFromStartMs: self.timer.now().diff(self.timer.data.fake_init),
		current,
	});
}, 500);

setImmediate(function (current, self)
{
	console.log('setImmediate id', current.id, {
		selfIsFakeTimer: self === defaultFakeTimer,
		selfTimerNow: self.timer.now().valueOf(),
		registrationTime: current.added?.valueOf(),
		elapsedFromStartMs: self.timer.now().diff(self.timer.data.fake_init),
		current,
	});
});

defaultFakeTimer.startAsync(-1)
	.then(function (self)
	{
		console.log(self.timer.data);
		console.log(self.timer.queue);
		console.log(self.cache.done);
		console.log(self.timer.hasExpires());

		return self.startAsync(-1);
	})
	.then((self) =>
	{
		console.log(self.timer.data);
		console.log(self.timer.queue);
		console.log(self.cache.done);
		console.log(self.timer.hasExpires());

		return self;
	})
	.then((self) =>
	{
		console.log('[real]', dayjs().diff(self.timer.data.real_init), 'ms');
		console.log('[fake]', self.timer.now().diff(self.timer.data.fake_init), 'ms');
	})
;
