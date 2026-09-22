# node-fake-timer

可控的假計時器（Fake Timer）API for Node.js。
以手動方式推進虛擬時間，讓依賴 `setTimeout` / `setInterval` / `setImmediate` / `requestAnimationFrame` 的程式碼能「瞬間」執行，而不必真實等待。

A controllable fake-timer API for Node.js.
Manually advance fake time so code depending on `setTimeout` / `setInterval` / `setImmediate` / `requestAnimationFrame` runs instantly instead of waiting in real time.

---

## 安裝 / Installation

```sh
npm install fake-timer
# 或 / or
yarn add fake-timer
# 或 / or
pnpm add fake-timer
```

---

## 主要 API / Main API

設計重點 / Key design points：

- 排程方法（`setTimeout` / `setInterval` / `setImmediate` / `requestAnimationFrame`）**同步**回傳佇列項目 `ITimeQueueItem`，不回傳 Promise。
  Scheduling methods return the queue item `ITimeQueueItem` **synchronously** (not a Promise).
- 執行方法分為同步與非同步兩對：`run` / `start`（同步）與 `runAsync` / `startAsync`（非同步，會 `await` 每個回呼）。
  Execution comes in sync/async pairs: `run` / `start` (sync) and `runAsync` / `startAsync` (async, awaiting each callback).
- 取消方法（`clear*` / `cancelAnimationFrame`）接受統一的 `ITimerHandle`（`number | string | ITimeQueueItem`）。
  Cancellation accepts a unified `ITimerHandle` (`number | string | ITimeQueueItem`).

### 快速開始 / Quick start

```ts
import fakeTimer, { setTimeout } from 'fake-timer';

// 排程：同步回傳佇列項目 / schedule (returns the item synchronously)
const item = setTimeout(() => console.log('1s passed'), 1000);

// 推進 1000ms 並同步執行到期回呼 / advance 1000ms and run expired callbacks
fakeTimer.start(1000);
// → 印出 "1s passed" / prints "1s passed"
```

### 排程 API / Scheduling

| 方法 / Method | 說明 / Description |
| --- | --- |
| `setTimeout(cb, delay, ...params)` | 一次性延遲計時器 / one-shot deferred timer |
| `setInterval(cb, delay, ...params)` | 週期性計時器（到期後以 `timing + interval` 重新排程）/ repeating timer |
| `setImmediate(cb, ...params)` | 立即執行（延遲視為 0）/ run immediately (delay 0) |
| `requestAnimationFrame(cb, ...params)` | 於下一個「影格」觸發（預設間隔 `1000/60` ms）/ fire on the next frame |

`delay` 可為數值毫秒或 `dayjs` 的 `Duration`（`IDurationInput`）。
`delay` accepts either milliseconds (`number`) or a `dayjs` `Duration` (`IDurationInput`).

```ts
import dayjs from 'dayjs';
import fakeTimer, { setInterval, requestAnimationFrame } from 'fake-timer';

let n = 0;
setInterval(() => console.log('tick', ++n), 1000);

// 推進 2500ms：觸發 2 次（1000、2000）/ advance 2500ms → fires twice
fakeTimer.start(2500);

// requestAnimationFrame 使用 frameInterval（可覆寫以模擬不同刷新率）
// requestAnimationFrame uses frameInterval (override to simulate other refresh rates)
fakeTimer.frameInterval = dayjs.duration(1000 / 30); // 30fps
const frame = requestAnimationFrame(() => console.log('frame'));
fakeTimer.start(1000 / 30);
```

### 執行與推進時間 / Running & advancing time

| 方法 / Method | 行為 / Behavior |
| --- | --- |
| `advance(amount?)` | 僅推進虛擬時間，不執行回呼 / advance time only, no callbacks |
| `run()` | 執行所有到期項目（同步，不等待回呼）/ run expired items (sync) |
| `runAsync()` | 執行所有到期項目（非同步，`await` 每個回呼）/ run expired items (async) |
| `runGenerator()` | 以生成器逐個執行並 `yield` 每個項目（**不回傳 `this`**）/ run items one-by-one as a generator (**does NOT return `this`**) |
| `start(amount?)` | 推進時間並同步執行到期項目 / advance + run (sync) |
| `startAsync(amount?)` | 推進時間並非同步執行到期項目 / advance + run (async) |

```ts
import fakeTimer, { setTimeout } from 'fake-timer';

setTimeout(() => console.log('a'), 500);
setTimeout(() => console.log('b'), 1500);

fakeTimer.advance(500);   // 只推進時間 / advance only
fakeTimer.run();          // 執行 500ms 處到期的 a / runs "a"
fakeTimer.start(1000);    // 再推進 1000ms 並執行 b / advance 1000ms, runs "b"

// 非同步版本：回呼會被 await（適合回呼內有 async 工作）
// async version: callbacks are awaited (handy when callbacks do async work)
await fakeTimer.startAsync(1000);

// runGenerator：以生成器逐個執行，yield 每個已執行的項目（不回傳 this），
// 方便在項目之間插入觀察或處理邏輯
// runGenerator: runs items one-by-one, yielding each executed item (not this) —
// handy for observing/handling between items
for (const item of fakeTimer.runGenerator())
{
	console.log('ran', item.type, 'at', fakeTimer.timer.now().toISOString());
}
```

### 取消與清除 / Cancelling & clearing

`clear*` / `cancelAnimationFrame` 接受 `ITimerHandle`——可用自增 `id`（`number`）、隨機 `name`（`string`），或直接傳入佇列項目本身（`ITimeQueueItem`）。
Accepts an `ITimerHandle`: the auto-increment `id` (`number`), the random `name` (`string`), or the queue item itself (`ITimeQueueItem`).

