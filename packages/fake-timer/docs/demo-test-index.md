# Demo 與 Test 索引 / Demo & Test Index

## 本檔目的 / Purpose

本檔是 `packages/fake-timer` 下所有**範例（demo）**與**測試（test）**的統一索引，說明每個檔案的：

- **意圖（Intent）**：它要示範或驗證什麼。
- **職責定位（Responsibility）**：它在整個套件中的角色與邊界，避免重複或錯放。

This file is the single index for every **demo** and **test** under `packages/fake-timer`. For each
file it states its **intent** (what it demonstrates or verifies) and its **responsibility**
(its role and scope within the package), so nothing is duplicated or misplaced.

> 慣例 / Convention：
> - 範例位於 `test/demo/*.ts`，以 `tsx test/demo/NN-*.ts` 直接執行觀察輸出。
> - 測試為 `*.node-test.ts`，以 `tsx --test test/*.node-test.ts` 執行（含 `test/issues/` 子目錄）。
> - Demos: `test/demo/*.ts`, run with `tsx test/demo/NN-*.ts`.
> - Tests: `*.node-test.ts`, run with `tsx --test test/*.node-test.ts` (including `test/issues/`).

---

## Demo 索引 / Demos

| 檔案 / File | 意圖（Intent） | 職責定位（Responsibility） |
| --- | --- | --- |
| `test/demo/01-basic-usage.ts` | 基本用法：`set*` 同步回傳句柄；`start` / `advance` / `run` 的分工。 | 入門範例，建立「排程 → 推進 → 執行」的心智模型。 |
| `test/demo/02-callback-sees-final-time.ts` | 澄清「回呼讀到的是最終時間，而非各排程邊界」——最常被誤解的一點。 | 語意澄清，對齊原生 `setTimeout` 的「跳躍後當下時間」行為。 |
| `test/demo/03-interval-catchup.ts` | 週期計時器一次 `start` 跨多個週期時的 catch-up 補償（不漂移）。 | 示範 `setInterval` 的重複語意與多週期補償。 |
| `test/demo/04-step-to-next-and-caveats.ts` | `start(-1)` 跳到最早排程並執行，及其 `cache.min` 失效陷阱。 | 進階「逐格前進」語意 + 對應坑，銜接 `docs/misc-api.md`。 |
| `test/demo/05-time-jump-guard.ts` | `run` / `start` 期間時鐘鎖定；回呼內 `advance` 拋錯、`start` 為 no-op。 | 示範 time-jump 防護機制，防止回呼內惡意/意外推進時鐘。 |
| `test/demo/06-read-clock.ts` | 正確讀取虛擬時鐘（`now()` 回 `dayjs`、用 `diff` 取經過毫秒）；勿用 `timer.update`。 | clock 讀取規範，標註「不要用內部 `update`」的反模式。 |
| `test/demo/07-standard-params.ts` | 對齊 Web `setTimeout`：`delay` 之後的額外引數原樣轉交給回呼。 | 標準引數相容示範，驗證 `...params` 轉交。 |
| `test/demo/09-interval-count.ts` | `setInterval` 回呼讀 `current.count` 取得觸發次數。 | callback metadata 示範（註冊時間 / 觸發次數）。 |
| `test/demo/10-skill-cooldown.ts` | 綜合：技能依 `0 / 1 / 5` 秒觸發並有冷卻（`inUse` + `cooldownUntil`）；使用 `self` / `params` / `initTime`。 | 應用整合範例（遊戲技能冷卻），串接多個 API 與 callback 元資料。 |

---

## Test 索引 / Tests

| 檔案 / File | 意圖（Intent） | 職責定位（Responsibility） |
| --- | --- | --- |
| `test/timer.node-test.ts` | 核心 timer 行為主測試（`set*` / `run` / `advance` / `setImmediate` 等）。 | 主測試套件，涵蓋核心 surface 的整體行為。 |
| `test/timer-clear-add.node-test.ts` | 回呼內呼叫 `clear*` 與在回呼內 `set*` 追加新計時器的行為。 | 驗證「取消」與「動態追加」在執行期的互動。 |
| `test/timer-args.node-test.ts` | 對齊標準 `setTimeout` 的額外引數轉交 + `normalizeDelay` 防禦 + `initTime` 公開取值。 | API 相容性與防禦性驗證（含本次新增的 `initTime`）。 |
| `test/diff.node-test.ts` | 覆蓋所有內部 `diff()` 使用點（`hasExpires` / `queueSort` / `run`）。 | 聚焦內部排序與到期邏輯的精確度，非行為面。 |
| `test/issues/run-array-shift.node-test.ts` | 迴歸：`run()` 迭代中移除項目不得跳過（`for...in` + `splice` 位移 bug）。 | 迭代安全迴歸，守護「不漏執行到期項目」。 |
| `test/issues/extra-api.node-test.ts` | 迴歸：`clearAll` / `reset` / `requestAnimationFrame` / 全域時鐘 等延伸 API。 | 守護基礎 `set*` / `clear*` 之上的延伸 API 表面。 |
| `test/issues/clear-timeout-api.node-test.ts` | 迴歸：`clearTimeout` / `clearInterval` / `clearImmediate` 通用 `ITimerHandle`。 | 守護取消 API 語意（item / name / index 皆可用）。 |
| `test/issues/start-empty-queue.node-test.ts` | 迴歸：空佇列上 `start(-1)` 不得破壞 `fake_now`。 | 邊界防禦，守護「空佇列」的 `-1` 跳轉語意。 |
| `test/issues/set-interval-repeat.node-test.ts` | 迴歸：`setInterval` 必須真正週期重複（不再等同 `setTimeout`）。 | 守護 interval 重複語意與 `clearInterval` 停止能力。 |
| `test/issues/sync-async-api.node-test.ts` | 迴歸：`set*` 真正同步、`runAsync` / `startAsync` `await` 回呼、共用 `_runCore`。 | 守護同步 / 非同步介面契約與單一實作來源。 |

---

## 內部 / 開發用檔案（非套件一部分）/ Internal dev files

下列檔案不是範例、也不是測試套件的一部分，僅供開發期使用，請勿依賴：

The following files are **not** demos or tests; they are dev-only helpers and should not be relied upon:

| 檔案 / File | 說明 / Description | 定位 / Status |
| --- | --- | --- |
| `test/__root.ts` | 測試根型別 / 全域宣告（dev）。 | 內部，非範例/測試。 |
| `test/__root-core.d.ts` | 核心型別宣告（dev）。 | 內部，非範例/測試。 |
| `test/_local-dev.ts` | 開發期臨時腳本。 | 內部，不納入套件。 |
| `test/temp.ts` | 開發期臨時腳本。 | 內部，不納入套件。 |
| `test/demo.ts`（root） | 舊版（2017）以全域 `defaultFakeTimer` 執行的 demo 彙總，印出 callback metadata。 | 遺留 demo；非結構化 `test/demo/` 套件的一部分。 |
