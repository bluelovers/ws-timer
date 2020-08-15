# node-fake-timer
Fake Timer API for node.js.

```javascript
import init, { setTimeout, setImmediate } from 'fake-timer';
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
```

```
{ id: 3,
  real_init: moment("2017-11-10T22:46:00.523"),
  fake_init: moment("2017-11-10T22:46:00.523"),
  fake_now: moment("2017-11-10T22:46:00.523"),
  fake_old: moment("2017-11-10T22:46:00.523") }
[ { id: 1,
    name: 'BJg-2sVXkG',
    timing: moment("2017-11-10T22:46:01.023"),
    callback: [Function],
    params: [],
    type: 'setTimeout',
    index: 1 },
  { id: 0,
    name: 'H1-2jVQJz',
    timing: moment("2017-11-10T22:46:02.023"),
    callback: [Function],
    params: [],
    type: 'setTimeout',
    index: 2 } ]
[ { id: 2,
    name: 'BkW-2oVQkG',
    timing: moment("2017-11-10T22:46:00.523"),
    callback: [Function],
    params: [],
    type: 'setImmediate',
    index: 0,
    active: moment("2017-11-10T22:46:00.527"),
    ending: moment("2017-11-10T22:46:00.527") } ]
false
{ id: 3,
  real_init: moment("2017-11-10T22:46:00.523"),
  fake_init: moment("2017-11-10T22:46:00.523"),
  fake_now: moment("2017-11-10T22:46:01.023"),
  fake_old: moment("2017-11-10T22:46:00.523") }
[ { id: 0,
    name: 'H1-2jVQJz',
    timing: moment("2017-11-10T22:46:02.023"),
    callback: [Function],
    params: [],
    type: 'setTimeout',
    index: 1 } ]
[ { id: 1,
    name: 'BJg-2sVXkG',
    timing: moment("2017-11-10T22:46:01.023"),
    callback: [Function],
    params: [],
    type: 'setTimeout',
    index: 0,
    active: moment("2017-11-10T22:46:00.532"),
    ending: moment("2017-11-10T22:46:00.532") } ]
false
[real] 10 ms
[fake] 500 ms
```
