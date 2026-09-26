# fake-timer 使用說明

可控的假計時器：手動推進虛擬時間，讓依賴 `setTimeout` / `setInterval` / `setImmediate` /
`requestAnimationFrame` 的程式碼能瞬間執行，不必真實等待。

---

## 0. 設計原則

對大多數使用者，fake-timer 的公開 API 已經足夠，不需要自刻排程系統。

- 排程：`setTimeout` · `setInterval` · `setImmediate` · `requestAnimationFrame`
- 推進＋執行：`start(ms)`
- 只執行已到期項目：`run()`
- 取消：`clearTimeout` · `clearInterval` · `clearAll` · `reset`

**預設請用 `start(ms)`（它等同 `advance(ms)` + `run()`）。** 只有在 `start` / `run`
確實無法滿足的需求下（例如你刻意只想移動時間、稍後再 `run`），才直接使用 `advance`。

`「回呼讀到排程邊界時間」`與`「回呼內 \`advance()\` 能再推進時鐘」`都不是公開合約的一部分，而是自訂擴充；
若真的需要，請視為對 fake-timer 的擴充並集中處理，不要散落在主流程自組內部 API。詳見 `anti-patterns.md`。

---

## 1. 心智模型

你拿到的是一個手動虛擬時鐘：

- 用 `setTimeout` / `setInterval` / `setImmediate` / `requestAnimationFrame` **排程**計時器。
- 用 `start(ms)` **推進時鐘並執行到期回呼**。
- 想分開做也可以：`advance(ms)` 只移動時鐘；`run()` 只執行到期回呼。

```ts
import { FakeTimer } from 'fake-timer';

const t = new FakeTimer();
t.setTimeout(() => console.log('1s passed'), 1000);
t.start(1000); // 推進 1000ms 並執行到期回呼 → 印出 "1s passed"
```

可執行範例在 `test/demo/*.ts`（`tsx test/demo/NN-*.ts` 直接看輸出）。

---

## 2. 排程 API

| 方法 | 說明 |
| --- | --- |
| `setTimeout(cb, delay)` | 一次性延遲計時器 |
| `setInterval(cb, delay)` | 週期性計時器（到期後以 `timing + interval` 重新排程） |
| `setImmediate(cb)` | 立即執行（延遲視為 0） |
| `requestAnimationFrame(cb)` | 於下一個影格觸發（預設間隔 `1000/60` ms） |

- `delay` 可為毫秒數或 `dayjs` 的 `Duration`。
- 這些方法**同步**回傳佇列項目 `ITimeQueueItem`（即句柄），不回傳 Promise。

---

## 3. 執行與推進時間

| 方法 | 行為 |
| --- | --- |
| `start(amount?)` | 推進時間並同步執行到期項目（**預設使用**） |
| `run()` | 只執行所有到期項目，不動時鐘 |
| `advance(amount?)` | 只推進虛擬時間，不執行回呼（僅在 `start`/`run` 做不到時使用） |
| `startAsync(amount?)` / `runAsync()` | 非同步版本，會 `await` 每個回呼 |
| `runGenerator()` | 以生成器逐個執行，yield 每個項目 |
| `pause()` / `cancel()` | 中斷進行中的 run（見原始碼註解） |

取消：`clearTimeout` / `clearInterval` / `clearImmediate` / `cancelAnimationFrame` 接受統一的
`ITimerHandle`（`number | string | ITimeQueueItem`）。`clearAll()` 清空佇列（時鐘不變）；
`reset()` 清空佇列並把時鐘重置回初始值。

### 2.1 回呼簽章 / Callback signature

回呼固定收到兩個參數：

Callbacks always receive two parameters:

```ts
setTimeout((current, self) => {
  // current：本次觸發的佇列項目（ITimeQueueItem）
  // self   ：所屬的 FakeTimer 實例
  self.timer.now();        // 虛擬時鐘（dayjs）
  current.timing;          // 這個計時器的排程時間（dayjs）
}, 1000);
```

- `self` 就是 `FakeTimer` 實例，想拿佇列或虛擬時鐘請走 `self.timer`。
- 回呼內的 `this` **不是** FakeTimer，而是 `current` 佇列項目本身；請用 `self` 取得 FakeTimer，不要依賴 `this`。
- `self` 是唯一額外參數，沒有第 3 個 `self`/多餘參數。

---

## 4. 時鐘語意（最容易誤解）

### 4.1 回呼讀到的是「最終時間」，不是「排程邊界」

`start(350)` 會先把虛擬時鐘一口氣推到 350，再執行所有 `timing <= 350` 的回呼。
因此回呼內讀到的時鐘一律是 **350**，而不是各自原定的 100 / 200 / 300。

```ts
const t = new FakeTimer();
const seen = [];
t.setInterval(() => seen.push(t.timer.now().diff(t.timer.data.fake_init)), 100);
t.start(350);
console.log(seen); // => [350, 350, 350]   （不是 [100, 200, 300]）
```

這與原生 `setTimeout` 一致：原生下時間是真實流逝的，回呼執行當下 `Date.now()` 讀到的是
「跳躍後的當下時間」，不是當初設定的延遲值。

