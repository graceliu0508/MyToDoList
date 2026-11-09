# MyToDoList — 多人即時協作待辦清單

**MyToDoList** 是一個基於 **Firebase (`my-to-do-list-50788`)** 打造的現代化多人即時協作待辦清單網頁應用程式（Web Application），支援 **Google 帳號一鍵登入**、**多清單協作空間**、**成員邀請與即時同步**。

- 🌐 **GitHub Pages 線上網址**：https://graceliu0508.github.io/MyToDoList/
- 📦 **GitHub Repository**：https://github.com/graceliu0508/MyToDoList

---

## ✨ 核心功能

- **🔐 Google 帳號登入（Firebase Authentication）**
  - 支援使用 Google 帳號安全登入與登出，自動同步使用者頭像、顯示名稱與 Email。
- **🤝 多人即時協作清單（Cloud Firestore 即時同步）**
  - 建立專屬或團隊協作清單（Workspace / Shared Lists）。
  - 透過 **6 位數邀請碼** 或 **分享連結** 邀請團隊成員加入同一個待辦清單。
  - 所有成員新增、勾選完成、編輯或刪除待辦事項時，畫面皆透過 Firestore `onSnapshot` 毫秒級即時同步。
- **📋 完整的任務管理**
  - 支援設定任務標題、分類標籤、優先級（高 / 中 / 低）、截止日期（Due Date）與負責成員指派。
  - 清楚顯示每個待辦事項的建立者、最後更新者與完成狀態。
  - 支援篩選（全部 / 待完成 / 已完成 / 指派給我 / 高優先）與關鍵字即時搜尋。
- **📊 即時進度統計**
  - 自動計算清單完成率進度條、待辦總數、進行中與已完成統計。

---

## 🗂️ 專案目錄結構

```text
MyToDoList/
├── index.html            # 主應用程式介面 (GitHub Pages 入口)
├── styles.css            # 現代化響應式介面樣式 (Glassmorphism 深色質感設計)
├── firebase-config.js    # Firebase 專案 (my-to-do-list-50788) SDK 設定檔
├── app.js                # Google 登入、多人清單管理與 Firestore 即時同步核心邏輯
├── .firebaserc           # 綁定 Firebase 專案 ID (my-to-do-list-50788)
├── firebase.json         # Firebase Hosting 與 Firestore 設定
├── firestore.rules       # Cloud Firestore 多人協作安全規則
├── firestore.indexes.json# Cloud Firestore 索引設定
├── package.json          # 專案腳本設定
├── .gitignore            # Git 忽略清單
└── README.md             # 專案說明文件
```

---

## 🚀 快速開始與部署

### 1. GitHub Pages 線上版
直接前往 **https://graceliu0508.github.io/MyToDoList/** 即可使用。
> **注意**：首次在 GitHub Pages 使用 Google 登入時，請確認 Firebase Console > **Authentication** > **Settings** > **Authorized domains（授權網域）** 中已加入 `graceliu0508.github.io`。

### 2. 本地啟動預覽
```bash
npx -y firebase-tools@latest serve --only hosting --port 5000
```

### 3. 部署 Firestore 規則與 Firebase
```bash
npx -y firebase-tools@latest deploy --project my-to-do-list-50788
```
