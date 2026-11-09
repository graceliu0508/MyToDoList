// Firebase 專案設定檔 (Project ID: my-to-do-list-50788)

export const defaultFirebaseConfig = {
  apiKey: "AIzaSyAmFUkr2RBd4FzkLkuuiUBkPYBfcay9dSw",
  authDomain: "my-to-do-list-50788.firebaseapp.com",
  projectId: "my-to-do-list-50788",
  storageBucket: "my-to-do-list-50788.firebasestorage.app",
  messagingSenderId: "65821009750",
  appId: "1:65821009750:web:613eea786cd64224e0d8f7"
};

export function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem("mytodolist_firebase_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && !parsed.apiKey.startsWith("REPLACE_") && parsed.projectId) {
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
