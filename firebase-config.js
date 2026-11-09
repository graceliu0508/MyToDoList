// Firebase 專案設定檔 (Project ID: my-to-do-list-50788)
// 若透過 Firebase CLI 自動抓取後，此檔案會自動填入正式 Web App 金鑰；
// 同時支援在網頁介面右上角「Firebase 設定」隨時檢視或更新設定。

export const defaultFirebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_FIREBASE_API_KEY",
  authDomain: "my-to-do-list-50788.firebaseapp.com",
  projectId: "my-to-do-list-50788",
  storageBucket: "my-to-do-list-50788.firebasestorage.app",
  messagingSenderId: "REPLACE_WITH_SENDER_ID",
  appId: "REPLACE_WITH_APP_ID"
};

export function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem("mytodolist_firebase_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("讀取自訂 Firebase 設定失敗:", err);
  }
  return defaultFirebaseConfig;
}

export function isFirebaseConfigured(config = getActiveFirebaseConfig()) {
  return Boolean(
    config &&
    config.apiKey &&
    !config.apiKey.startsWith("REPLACE_WITH_") &&
    config.projectId === "my-to-do-list-50788"
  );
}