> 範例：`test/demo/02-callback-sees-final-time.ts`

### 4.2 「讓每個回呼讀到自己的排程邊界」是 fake-timer 不提供的自訂語意

若你需要「第 100 tick 觸發、回呼讀到 100；第 200 tick 觸發、讀到 200」這種確定性重播語意，
那是你自己的設計選擇，不是 fake-timer 或原生計時器的行為。實作它必須自行把時鐘逐格走到每個
計時器的觸發時刻再執行——這會需要觸碰 fake-timer 內部狀態（見 `anti-patterns.md`），請清楚寫進註解，
不要聲稱它「對應原生行為」。

### 4.3 週期計時器會自動 catch-up

`setInterval(cb, 100)` 每次觸發後以 `timing + interval` 重排；一次 `start()` 跨越多個週期邊界時，
會在同一輪 run 內依序補償觸發（不會漂移）。每個回呼讀到的仍是**最終時間**。

> 範例：`test/demo/03-interval-catchup.ts`

---

## 5. `start(-1)`：內建逐格前進 + 陷阱

`start(-1)` 會把負數交給 `advance`，而 `advance` 遇到負數時會把 `timer.cache.min`
（最早排程的絕對時間）當成目標時間直接 `set` 過去，再 `run()`。所以 `start(-1)` =
「推進到最早的那個計時器並執行它」。

```ts
t.setTimeout(cb, 500);
t.setTimeout(cb, 1500);
t.start(-1); // 跳到 500 並執行
t.start(-1); // 跳到 1500 並執行
```

**陷阱**：`cache.min` 是增量快取，`remove()` / `clearTimeout()` 並**不**刷新它。所以「取消最早計時器之後」
再呼叫 `start(-1)`，會跳到已失效的 `cache.min`（時鐘甚至可能往回跳），而不是剩下來最早的那個。

安全做法：先 `timer.sort()` 重建 cache，再 `start(-1)`；或直接用 `run()`（只執行已到期項目、不移動時鐘）/
明確的正數 `advance(ms)`。

> 範例：`test/demo/04-step-to-next-and-caveats.ts`

---

## 6. 時間跳躍防護與回呼內排程

當 `run()` / `start()` / `runAsync()` 正在執行回呼時，虛擬時鐘是被**鎖定**的：

- 在回呼內呼叫 `advance()` 會丟出 `TypeError`。
- 在回呼內呼叫 `start()` 是「多餘的 no-op」（不會再次推進時間）。

所以你**不能**在回呼裡用 `advance()`/`start()` 把時鐘往前推。若想讓更多計時器在這一輪觸發，請「**排程**」它們
（`setTimeout`/`setInterval`）：回呼內新增「已到期」的計時器會經由內部 `tryAdd` 自動併入同一輪 run 並執行。

> 範例：`test/demo/05-time-jump-guard.ts`

---

## 7. 正確讀取虛擬時鐘

- `timer.now()` 回傳 `dayjs.Dayjs`，**不是**數字。
- 取得「自建立以來經過的毫秒數」：`timer.now().diff(timer.data.fake_init)`。
- 也可自己抓基準：`const base = timer.now();` 之後 `timer.now().diff(base)`。

**不要**直接呼叫 `timer.update(...)` 來移動時鐘。那是 `advance()` 內部才使用的內部方法
（公開推進入口是 `FakeTimer.advance()` / `start()`）；自己呼叫會繞過 time-jump 防護與快取不變式。

> 範例：`test/demo/06-read-clock.ts`

---

## 8. 公開 API vs 內部狀態

**公開 API（請只用這些）**：`setTimeout` · `setInterval` · `setImmediate` · `requestAnimationFrame` ·
`advance` · `run` · `runAsync` · `runGenerator` · `start` · `startAsync` ·
`clearTimeout` · `clearInterval` · `clearImmediate` · `cancelAnimationFrame` ·
`clearAll` · `reset` · `pause` · `cancel`。

**內部狀態（避免直接操作）**：`t.timer.update` · `t.timer.sort` · `t.timer.cache` · `t.timer.data` ·
`t.timer.queue`。這些可能隨版本改變，且帶有不變式（例如 `cache.min` 在 `remove` 後不刷新）。
把它們當成實作細節，不要繞過公開 API 去重組行為。

---

## 9. 最小正確封裝

如果你只想要「`advance(ms)` 推進虛擬時鐘並執行到期回呼」，正確實作就是一行：

```ts
class MyTimeService {
  private readonly ft = new FakeTimer();

  // 預設用 start：推進 + 執行
  advance(ms: number): void {
    this.ft.start(ms);
  }

  setTimeout(cb: () => void, delay: number) {
    return this.ft.setTimeout(cb, delay);
  }
  // clearXxx 直接轉呼叫 ft.clearXxx
}
```

若還需要「回呼拋錯時不要中斷整輪、最後再拋出第一個錯誤」，在 `setTimeout` 的回呼外包一層
`try/catch` 收集錯誤即可——這是對公開 API 的合理使用，不需要碰 `update`/`sort`/`cache`。

若有「邊界時間」需求，請參考 `anti-patterns.md` 了解代價與正確歸類方式。
