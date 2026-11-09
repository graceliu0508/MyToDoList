# MyToDoList — 多人即時協作待辦清單

**MyToDoList** 是一個基於 **Firebase (`my-to-do-list-50788`)** 打造的現代化多人即時協作待辦清單網頁應用程式（Web Application），支援 **Google 帳號一鍵登入**、**多清單協作空間**、**成員邀請與即時同步**。

---

## ✨ 核心功能

- **🔐 Google 帳號登入（Firebase Authentication）**
  - 支援使用 Google 帳號安全登入與登出，自動同步使用者頭像、顯示名稱與 Email。
- **🤝 多人即時協作清單（Cloud Firestore 即時同步）**
  - 建立專屬或團隊協作清單（Workspace / Shared Lists）。
  - 透過 **6 位數邀請碼** 或 **Email 邀請** 團隊成員加入同一個待辦清單。
  - 所有成員新增、勾選完成、編輯或刪除待辦事項時，畫面皆透過 Firestore `onSnapshot` 毫秒級即時同步。
- **📋 完整的任務管理**
  - 支援設定任務標題、分類標籤、優先級（高 / 中 / 低）、截止日期（Due Date）與負責成員指派。
  - 清楚顯示每個待辦事項的建立者、最後更新者與完成狀態。
  - 支援篩選（全部 / 進行中 / 已完成 / 指派給我）與關鍵字即時搜尋。
- **📊 即時進度統計**
  - 自動計算清單完成率進度條、待辦總數、已完成數與高優先級任務提醒。

---

## 🗂️ 專案目錄結構

```text
MyToDoList/
├── public/
│   ├── index.html          # 主應用程式介面
│   ├── styles.css          # 現代化響應式介面樣式 (Glassmorphism + Dark/Light 質感設計)
│   ├── firebase-config.js  # Firebase 專案 (my-to-do-list-50788) SDK 設定檔
│   └── app.js              # Google 登入、多人清單管理與 Firestore 即時同步核心邏輯
├── .firebaserc             # 綁定 Firebase 專案 ID (my-to-do-list-50788)
├── firebase.json           # Firebase Hosting 與 Firestore 設定
├── firestore.rules         # Cloud Firestore 多人協作安全規則
├── firestore.indexes.json  # Cloud Firestore 索引設定
├── .gitignore              # Git 忽略清單
└── README.md               # 專案說明文件
```

---

## 🚀 快速開始與本地執行

### 1. 確認 Firebase 設定
專案已綁定 Firebase 專案 `my-to-do-list-50788`。若需更新 Web App SDK 金鑰，可執行：

```bash
npx -y firebase-tools@latest apps:sdkconfig WEB --project my-to-do-list-50788
```

並確認 `public/firebase-config.js` 內的 `firebaseConfig` 欄位設定正確。

### 2. 本地啟動預覽
可以使用 Firebase CLI 或 `npx serve` 在本地啟動開發伺服器：

```bash
npx -y firebase-tools@latest serve --only hosting --port 5000
```

在瀏覽器開啟 `http://localhost:5000` 即可使用。

### 3. 部署至 Firebase
將 Firestore 安全規則與網頁應用程式一鍵部署至 `my-to-do-list-50788`：

```bash
npx -y firebase-tools@latest deploy --project my-to-do-list-50788
```

---

## 🔒 安全性與資料結構設計

- **`users/{userId}`**：儲存登入使用者的基本資料（`uid`、`displayName`、`email`、`photoURL`）。
- **`todoLists/{listId}`**：儲存協作清單資訊（`name`、`ownerId`、`memberIds`、`members`、`inviteCode`、`createdAt`）。
- **`todoLists/{listId}/tasks/{taskId}`**：儲存清單內的待辦事項（`title`、`completed`、`priority`、`dueDate`、`assigneeName`、`createdBy`、`updatedAt`），僅清單成員具備讀寫權限。
