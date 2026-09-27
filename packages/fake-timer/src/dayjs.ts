/**
 * dayjs 統一初始化（集中註冊插件，避免各檔重複 dayjs.extend 且確保只觸發一次）。
 * Central dayjs setup: register all plugins in one place to avoid duplicated dayjs.extend calls and guarantee it runs once.
 *
 * 其他檔案請由此引入 dayjs / duration / Duration，確保插件已註冊。
 * Other files should import dayjs / duration / Duration from here to guarantee plugins are registered.
 */

import _dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import minMax from 'dayjs/plugin/minMax';

/**
 * 使用立即呼叫函式（IIFE）包裹 extend 呼叫，
 * 讓副作用（註冊插件）位於函式主體內並隨 dayjs 一同被引用，
 * 避免打包工具在 tree shaking 時將 extend 誤判為無副作用的孤島程式碼而將其移除，
 * 導致插件實際上從未被註冊。
 *
 * Wrap the extend calls in an IIFE so the side effect (plugin registration)
 * lives inside a referenced function body. This prevents bundlers from tree
 * shaking the extend calls as unused side-effect-free code, which would
 * otherwise leave the plugins unregistered.
 */
export const dayjs = (() => {
	_dayjs.extend(duration);
	_dayjs.extend(minMax);

	return _dayjs
})();
