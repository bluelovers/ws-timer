# 常見誤用與「為什麼會寫成那樣」

本文件針對一個真實案例（`next-hof` 專案的 `FakeTimeService`）說明：它為什麼會用內部 API 自組邏輯、
實際上誤解了什麼，以及如何正確理解 fake-timer。

> 以下行為都已用 `test/demo/*.ts` 實際執行驗證過。

---

## 0. 結論

`FakeTimeService.advance(ms)` 裡有三處依賴 fake-timer 內部：

1. 手刻「逐格走到觸發時刻」的迴圈，用 `timer.sort()` / `timer.cache.min` / `timer.data.virtual_init`
   自己重組「下一個觸發時刻」。
2. 重入分支直接呼叫 `timer.update(...)` 繞過 `advance()` 的 time-jump 防護。
3. 註解聲稱「回呼讀到排程邊界」是「對應原生計時器逐次觸發的行為」——這句話本身是對原生行為的誤解。

**它為什麼這樣寫**：它想要「每個回呼讀到自己排程的那一刻（100/200/300）」這種確定性重播語意，
而 fake-timer 的 `start()` 給的是「最終時間 (350)」。為了做出邊界語意，它只能自組迴圈並戳內部 API；
為了讓「回呼內 `advance()`」也能推進時間，它又去戳 `timer.update` 繞過防護。

**但**：邊界語意是**自訂**需求，不是 fake-timer / 原生行為；而且「回呼內 `advance()` 能推進時間」
與 fake-timer 的公開合約**不相容**（run 進行中禁止推進時鐘）。所以它被迫用的那些內部 API，正是不穩定
且「擅自組合」的來源。

---

## 1. 誤用一：以為回呼會讀到「排程邊界」

**程式碼以為的事**：「回呼讀到的 `now()` 是它被排程的邊界……對應原生計時器逐次觸發的行為。」

**實際行為**：`start(350)` 先一口氣把時鐘推到 **350**，再執行所有到期回呼。回呼內讀到的時鐘一律是 **350**。
這與原生 `setTimeout` 一致：原生下時間是真實流逝的，回呼執行當下 `Date.now()` 讀到的是「跳躍後的當下時間」，
不是當初設定的延遲。

```ts
const t = new FakeTimer();
const seen = [];
t.setInterval(() => seen.push(t.timer.now().diff(t.timer.data.virtual_init)), 100);
t.start(350);
seen; // => [350, 350, 350]   （不是 [100, 200, 300]）
```

**結論**：「回呼讀到各自邊界」既不是 fake-timer 的行為、也不是原生行為。如果產品真的需要這種語意，
它是**你自己的擴充**，應明確寫進註解（而不是宣稱對應原生）。實作它確實只能靠自組迴圈 + 內部 API——
這就是那段程式碼看起來「繞了一圈」的原因：它在用內部零件硬做出一個 fake-timer 沒提供的語意。

> 正確語意與驗證見 `docs/README.md` §4、`test/demo/02-callback-sees-final-time.ts`。

---

## 2. 誤用二：重入 `advance()` 去戳 `timer.update()`

**程式碼怎麼做**：

```ts
// 在 advance() 裡，run 進行中（this.running === true）再次被呼叫時：
if (this.running) {
  this.clock.update(Math.max(0, ms)); // 直接戳内部时钟
  return;
}
```

**為什麼這是問題**：

- `update()` 是 `TimeCore` 的**內部**方法，`advance()` 內部才會去呼叫它；公開的「推進時間」入口是
  `FakeTimer.advance()` / `start()`。`timer` 雖是公開屬性，但其 `update`/`sort`/`cache`/`data` 屬於內部結構。
- fake-timer 的 `advance()` 在 run 進行中**刻意丟 `TypeError`**（time-jump guard），文件寫著
  「a callback must not mutate `now` mid-run」。這段程式碼卻用 `update()` 繞過這道防護去改 `now`。
- 後果：`_runCore` 在 run 開始時就把 `now` 抓進區域變數。你在回呼裡用 `update()` 改了 `virtual_now`，
  但 `_runCore` 手上的 `now` 是舊的，導致這一輪 run 可能**提早結束或漏跑/重跑**，只能靠外層迴圈補救——脆弱。

**為什麼它「需要」這樣**：測試要求「回呼內呼叫 `advance(100)`，當下 `now()` 要立刻反映 200」。但 fake-timer 的
公開合約**禁止在 run 進行中推進時間**（`advance()` 丟錯、`start()` 變 no-op）。所以若堅持這條合約，作者別無選擇
只能戳 `update`——這正說明該合約本身與 API 不相容。

