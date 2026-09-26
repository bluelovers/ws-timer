/**
 * Created by user on 2017/11/10/010.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

/**
 * 時間資料介面，儲存真實時間與虛擬時間的狀態
 * Time data interface, stores real time and virtual time state
 */
export interface ITimeDataCore
{
	/** 自增識別碼 / Auto-increment identifier */
	id?: number;

	/** 真實世界初始時間（建立 Time 實例時的實際時間） / Real-world initial time (actual time when Time instance was created) */
	real_init?: dayjs.Dayjs;

	/** 虛擬時間初始值 / Virtual time initial value */
	virtual_init?: dayjs.Dayjs;

	/** 虛擬時間當前值（隨 update 推進） / Virtual time current value (advanced via update) */
	virtual_now?: dayjs.Dayjs;

	/** 上一次 update 前的虛擬時間（用於回溯或差值計算） / Virtual time before last update (used for rollback or diff calculation) */
	virtual_old?: dayjs.Dayjs;
}

/**
 * 時間基礎類別，提供可控的虛擬時間環境
 * Base time class providing a controllable virtual time environment
 *
 * 此類別是整個 fake-timer 的核心，管理真實時間與虛擬時間的映射。
 * 透過 update() 方法可任意推進虛擬時間，用於測試或模擬計時器行為。
 * This class is the core of the fake-timer, managing the mapping between real time and virtual time.
 * The virtual time can be advanced arbitrarily via update() for testing or simulating timer behavior.
 */
export class TimeCore
{
	/** 時間狀態資料（內部）；含 real_init / virtual_init / virtual_now / virtual_old 等；避免直接操作，請用 FakeTimer 公開 API。 / Time state data (internal): real_init / virtual_init / virtual_now / virtual_old etc.; avoid direct access — use FakeTimer's public API. */
	public data = {} as ITimeDataCore;

	/**
	 * 建立 Time 實例（內部；公開請用 `new FakeTimer()`）。
	 * Create a Time instance (internal; prefer `new FakeTimer()` publicly).
	 *
	 * @param options - 時間配置選項，可為 ITimeData 物件或直接傳入日期值 / Time config options, can be ITimeData object or a date value directly
	 */
	constructor(options?: ITimeDataCore)
	{
		let now;

		/**
		 * 若 options 為有效日期值，則將其視為 now，options 清空
		 * If options is a valid date value, treat it as now and clear options
		 */
		if (this.static.isValidDate(options))
		{
			[options, now] = [{}, options];
		}

		now = dayjs(now);

		/**
		 * 合併預設值、options 與初始時間
		 * Merge default values, options and initial time
		 */
		this.data = Object.assign(this.data, {
			id: 0,
			real_init: dayjs(),
			virtual_init: now,
			virtual_now: now,
		}, options);

		this._init();
	}

	/**
	 * 子類初始化鉤子（內部；dayjs 為 immutable，無需 clone）
	 * Subclass initialization hook (internal; dayjs is immutable, no clone needed)
	 */
	_init()
	{
		// dayjs is immutable, no clone needed
	}

	/**
	 * 工廠方法（內部）；公開請用 `new FakeTimer()`。
	 * Factory method (internal); prefer `new FakeTimer()` publicly.
	 */
	static new(options?: ITimeDataCore)
	{
		let t = new this(options);

		return t;
	}

	/**
	 * 取得當前類別的建構函式（內部；用於 static 方法中引用子類）
	 * Get the constructor of the current class (internal; used in static methods to reference subclasses)
	 */
	get static()
	{
		// @ts-ignore
		return this.__proto__.constructor;
	}

	/**
	 * 驗證傳入值是否為有效的日期表示（內部輔助）
	 * Validate whether the passed value is a valid date representation (internal helper)
	 *
	 * 公開不需要直接使用。
	 * Not needed publicly.
	 *
	 * 支援的型別：dayjs.Dayjs、Date、數字（時間戳）、可解析的日期字串
	 * Supported types: dayjs.Dayjs, Date, number (timestamp), parseable date string
	 */
	static isValidDate(who)
	{
		if (dayjs.isDayjs(who) || who instanceof Date)
		{
			return true;
		}
		else if (typeof who == 'number' && dayjs(who).isValid())
		{
			return true;
		}
		else if (Date.parse(who))
		{
			return true;
		}

		return false;
	}

