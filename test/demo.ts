/**
 * Created by user on 2017/11/10/010.
 */

import timerScope, { setTimeout, setImmediate } from '../scope';
import * as moment from 'moment';

setTimeout(function (current, timer, self)
{
	console.log(this, current.id);
}, 1500);

let q = setTimeout(function (current, timer, self)
{
	console.log(this, current.id, self);
}, 500);

setImmediate(function (current, timer, self)
{
	console.log(this, current.id, self);
});

timerScope.start(-1)
	.then(function (self)
	{
		console.log(self.timer.data);
		console.log(self.timer.queue);
		console.log(self.cache.done);
		console.log(self.timer.hasExpires());

		return self.start(-1);
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
		console.log('[real]', moment().diff(self.timer.data.real_init), 'ms');
		console.log('[fake]', self.timer.now().diff(self.timer.data.fake_init), 'ms');
	})
;
