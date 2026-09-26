# 雜項 API / Miscellaneous API

本檔收錄**不屬於**核心動詞 `set` / `clear` / `start` / `run` 的 API 與型別。
核心動詞請見套件根目錄的 `README.md`；這裡是「其餘部分」。

Covers everything outside the core verbs (`set` / `clear` / `start` / `run`) documented in the
package `README.md`.

- 全域時鐘（不安全）：`UnsafeGlobalFakeTimer` / `installGlobalClock` / `uninstallGlobalClock` / `getUnsafeGlobalFakeTimer` / `globalClockState`
- 進階取值：`initTime` / `frameInterval`
- 型別與列舉：`EnumTimerType` / `EnumGlobalClockState` / `ITimerHandle` / `IDurationInput` / `IRemovedTimer`

---

## 1. 全域時鐘（不安全）/ Global clock (UNSAFE)

`UnsafeGlobalFakeTimer` 會直接替換處理程序內的 `Date.now` / `performance.now`。這是**全域副作用**，會影響整個程序，請務必配對 `uninstallGlobalClock()` 還原。

`UnsafeGlobalFakeTimer` replaces the process-wide `Date.now` / `performance.now`. This is a
**global side effect** affecting the whole process — always pair it with `uninstallGlobalClock()`.

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

---

## 2. 進階取值 / Advanced accessors

- `initTime: dayjs.Dayjs`（getter）
  虛擬時鐘的初始時間（t=0 基準）。等於 `timer.data.fake_init`，但為**公開**取值，不必操作底層 `data`。
  Public accessor for the initial virtual clock; equals `timer.data.fake_init` without reaching into internals.
  - 用途 / Use：`timer.now().diff(self.initTime)` 取得「自建立以來經過的毫秒數」。

- `frameInterval: dayjs.Duration`
  `requestAnimationFrame` 的每影格間隔，預設 `1000/60` ms（約 60fps）。可直接覆寫以模擬不同刷新率。
  Per-frame interval for `requestAnimationFrame`, default `1000/60` ms. Override directly to simulate other refresh rates.

> 內部狀態 `timer.queue` / `timer.cache.done` / `timer.data` 屬實作細節；直接操作會繞過 time-jump 防護與快取不變式。請見 [`anti-patterns.md`](./anti-patterns.md)。
> Internal state (`timer.queue` / `timer.cache.done` / `timer.data`) is an implementation detail; touching it bypasses the time-jump guard and cache invariants. See [`anti-patterns.md`](./anti-patterns.md).

---

## 3. 型別與列舉 / Types & enums

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

## 4. 執行控制 API / Run-control API

不屬於核心四動詞（`set` / `clear` / `start` / `run`），用於中斷進行中的 run：

| 方法 / Method | 說明 / Description |
| --- | --- |
| `pause()` | 暫停進行中的 run，並將虛擬時間修正為下一個待執行項目的觸發時間 / pause the in-progress run and correct virtual time to the next pending item's timing |
| `cancel()` | 取消進行中的 run，並將虛擬時間修正回本次 run 開始前的值 / cancel the in-progress run and correct virtual time back to the pre-run value |

- 兩者只在 `run` / `start` / `runAsync` / `startAsync` 執行回呼期間有意義；其餘時間為 no-op。
- 與時間跳躍防護的關係，見 [`anti-patterns.md`](./anti-patterns.md) 與 [`README.md`](./README.md) 的時間跳躍防護章節。