	/**
	 * 推進虛擬時間
	 * Advance the virtual time
	 *
	 * 根據不同型別的參數推進 virtual_now：
	 * Advances virtual_now based on different parameter types:
	 * - Duration 物件 → 直接加算 / Duration object → add directly
	 * - 物件（Date 等）→ 直接設定為該時間 / Object (Date etc.) → set to that time
	 * - 數字 + unit → 加算指定單位 / Number + unit → add specified unit
	 * - 純數字 → 預設加算 100 毫秒 / Number alone → add 100ms by default
	 *
	 * 內部方法 / Internal method：公開推進虛擬時間請改用 FakeTimer.advance() / start()；
	 * 直接呼叫會繞過 time-jump 防護與快取不變式。
	 * Internal: prefer FakeTimer.advance() / start() to advance time; calling this directly
	 * bypasses the time-jump guard and cache invariants.
	 */
	update(amount: any = 100, unit?: dayjs.ManipulateType)
	{
		/** 記錄更新前的虛擬時間 / Record virtual time before update */
		this.data.virtual_old = this.data.virtual_now as dayjs.Dayjs;

		if (dayjs.isDuration(amount))
		{
			this.data.virtual_now = (this.data.virtual_now as dayjs.Dayjs).add(amount);
		}
		else if (typeof amount == 'object')
		{
			this.data.virtual_now = dayjs(amount);
		}
		else if (unit || typeof amount == 'number')
		{
			this.data.virtual_now = (this.data.virtual_now as dayjs.Dayjs).add(amount, unit);
		}
		else
		{
			this.data.virtual_now = (this.data.virtual_now as dayjs.Dayjs).add(100);
		}

		return this;
	}

	/**
	 * 取得或遞增識別碼（內部計數器）
	 * Get or increment the identifier (internal counter)
	 *
	 * 公開識別計時器請用佇列項目的 id / name，或 FakeTimer.clear* 的 ITimerHandle。
	 * To identify timers publicly, use the item's id / name or the ITimerHandle of FakeTimer.clear*.
	 *
	 * @param bool - 若為 true 則僅回傳當前值不遞增，若為 false 或省略則回傳後遞增 / If true returns current value without increment, otherwise returns and increments
	 */
	id(bool?: boolean)
	{
		return bool ? this.data.id : this.data.id++;
	}

	/**
	 * 取得當前虛擬時間（dayjs.Dayjs，非數值）。
	 * Get the current virtual time (dayjs.Dayjs, NOT a number).
	 *
	 * 這是 FakeTimer 回呼內 `self.timer.now()` 讀取的時鐘；計算「自建立以來經過的毫秒數」
	 * 請用 `now().diff(virtual_init)`（或 FakeTimer.initTime）。
	 * This is the clock read via `self.timer.now()` inside callbacks. To compute elapsed ms
	 * since creation, use `now().diff(virtual_init)` (or FakeTimer.initTime).
	 */
	now(): dayjs.Dayjs
	{
		return this.data.virtual_now as dayjs.Dayjs;
	}

	/**
	 * 將虛擬時間重置回初始值（virtual_init），並重設識別碼計數器
	 * Reset the virtual time back to its initial value (virtual_init) and reset the id counter
	 *
	 * 不影響 real_init（建立實例時捕捉的真實時間）。
	 * Does not affect real_init (the real time captured at instance creation).
	 *
	 * 內部方法 / Internal method：公開請改用 FakeTimer.reset()。
	 * Internal: prefer FakeTimer.reset().
	 *
	 * @returns this（支援鏈式呼叫）/ this (supports chaining)
	 */
	reset(): this
	{
		this.data.virtual_now = this.data.virtual_init;
		this.data.virtual_old = undefined;
		this.data.id = 0;

		return this;
	}
}

export default TimeCore;