```ts
import fakeTimer, { setTimeout, clearTimeout, clearAll, reset } from 'fake-timer';

const item = setTimeout(() => console.log('never'), 1000);

clearTimeout(item);        // 以項目本身取消 / by the item itself
clearTimeout(item.id);     // 或以 id（number）/ by id
clearTimeout(item.name);   // 或以隨機名稱（string）/ by random name

fakeTimer.start(1000);     // 回呼不會執行 / callback never runs

fakeTimer.clearAll();      // 清空佇列，時鐘不變 / clear queue, clock unchanged
fakeTimer.reset();         // 清空佇列並將虛擬時間重置 / clear queue + reset clock
```

### 全域時鐘（不安全）/ Global clock (UNSAFE)

`UnsafeGlobalFakeTimer` 會直接替換處理程序內的 `Date.now` / `performance.now`。這是**全域副作用**，會影響整個程序，請務必配對 `uninstallGlobalClock()` 還原。
`UnsafeGlobalFakeTimer` replaces the process-wide `Date.now` / `performance.now`. This is a **global side effect** affecting the whole process — always pair it with `uninstallGlobalClock()`.

```ts
import { getUnsafeGlobalFakeTimer } from 'fake-timer';

const clock = getUnsafeGlobalFakeTimer();   // 懶惰單例 / lazy singleton

clock.installGlobalClock();                 // 替換全域 Date.now / performance.now
clock.advance(1000);
console.log(Date.now());                    // 反映虛擬時間 / reflects fake time

clock.uninstallGlobalClock();               // 還原原始實作 / restore originals

// 檢查安裝狀態：'none' | 'self' | 'global'
// inspect state: 'none' (未安裝) | 'self' (本實例安裝) | 'global' (某實例安裝)
console.log(clock.globalClockState());
```

> 跨實例安全 / Cross-instance safe：即使由實例 A 安裝、實例 B 呼叫 `uninstallGlobalClock()`，也會委託回 A 正確還原。
> Even if instance A installs and instance B calls `uninstallGlobalClock()`, it delegates to A's restore.

### 型別與列舉 / Types & enums

匯出的型別別名與列舉（單一真理來源）/ Exported type aliases and enums (single source of truth)：

| 名稱 / Name | 定義 / Definition | 用途 / Use |
| --- | --- | --- |
| `EnumTimerType` | `setTimeout \| setInterval \| setImmediate \| requestAnimationFrame` | 計時器種類 / timer kind |
| `EnumGlobalClockState` | `none \| self \| global` | 全域時鐘安裝狀態 / global clock state |
| `ITimerHandle` | `number \| string \| ITimeQueueItem` | 取消時的指認代號 / cancellation handle |
| `IDurationInput` | `number \| dayjs.Duration` | 延遲 / 間隔輸入 / delay input |
| `IRemovedTimer` | `null \| ITimeQueueItem` | 移除結果 / removal result |

```ts
import { EnumTimerType } from 'fake-timer';

if (item.type === EnumTimerType.setInterval)
{
	console.log('this is a repeating timer');
}
```

---

## 應用領域與時機 / Application domains & when to use

- **測試（單元 / 整合）/ Testing (unit / integration)**
  讓依賴計時器的程式碼「瞬間」執行，避免真實等待、加速 CI、獲得確定性結果。
  Run timer-dependent code instantly — no real waiting, faster CI, deterministic results.

- **遊戲迴圈 / 動畫 / Game loops & animation**
  以 `requestAnimationFrame` 模擬影格排程；手動推進 frames，實現確定性的影格重播與回放。
  Simulate frame scheduling with `requestAnimationFrame`; advance frames manually for deterministic replay.

- **時間相依邏輯的確定性重現 / Deterministic time-dependent logic**
  重試退避（retry backoff）、輪詢（polling）、debounce / throttle、排程任務等，都可在壓縮的時間內跑完並驗證。
  Retry backoff, polling, debounce/throttle, scheduled jobs — run and verify within compressed time.

- **離線 / 加速模擬 / Offline & speed-up simulation**
  把長時間跨度（如 1 天）壓縮成幾毫秒跑完，用於模擬或壓力測試。
  Compress long spans (e.g. a day) into a few ms for simulation or stress tests.

- **驅動直接讀取全域時鐘的程式碼 / Driving code that reads the real clock**
  若待測程式直接讀取 `Date.now()` / `performance.now()`（而非接收時間參數），使用 `UnsafeGlobalFakeTimer` 替換全域時鐘。
  If the code under test reads `Date.now()` / `performance.now()` directly, patch the global clock with `UnsafeGlobalFakeTimer`.

- **需要佇列可視化或 Duration 輸入的場景 / Queue visibility & Duration input**
  可透過 `fakeTimer.timer.queue` 與 `fakeTimer.cache.done` 觀察排程與完成結果；`delay` 支援 `dayjs` 的 `Duration`。
  Inspect scheduling via `fakeTimer.timer.queue` / `fakeTimer.cache.done`; `delay` accepts `dayjs` `Duration`.

---

## 注意事項 / Notes

- `set*` / `clear*` / `advance` 皆為**同步**；非同步版本明確命名為 `xxxAsync`（`runAsync` / `startAsync`）。
  `set*` / `clear*` / `advance` are **synchronous**; async variants are explicitly named `xxxAsync`.
- `UnsafeGlobalFakeTimer` 的 `installGlobalClock()` 具有全域副作用，請在測試結尾或 `finally` 區塊中呼叫 `uninstallGlobalClock()`。
  `installGlobalClock()` has global side effects — call `uninstallGlobalClock()` in a `finally` block.
