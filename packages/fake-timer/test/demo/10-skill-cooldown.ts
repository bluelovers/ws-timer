/**
 * 範例：技能使用與冷卻時間
 * Demo: skill usage with cooldown
 *
 * 展示兩件事：
 *   1. 同一技能可依需求排程在 0s / 1s / 5s 後觸發（對應標準 setTimeout 的 delay）。
 *   2. 技能一旦「使用（施法）」即鎖定為施法中，效果觸發後再進入冷卻；
 *      施法中與冷卻中這兩段期間都無法再次使用。
 *
 * Showcases two things:
 *   1. The same skill can be scheduled to fire after 0s / 1s / 5s (standard setTimeout delay).
 *   2. Once "used (casting)", the skill is locked as casting until its effect fires, then enters
 *      cooldown; re-use is blocked during both the casting and cooldown windows.
 */
import { FakeTimer as Timer } from '../../src/index';

const t = new Timer();

/** 虛擬時間起點 (ms)，用來把絕對時間轉為相對時間印出 / Virtual start (ms), for readable relative timestamps */
const init = t.initTime.valueOf();

/** 轉為相對於起點的毫秒數 / Convert to ms relative to start */
const rel = (ms: number): number => ms - init;

/** 冷卻持續時間 (ms) / Cooldown duration (ms) */
const COOLDOWN_MS = 3000;

/** 技能狀態 / Skill state */
const skill = {
	name: '火球術',
	/** 冷卻結束的虛擬時間戳 (ms) / Virtual timestamp when cooldown ends */
	cooldownUntil: 0,
	/** 是否已施法但尚未觸發 / Whether casting but not yet fired */
	inUse: false,
};

/**
 * 使用技能：delay 為「效果觸發前的延遲」。
 * Use the skill: delay = latency before the effect fires.
 *
 * @returns 是否成功施法 / whether the cast succeeded
 */
function useSkill(label: string, delay: number): boolean
{
	const now = t.timer.now().valueOf();

	// 施法中 → 禁止重複施法 / Casting in progress → block double-cast
	if (skill.inUse)
	{
		console.log(`[${label}] ✗ 技能施法中，無法再次使用`);

		return false;
	}

	// 冷卻中 → 禁止再次使用 / Cooling down → block re-use
	if (now < skill.cooldownUntil)
	{
		console.log(`[${label}] ✗ 技能冷卻中（剩餘 ${skill.cooldownUntil - now}ms），無法使用`);

		return false;
	}

	console.log(`[${label}] ✓ 使用「${skill.name}」，效果將在 ${delay}ms 後觸發`);

	// 立即鎖定，避免效果還沒觸發就被重複施法 / Lock immediately so the pending cast can't be re-triggered
	skill.inUse = true;

	t.setTimeout((current, self) =>
	{
		const fireAt = self.timer.now().valueOf();

		console.log(`[${label}] ★ 效果觸發！觸發時間=${rel(fireAt)}ms（第 ${current.count} 次）`);

		// 施法結束，進入冷卻：冷卻由效果觸發那一刻起算 / Casting done → cooldown starts at fire time
		skill.inUse = false;
		skill.cooldownUntil = fireAt + COOLDOWN_MS;

		console.log(`[${label}] ❄ 技能進入冷卻，將於 ${rel(skill.cooldownUntil)}ms 後就緒`);
	}, delay);

	return true;
}

/** 推進虛擬時間並印出目前時間 / Advance virtual time and print the current time */
function advance(ms: number, note: string): void
{
	t.start(ms);

	console.log(`   ⏱ 虛擬時間推進到 ${rel(t.timer.now().valueOf())}ms － ${note}\n`);
}

console.log('========================================');
console.log(' 技能冷卻示範 (Skill Cooldown Demo)');
console.log('========================================\n');

/* ---------- 場景一：立即觸發 (0s) ---------- */
console.log('--- 場景一：立即觸發 (delay=0) ---');
useSkill('場景一', 0);
useSkill('場景一-重複', 0);              // 施法中 → 應被擋
advance(0, '觸發場景一 → 冷卻至 3000ms');

/* ---------- 場景二：1 秒後觸發 (1s) ---------- */
console.log('--- 場景二：1 秒後觸發 (delay=1000) ---');
advance(3000, '冷卻結束，技能就緒');     // 冷卻結束
useSkill('場景二', 1000);
advance(1000, '觸發場景二 → 冷卻至 7000ms');

/* ---------- 場景三：5 秒後觸發 (5s) + 冷卻/施法檢查 ---------- */
console.log('--- 場景三：5 秒後觸發 (delay=5000) ---');
advance(3000, '冷卻結束，技能就緒');     // 7000ms，冷卻結束
useSkill('場景三', 5000);
advance(1000, '施法中（效果待觸發）');    // 8000ms，仍在施法
useSkill('場景三-施法中', 0);            // 施法中 → 應被擋
advance(4000, '觸發場景三 → 冷卻至 15000ms'); // 12000ms，觸發
useSkill('場景三-冷卻中', 0);            // 冷卻中 → 應被擋
advance(3000, '冷卻結束，技能就緒');     // 15000ms，冷卻結束

/* ---------- 場景四：冷卻結束後再次可用 ---------- */
console.log('--- 場景四：冷卻結束後就緒 (delay=0) ---');
useSkill('場景四', 0);
advance(0, '觸發場景四');

console.log('========================================');
console.log(' 全部場景完成，技能可正常循環使用');
console.log('========================================');
