/**
 * dayjs 統一初始化（集中註冊插件，避免各檔重複 dayjs.extend 且確保只觸發一次）。
 * Central dayjs setup: register all plugins in one place to avoid duplicated dayjs.extend calls and guarantee it runs once.
 *
 * 其他檔案請由此引入 dayjs / duration / Duration，確保插件已註冊。
 * Other files should import dayjs / duration / Duration from here to guarantee plugins are registered.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import minMax from 'dayjs/plugin/minMax';

dayjs.extend(duration);
dayjs.extend(minMax);

export { dayjs, duration };
export type { Duration } from 'dayjs/plugin/duration';
