/**
 * @file perfnow is a 0.1 kb performance.now high resolution timer polyfill with Date fallback
 * @author Daniel Lamb <dlamb.open.source@gmail.com>
 */

import { getPerformanceNow } from './polyfill';

const now = getPerformanceNow();

export { now }

export default now;