**正確做法**：

- **不要**在 run 進行中用 `update()` 推進時鐘。
- 若想讓更多計時器在同一輪觸發，**排程**它們（`setTimeout`/`setInterval`）；回呼內新增「已到期」的計時器會經由
  內部 `tryAdd` 自動併入同一輪 run 並執行。
- 若你真的需要「回呼內 `advance()` 能推進時間」這條合約，請把它當成對 fake-timer 的**擴充需求**，集中在一個私有
  方法裡、加註「依賴內部 `update`，升級時需回測」，而不是散落在 `advance` 主流程。

> 防護驗證見 `test/demo/05-time-jump-guard.ts`；`timer.update` 是內部 API 見 `test/demo/06-read-clock.ts`。

---

## 3. 誤用三：手刻 `nextTimerAt()` 重組「下一個觸發時刻」

**程式碼怎麼做**：

```ts
nextTimerAt(): number | null {
  const clock = this.clock;
  clock.sort();                                  // 內部：重新排序佇列
  const min = clock.cache.min;                   // 內部：min/max 快取
  return min == null ? null : min.diff(clock.data.virtual_init);  // 內部：data.virtual_init
}
```

然後在 `advance()` 的迴圈裡用 `this.fakeTimer.start(next - this.now())` 逐格推進。

**這其實是 fake-timer 已經有的語意**：`start(-1)` 的語意就是「跳到最早排程並執行」（見 `docs/README.md` §5）。
也就是說，那段 `sort()` + `cache.min` + `data.virtual_init` 的手刻邏輯，是在**重新發明 `start(-1)`**。

**為什麼它沒直接用 `start(-1)`**：因為 `start(-1)` 讀 `cache.min` 的時機在 `sort()` **之前**，而
`remove()`/`clearTimeout()` 並不會刷新 `cache.min`。所以取消計時器後 `start(-1)` 會跳到**失效**的 `cache.min`
（時鐘甚至往回跳）。而 `nextTimerAt()` 先 `sort()` 再讀 `cache.min`，反而比 `start(-1)` 更**正確**地避開了這個
stale-cache 陷阱。

**結論**：這一處是「合理但耦合內部」——它繞過了 `start(-1)` 的已知缺陷，代價是緊綁 `timer.sort` / `timer.cache` /
`timer.data`。若你接受 fake-timer 的 stale-cache 行為，直接用 `start(-1)`（先 `sort()` 再呼叫）即可；若不能接受，
則 `nextTimerAt()` 這種「先 sort 再讀 cache」的寫法可以接受，但請把這些內部存取集中、加註「依賴內部結構」。

> 對照見 `test/demo/04-step-to-next-and-caveats.ts`。

---

## 4. 最小正確實作

若你只要「`advance(ms)` 推進虛擬時鐘並執行到期回呼」，**就是一行 `start(ms)`**：

```ts
advance(ms: number): void {
  this.fakeTimer.start(ms); // 預設用 start，不要預設用 advance
}
```

- 不需要迴圈、不需要 `sort()`/`cache.min`/`data.virtual_init`、不需要 `timer.update`。
- 若需要「回呼錯誤不要中斷整輪、最後拋第一個」，在 `setTimeout` 外包一層 `try/catch` 收集即可（對公開 API 的合理使用）。
- 若需要「邊界時間」語意：請視為自行擴充，集中內部存取並清楚註解；它**不是** fake-timer 提供的，也**不是**原生行為。

---

## 5. 一頁清單

- 推進＋執行：用 `start(ms)`（預設）。只移動：`advance(ms)`（僅在 `start`/`run` 做不到時）。只執行：`run()`。
- 回呼讀到的是**最終時間**（符合原生）。要邊界時間＝自訂擴充。
- 不要在 run 進行中用 `timer.update()` 推進時鐘（繞過 time-jump 防護，會讓 run 內部 `now` 脫鉤）。
- 回呼內想觸發更多計時器：用 `setTimeout`/`setInterval` 排程（已到期的會自動併入同輪 run）。
- `start(-1)` 會跳到最早排程並執行；但 `remove()`/`clearTimeout()` 後 `cache.min` 不刷新，可能跳到失效值（甚至往回跳）。
  安全做法：先 `timer.sort()` 再 `start(-1)`，或用 `run()` / 正數 `advance(ms)`。
- 讀時鐘：`timer.now()` 是 dayjs；經過毫秒 = `timer.now().diff(timer.data.virtual_init)`。
- 不要把 `timer.update` / `timer.sort` / `timer.cache` / `timer.data` 拿來重組排程邏輯（內部結構，會變）。
