import Tic from '../index';

test(`should run interval x 3 , timeout x 1`, () =>
{
	expect.assertions(4 + 2)

	const tic = new Tic();

	expect(tic).toMatchSnapshot();

	tic.interval((thing, key, param1) =>
	{
		expect(thing).toHaveProperty('limit', Infinity)
	}, 5000, 'Every');

	tic.add((thing, key, param1) =>
	{
		expect(thing).toHaveProperty('limit', 1)
	}, 5000);

	tic.tick(15000);

	expect(tic).toMatchSnapshot();

});

test(`auto tick`, () =>
{
	expect.assertions(4 + 2)

	const tic = new Tic();

	expect(tic).toMatchSnapshot();

	tic.interval((thing, key, param1) =>
	{
		expect(thing).toHaveProperty('limit', Infinity)
	}, 5000, 'Every');

	tic.add((thing, key, param1) =>
	{
		expect(thing).toHaveProperty('limit', 1)
	}, 5000);

	tic.tick(15000-4000);

	tic.tick();

	expect(tic).toMatchSnapshot();

});

