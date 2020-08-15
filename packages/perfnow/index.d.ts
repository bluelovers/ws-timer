/**
 * @file perfnow is a 0.1 kb performance.now high resolution timer polyfill with Date fallback
 * @author Daniel Lamb <dlamb.open.source@gmail.com>
 */
declare const now: () => number;
export { now };
export default now;
