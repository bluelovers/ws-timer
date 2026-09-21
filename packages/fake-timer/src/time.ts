/**
 * Created by user on 2017/11/10/010.
 */

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

/**
 * 將數值或 Duration 轉換為 Duration 型別
 * Converts a number or Duration to a Duration type
 *
 * 若輸入已是 Duration，則直接回傳；否則以數值建立 Duration（單位為毫秒）
 * If input is already a Duration, return it directly; otherwise create a Duration from the number (in milliseconds)
 */
export function toDuration(value: number | duration.Duration): duration.Duration
{
	return dayjs.isDuration(value) ? value : dayjs.duration(value);
}

/**
 * 時間資料介面，儲存真實時間與虛擬時間的狀態
 * Time data interface, stores real time and fake time state
 */
export interface ITimeData
{
	/** 自增識別碼 / Auto-increment identifier */
	id?: number;

	/** 真實世界初始時間（建立 Time 實例時的實際時間） / Real-world initial time (actual time when Time instance was created) */
	real_init?: dayjs.Dayjs;

	/** 虛擬時間初始值 / Fake time initial value */
	fake_init?: dayjs.Dayjs;

	/** 虛擬時間當前值（隨 update 推進） / Fake time current value (advanced via update) */
	fake_now?: dayjs.Dayjs;

	/** 上一次 update 前的虛擬時間（用於回溯或差值計算） / Fake time before last update (used for rollback or diff calculation) */
	fake_old?: dayjs.Dayjs;
}

/**
 * 時間基礎類別，提供可控的虛擬時間環境
 * Base time class providing a controllable fake time environment
 *
 * 此類別是整個 fake-timer 的核心，管理真實時間與虛擬時間的映射。
 * 透過 update() 方法可任意推進虛擬時間，用於測試或模擬計時器行為。
 * This class is the core of the fake-timer, managing the mapping between real time and fake time.
 * The virtual time can be advanced arbitrarily via update() for testing or simulating timer behavior.
 */
export class Time
{
	/** 時間狀態資料 / Time state data */
	public data = {} as ITimeData;

	/**
	 * 建立 Time 實例
	 * Create a Time instance
	 *
	 * @param options - 時間配置選項，可為 ITimeData 物件或直接傳入日期值 / Time config options, can be ITimeData object or a date value directly
	 */
	constructor(options?: ITimeData)
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
			fake_init: now,
			fake_now: now,
		}, options);

		this._init();
	}

	/**
	 * 子類初始化鉤子（dayjs 為 immutable，無需 clone）
	 * Subclass initialization hook (dayjs is immutable, no clone needed)
	 */
	_init()
	{
		// dayjs is immutable, no clone needed
	}

	/**
	 * 工廠方法，建立 Time 實例
	 * Factory method to create a Time instance
	 */
	static new(options?: ITimeData)
	{
		let t = new this(options);

		return t;
	}

	/**
	 * 取得當前類別的建構函式（用於 static 方法中引用子類）
	 * Get the constructor of the current class (used in static methods to reference subclasses)
	 */
	get static()
	{
		// @ts-ignore
		return this.__proto__.constructor;
	}

	/**
	 * 驗證傳入值是否為有效的日期表示
	 * Validate whether the passed value is a valid date representation
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
	 * Advance the fake time
	 *
	 * 根據不同型別的參數推進 fake_now：
	 * Advances fake_now based on different parameter types:
	 * - Duration 物件 → 直接加算 / Duration object → add directly
	 * - 物件（Date 等）→ 直接設定為該時間 / Object (Date etc.) → set to that time
	 * - 數字 + unit → 加算指定單位 / Number + unit → add specified unit
	 * - 純數字 → 預設加算 100 毫秒 / Number alone → add 100ms by default
	 */
	update(amount: any = 100, unit?: dayjs.ManipulateType)
	{
		/** 記錄更新前的虛擬時間 / Record fake time before update */
		this.data.fake_old = this.data.fake_now as dayjs.Dayjs;

		if (dayjs.isDuration(amount))
		{
			this.data.fake_now = (this.data.fake_now as dayjs.Dayjs).add(amount);
		}
		else if (typeof amount == 'object')
		{
			this.data.fake_now = dayjs(amount);
		}
		else if (unit || typeof amount == 'number')
		{
			this.data.fake_now = (this.data.fake_now as dayjs.Dayjs).add(amount, unit);
		}
		else
		{
			this.data.fake_now = (this.data.fake_now as dayjs.Dayjs).add(100);
		}

		return this;
	}

	/**
	 * 取得或遞增識別碼
	 * Get or increment the identifier
	 *
	 * @param bool - 若為 true 則僅回傳當前值不遞增，若為 false 或省略則回傳後遞增 / If true returns current value without increment, otherwise returns and increments
	 */
	id(bool?: boolean)
	{
		return bool ? this.data.id : this.data.id++;
	}

	/**
	 * 取得當前虛擬時間
	 * Get the current fake time
	 */
	now(): dayjs.Dayjs
	{
		return this.data.fake_now as dayjs.Dayjs;
	}
}

export default Time;
