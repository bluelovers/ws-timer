/**
 * Created by user on 2017/11/10/010.
 */

import defaultFakeTimer, { setTimeout, setImmediate } from '../src/index';
import dayjs from 'dayjs';

setTimeout(function (current, timer, self)
{
	// @ts-ignore
	console.log(this, current.id);
}, 1500);

let q = setTimeout(function (current, timer, self)
{
	// @ts-ignore
	console.log(this, current.id, self);
}, 500);

setImmediate(function (current, timer, self)
{
	// @ts-ignore
	console.log(this, current.id, self);
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
