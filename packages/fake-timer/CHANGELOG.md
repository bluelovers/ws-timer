# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.1](https://github.com/bluelovers/ws-timer/compare/fake-timer@3.0.0...fake-timer@3.0.1) (2026-09-26)



### ♻️　Chores

* **fake-timer:** 將 demo 範例檔案包含在 npm 發佈範圍內 ([a5497ab](https://github.com/bluelovers/ws-timer/commit/a5497ab2c047c161f0332e9e6ce613678f1c1b06))



# [3.0.0](https://github.com/bluelovers/ws-timer/compare/fake-timer@2.0.2...fake-timer@3.0.0) (2026-09-26)


### BREAKING CHANGES

* **fake-timer:** 優化回呼函數簽章並修正參數傳遞



### ✨　Features

* **fake-timer:** 新增 initTime 公開 API 以取得虛擬時鐘初始時間 ([4e01475](https://github.com/bluelovers/ws-timer/commit/4e01475ecf5094bcad1810374331f455a4888b3e))
* **fake-timer:** 擴充計時器狀態資訊，新增註冊時間與觸發次數追蹤 ([da57d6b](https://github.com/bluelovers/ws-timer/commit/da57d6b87b15cb0ad1da481c720a62e3cedc74a9))
* **fake-timer:** 支援 setTimeout 額外參數轉交與延遲參數選填 ([8e2058f](https://github.com/bluelovers/ws-timer/commit/8e2058f643fcc0957bd6a769e721efb757a5fde7))


### 📦　Code Refactoring

* **fake-timer:** 將內部屬性命名由 fake 改為 virtual 以提升語意清晰度 ([7d030c4](https://github.com/bluelovers/ws-timer/commit/7d030c4508367c2094eee4000226648b39c24fa3))
* **fake-timer:** 優化內部實作細節並強化註釋說明 ([d123ed5](https://github.com/bluelovers/ws-timer/commit/d123ed59da749c5ac01ba7f2b7e46bac1accacb1))
* **fake-timer:** 實作 delay 正規化邏輯與錯誤檢查 ([2de01f0](https://github.com/bluelovers/ws-timer/commit/2de01f0d69a8d86d5d3b565973cb88b6390376f6))
* **fake-timer:** 優化回呼函數簽章並修正參數傳遞 ([847356f](https://github.com/bluelovers/ws-timer/commit/847356f0b633b3ce11917f173b9a4d045e6eba35))
* **queue:** 優化計時器新增時的時間戳記一致性 ([e2eb0d2](https://github.com/bluelovers/ws-timer/commit/e2eb0d23e37ce1c9d72b45708e6c21abf2592463))


### 📚　Documentation

* **fake-timer:** 重構文件架構並完善 API 說明文件 ([25bd9e2](https://github.com/bluelovers/ws-timer/commit/25bd9e2c3c0d419452e1d3e7bf5a84a8ee284c37))
* **fake-timer:** 新增使用說明文件與範例程式碼 ([6cba653](https://github.com/bluelovers/ws-timer/commit/6cba6533561fb846f39d98254c856b65285c5b4e))


### 🛠　Build System

* **fake-timer:** 更新編譯產物以反映屬性更名變更 ([80b85c6](https://github.com/bluelovers/ws-timer/commit/80b85c6a4ea156d2449fb8cf852a12c36550201f))
* **fake-timer:** 更新編譯產物以反映執行狀態管理實作 ([fd7fb42](https://github.com/bluelovers/ws-timer/commit/fd7fb42186c93022ac0eae1ce47b3c10077fad67))



## [2.0.2](https://github.com/bluelovers/ws-timer/compare/fake-timer@2.0.1...fake-timer@2.0.2) (2026-09-26)


### BREAKING CHANGES

* **fake-timer:** 實作執行狀態管理與運行中防護機制
* **fake-timer:** 重構計時器 API 為同步模式並新增時間推進方法



### 🐛　Bug Fixes

* **fake-timer:** 修復計時器在回呼中被清除或追加時的執行行為 ([45611bf](https://github.com/bluelovers/ws-timer/commit/45611bfcd90900f6dc250bd9d8e06e2875d98e7e))
* **fake-timer:** 修復週期性計時器在單次快轉中的觸發邏輯 ([5f9f207](https://github.com/bluelovers/ws-timer/commit/5f9f207403bf870b70ff1a207984036b844ef9b9))
* **fake-timer:** 防止在空佇列執行 start 時導致 fake_now 變成無效日期 ([e33e095](https://github.com/bluelovers/ws-timer/commit/e33e095713ecdbe7d23f9ee60ebb5f012426a565))
* **fake-timer:** 修復在執行任務時因陣列位移導致跳過項目的問題 ([22e72ea](https://github.com/bluelovers/ws-timer/commit/22e72eaf51b468602d937f7ba6ab2dd431681288))


### ✨　Features

* **fake-timer:** 更新類型定義以支援執行狀態管理與中斷機制 ([4d6f497](https://github.com/bluelovers/ws-timer/commit/4d6f497470c20daa09992b6917c51eef48772db7))
* **fake-timer:** 實作執行狀態管理與運行中防護機制 ([41d4c02](https://github.com/bluelovers/ws-timer/commit/41d4c0289a203cd1c9cd62b215db397f319d4958))
* **fake-timer:** 新增 runGenerator 方法以支援生成器迭代執行 ([598e65e](https://github.com/bluelovers/ws-timer/commit/598e65ecfa9c67a8741299825aa1631a767799c6))
* **fake-timer:** 擴充計時器控制 API 與重構內部排程邏輯 ([191d05b](https://github.com/bluelovers/ws-timer/commit/191d05bf6eb6ef479867000fe3d0c31048849112))
* **fake-timer:** 新增 requestAnimationFrame 與佇列管理 API ([15ba5a3](https://github.com/bluelovers/ws-timer/commit/15ba5a367916961559cb0c1bd0a13b2e5dab709a))
* **fake-timer:** 新增 clear* 系列 API 並實作 setInterval 週期性重複功能 ([45b5a95](https://github.com/bluelovers/ws-timer/commit/45b5a952c3baa4dd8126274d277bdbcbb4a7df45))


### 📦　Code Refactoring

* **fake-timer:** 優化排程核心邏輯並改用二分插入法 ([fd83219](https://github.com/bluelovers/ws-timer/commit/fd83219169adfddecf8489c9318b7b4e8f8164ee))
* **fake-timer:** 優化型別匯入與列舉定義 ([0bf7934](https://github.com/bluelovers/ws-timer/commit/0bf793439987c41ddaa8d57d0ebc7831cb0be395))
* **fake-timer:** 強化型別定義並統一介面參數 ([296bb23](https://github.com/bluelovers/ws-timer/commit/296bb239b11fec7cf59fae8f55a16762d7736aad))
* **fake-timer:** 使用列舉優化計時器類型與全域狀態管理 ([ecc10b5](https://github.com/bluelovers/ws-timer/commit/ecc10b5fb2280af3a8c634f3a415af4575cc8bb5))
* **fake-timer:** 重構計時器 API 為同步模式並新增時間推進方法 ([af3ca3a](https://github.com/bluelovers/ws-timer/commit/af3ca3aec1f112d3b9628040f4d21ac66643fff0))
* **fake-timer:** 將 toDuration 函式移至主入口點並公開 API ([1316d94](https://github.com/bluelovers/ws-timer/commit/1316d945530677c49459946bfd0d9ea097393553))


### 📚　Documentation

* **readme:** 更新專案說明文件以提供更完整的 API 指引 ([a34d627](https://github.com/bluelovers/ws-timer/commit/a34d627763bf39a39e64fb6c898719acb53ce076))


### 🚨　Tests

* **fake-timer:** 新增亂序排程與多次快轉之邊界測試案例 ([bdd1d6b](https://github.com/bluelovers/ws-timer/commit/bdd1d6b7095d84c3cd9029b38a7c5210bef41bcb))


### ♻️　Chores

* **fake-timer:** 優化建置流程與測試腳本執行時機 ([5ede79a](https://github.com/bluelovers/ws-timer/commit/5ede79ac5ff502e75832ea37cc2207660d90b42e))



## [2.0.1](https://github.com/bluelovers/ws-timer/compare/fake-timer@1.0.3...fake-timer@2.0.1) (2026-09-21)



### 📦　Code Refactoring

* **fake-timer:** 重構核心類別名稱並優化匯出結構 ([c60a3bd](https://github.com/bluelovers/ws-timer/commit/c60a3bdfcb08460252c1d72a4dbc640552793853))
* **fake-timer:** 優化型別定義並調整編譯配置 ([3854eeb](https://github.com/bluelovers/ws-timer/commit/3854eeb1f27933be4e50ed568817f595d9f66e28))
* **fake-timer:** 整合並導出核心 Timer 類別與實例 ([87d0776](https://github.com/bluelovers/ws-timer/commit/87d0776b20e30d1742969bf6595928e400b7d26e))
* **fake-timer:** 重構專案結構並優化套件發佈配置 ([22d1cd2](https://github.com/bluelovers/ws-timer/commit/22d1cd25c0f7c34472cbe6bf045ed9d4ba54ceae))
* **fake-timer:** 將時間處理邏輯從 moment 切換至 dayjs 並優化測試架構 ([a9ead65](https://github.com/bluelovers/ws-timer/commit/a9ead65824659c32b9b305916de9b352cbe50227))


### 📚　Documentation

* **fake-timer:** 完善核心原始碼註解與型別定義文件 ([aea01aa](https://github.com/bluelovers/ws-timer/commit/aea01aa0eb600daad33ad76afb01a0ec28e08cf9))


### 🛠　Build System

* **fake-timer:** 更新編譯產物以反映核心類別重構 ([c1278a8](https://github.com/bluelovers/ws-timer/commit/c1278a88fad24704512e1120edfec786c54972dd))
* **fake-timer:** 生成編譯產物並支援多種模組格式 ([1357fef](https://github.com/bluelovers/ws-timer/commit/1357fef4f02196649bd3a01fa324e26ecccf681c))
* **workspace:** 從 yarn 切換至 pnpm 並更新工作區配置 ([3d6dd52](https://github.com/bluelovers/ws-timer/commit/3d6dd5213fbf0ce7bf9ed768935b9732fa80f841))


### 🔖　Miscellaneous

* . ([99310b8](https://github.com/bluelovers/ws-timer/commit/99310b883b101e3d905280e9a6beb2768db912c2))



## [1.0.3](https://github.com/bluelovers/ws-timer/compare/fake-timer@1.0.2...fake-timer@1.0.3) (2020-08-15)


### 🔖　Miscellaneous

* . ([d0af4e1](https://github.com/bluelovers/ws-timer/commit/d0af4e1dafeba8365b5223d88015908e5da1816d))





## 1.0.2 (2020-08-15)


### 🔖　Miscellaneous

* . ([f5cb5e3](https://github.com/bluelovers/ws-timer/commit/f5cb5e378c61fe13dbca52a152a5430aa0791828))
* . ([b965ff4](https://github.com/bluelovers/ws-timer/commit/b965ff45f00687c66c2ac5f2ad18c4980ed28022))
* . ([a7c4d37](https://github.com/bluelovers/ws-timer/commit/a7c4d37649a02b0afd3fc7c1757825f2c40384ab))
* Add 'packages/fake-timer/' from commit '31205408fdf4b450b173a47592efadd13a38a54a' ([182af7c](https://github.com/bluelovers/ws-timer/commit/182af7c22f61067a25458f58678fd3a68c85a01c))





## 1.0.1 (2020-08-15)


### 🔖　Miscellaneous

* . ([b965ff4](https://github.com/bluelovers/ws-timer/commit/b965ff45f00687c66c2ac5f2ad18c4980ed28022))
* . ([a7c4d37](https://github.com/bluelovers/ws-timer/commit/a7c4d37649a02b0afd3fc7c1757825f2c40384ab))
* Add 'packages/fake-timer/' from commit '31205408fdf4b450b173a47592efadd13a38a54a' ([182af7c](https://github.com/bluelovers/ws-timer/commit/182af7c22f61067a25458f58678fd3a68c85a01c))
