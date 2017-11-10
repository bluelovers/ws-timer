/**
 * Created by user on 2017/11/10/010.
 */

import init, { setTimeout, setImmediate } from '../timer';
import * as moment from 'moment';

setTimeout(() => {}, 1500);
let q = setTimeout(() => {}, 500);
setImmediate(() => {});

init.start(-1)
	.then((self) =>
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
