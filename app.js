import {
  defaultFirebaseConfig,
  getActiveFirebaseConfig,
  isFirebaseConfigured
} from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// ==========================================
// 應用程式狀態
// ==========================================
let appInstance = null;
let auth = null;
let db = null;
let isDemoMode = false;

let currentUser = null;
let todoLists = [];
let activeListId = null;
let tasks = [];
let activeFilter = "all";
let searchQuery = "";

let unsubLists = null;
let unsubTasks = null;
const demoChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("mytodolist_collab_sync") : null;

// ==========================================
// DOM 元素參考
// ==========================================
const connectionBadge = document.getElementById("connectionBadge");
const openConfigBtn = document.getElementById("openConfigBtn");
const bannerConfigBtn = document.getElementById("bannerConfigBtn");
const configWarningBanner = document.getElementById("configWarningBanner");
const userProfileArea = document.getElementById("userProfileArea");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const signOutBtn = document.getElementById("signOutBtn");

const authScreen = document.getElementById("authScreen");
const appWorkspace = document.getElementById("appWorkspace");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const demoModeBtn = document.getElementById("demoModeBtn");

const todoListsContainer = document.getElementById("todoListsContainer");
const newListModalBtn = document.getElementById("newListModalBtn");
const joinListForm = document.getElementById("joinListForm");
const inviteCodeInput = document.getElementById("inviteCodeInput");

const currentListName = document.getElementById("currentListName");
const currentListRoleBadge = document.getElementById("currentListRoleBadge");
const currentListDesc = document.getElementById("currentListDesc");
const memberAvatars = document.getElementById("memberAvatars");
const currentInviteCode = document.getElementById("currentInviteCode");
const copyInviteBtn = document.getElementById("copyInviteBtn");
const deleteListBtn = document.getElementById("deleteListBtn");

const statTotal = document.getElementById("statTotal");
const statActive = document.getElementById("statActive");
const statCompleted = document.getElementById("statCompleted");
const statPercent = document.getElementById("statPercent");
const progressBarFill = document.getElementById("progressBarFill");

const addTaskForm = document.getElementById("addTaskForm");
const taskTitleInput = document.getElementById("taskTitleInput");
const taskPriorityInput = document.getElementById("taskPriorityInput");
const taskCategoryInput = document.getElementById("taskCategoryInput");
const taskAssigneeInput = document.getElementById("taskAssigneeInput");
const taskDueDateInput = document.getElementById("taskDueDateInput");

const filterTabs = document.querySelectorAll(".filter-tab");
const searchTaskInput = document.getElementById("searchTaskInput");
const tasksContainer = document.getElementById("tasksContainer");

const newListModal = document.getElementById("newListModal");
const closeNewListModalBtn = document.getElementById("closeNewListModalBtn");
const cancelNewListBtn = document.getElementById("cancelNewListBtn");
const createListForm = document.getElementById("createListForm");
const newListNameInput = document.getElementById("newListNameInput");
const newListDescInput = document.getElementById("newListDescInput");

const configModal = document.getElementById("configModal");
const closeConfigModalBtn = document.getElementById("closeConfigModalBtn");
const saveConfigForm = document.getElementById("saveConfigForm");
const resetConfigBtn = document.getElementById("resetConfigBtn");
const cfgApiKey = document.getElementById("cfgApiKey");
const cfgAuthDomain = document.getElementById("cfgAuthDomain");
const cfgProjectId = document.getElementById("cfgProjectId");
const cfgStorageBucket = document.getElementById("cfgStorageBucket");
const cfgSenderId = document.getElementById("cfgSenderId");
const cfgAppId = document.getElementById("cfgAppId");

// ==========================================
// 工具函式
// ==========================================
function showToast(message) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getAvatarSvgDataUrl(name) {
  const initial = (name || "U").trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" rx="32" fill="#6366f1"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="28" font-weight="bold">${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ==========================================
// 初始化 Firebase 或協作預覽模式
// ==========================================
function initFirebaseService() {
  const config = getActiveFirebaseConfig();
  populateConfigModal(config);

  if (!isFirebaseConfigured(config)) {
    configWarningBanner.classList.remove("hidden");
    setConnectionStatus("demo", "尚未設定 API Key（可使用協作預覽）");
    return false;
  }

  try {
    configWarningBanner.classList.add("hidden");
    appInstance = initializeApp(config);
    auth = getAuth(appInstance);
    db = getFirestore(appInstance);
    setConnectionStatus("online", "已連線 Firebase (my-to-do-list-50788)");

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        isDemoMode = false;
        currentUser = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split("@")[0] || "協作夥伴",
          email: user.email || "",
          photoURL: user.photoURL || getAvatarSvgDataUrl(user.displayName || "U")
        };
        await syncUserProfileToFirestore(currentUser);
        enterWorkspace();
      } else if (!isDemoMode) {
        leaveWorkspace();
      }
    });
    return true;
  } catch (err) {
    console.error("Firebase 初始化錯誤:", err);
    showToast("Firebase 初始化失敗，請檢查設定值");
    setConnectionStatus("demo", "設定異常");
    return false;
  }
}

function setConnectionStatus(mode, text) {
  connectionBadge.className = "status-badge";
  if (mode === "online") {
    connectionBadge.classList.add("status-online");
  } else if (mode === "demo") {
    connectionBadge.classList.add("status-demo");
  } else {
    connectionBadge.classList.add("status-connecting");
  }
  connectionBadge.textContent = text;
}

async function syncUserProfileToFirestore(user) {
  if (!db || isDemoMode) return;
  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("同步使用者資料略過:", err);
  }
}

// ==========================================
// 登入與登出流程
// ==========================================
googleSignInBtn.addEventListener("click", async () => {
  if (!auth) {
    showToast("請先在「Firebase 設定」填入 my-to-do-list-50788 的 API Key，或點擊下方訪客協作模式");
    configModal.classList.remove("hidden");
    return;
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
    showToast("🎉 Google 帳號登入成功！");
  } catch (err) {
    console.error("Google 登入失敗:", err);
    const host = window.location.hostname || "graceliu0508.github.io";
    if (err.code === "auth/unauthorized-domain") {
      showToast(`⚠️ 網域尚未授權：請至 Firebase Console > Authentication > Settings > Authorized domains 新增「${host}」`);
    } else if (err.code === "auth/operation-not-allowed") {
      showToast("⚠️ 尚未啟用 Google 登入：請至 Firebase Console > Authentication > Sign-in method 啟用 Google 提供者");
    } else if (err.code === "auth/popup-closed-by-user") {
      showToast("已取消 Google 登入視窗");
    } else {
      showToast(`Google 登入失敗 (${err.code || "error"})：${err.message}`);
    }
  }
});

demoModeBtn.addEventListener("click", () => {
  isDemoMode = true;
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  currentUser = {
    uid: `demo-user-${randomSuffix}`,
    displayName: `協作夥伴 #${randomSuffix}`,
    email: `member${randomSuffix}@mytodolist.local`,
    photoURL: getAvatarSvgDataUrl(`M${randomSuffix}`)
  };
  setConnectionStatus("demo", "本機多視窗即時協作預覽模式");
  enterWorkspace();
  showToast("🚀 已進入訪客協作預覽模式（可開多個分頁測試即時同步！）");
});

signOutBtn.addEventListener("click", async () => {
  if (isDemoMode) {
    isDemoMode = false;
    currentUser = null;
    leaveWorkspace();
    showToast("已離開協作預覽模式");
    return;
  }
  if (auth) {
    await signOut(auth);
    showToast("已安全登出");
  }
});

// ==========================================
// 進入與離開主工作區
// ==========================================
function enterWorkspace() {
  authScreen.classList.add("hidden");
  appWorkspace.classList.remove("hidden");
  userProfileArea.classList.remove("hidden");

  userAvatar.src = currentUser.photoURL || getAvatarSvgDataUrl(currentUser.displayName);
  userName.textContent = currentUser.displayName;
  userEmail.textContent = currentUser.email;

  subscribeToTodoLists();
  checkUrlInviteCode();
}

function leaveWorkspace() {
  if (unsubLists) unsubLists();
  if (unsubTasks) unsubTasks();
  unsubLists = null;
  unsubTasks = null;

  todoLists = [];
  tasks = [];
  activeListId = null;

  authScreen.classList.remove("hidden");
  appWorkspace.classList.add("hidden");
  userProfileArea.classList.add("hidden");
}

function checkUrlInviteCode() {
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get("join");
  if (joinCode) {
    inviteCodeInput.value = joinCode.toUpperCase();
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => {
      joinListByInviteCode(joinCode.toUpperCase());
    }, 600);
  }
}

// ==========================================
// 清單空間訂閱與管理 (Firestore + Demo 雙支援)
// ==========================================
function subscribeToTodoLists() {
  if (unsubLists) unsubLists();

  if (isDemoMode) {
    loadDemoLists();
    return;
  }

  const q = query(
    collection(db, "todoLists"),
    where("memberIds", "array-contains", currentUser.uid)
  );

  unsubLists = onSnapshot(
    q,
    async (snapshot) => {
      const lists = [];
      snapshot.forEach((docSnap) => {
        lists.push({ id: docSnap.id, ...docSnap.data() });
      });

      // 若該使用者還沒有任何清單，自動建立一個預設協作清單
      if (lists.length === 0) {
        await createNewTodoList("我的第一個協作清單", "與團隊夥伴一起管理每日待辦事項");
        return;
      }

      todoLists = lists;
      if (!activeListId || !todoLists.some((l) => l.id === activeListId)) {
        activeListId = todoLists[0].id;
      }
      renderSidebarLists();
      renderActiveListHeader();
      subscribeToTasks(activeListId);
    },
    (err) => {
      console.error("讀取協作清單失敗:", err);
      showToast(`讀取清單失敗：${err.message}`);
    }
  );
}

async function createNewTodoList(name, description = "") {
  const inviteCode = generateInviteCode();
  const memberInfo = {
    uid: currentUser.uid,
    displayName: currentUser.displayName,
    email: currentUser.email,
    photoURL: currentUser.photoURL
  };

  if (isDemoMode) {
    const newList = {
      id: `list-${Date.now()}`,
      name,
      description,
      ownerId: currentUser.uid,
      ownerName: currentUser.displayName,
      memberIds: [currentUser.uid],
      members: [memberInfo],
      inviteCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    todoLists.push(newList);
    saveDemoState();
    activeListId = newList.id;
    renderSidebarLists();
    renderActiveListHeader();
    subscribeToTasks(activeListId);
    showToast(`✨ 已建立清單「${name}」（邀請碼：${inviteCode}）`);
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "todoLists"), {
      name,
      description,
      ownerId: currentUser.uid,
      ownerName: currentUser.displayName,
      memberIds: [currentUser.uid],
      members: [memberInfo],
      inviteCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    activeListId = docRef.id;
    showToast(`✨ 已建立協作清單「${name}」`);
  } catch (err) {
    console.error("建立清單失敗:", err);
    showToast(`建立清單失敗：${err.message}`);
  }
}

async function joinListByInviteCode(rawCode) {
  const code = rawCode.trim().toUpperCase();
  if (!code) return;

  const memberInfo = {
    uid: currentUser.uid,
    displayName: currentUser.displayName,
    email: currentUser.email,
    photoURL: currentUser.photoURL
  };

  if (isDemoMode) {
    const target = todoLists.find((l) => l.inviteCode === code);
    if (!target) {
      showToast(`找不到邀請碼為 ${code} 的協作清單`);
      return;
    }
    if (!target.memberIds.includes(currentUser.uid)) {
      target.memberIds.push(currentUser.uid);
      target.members = target.members || [];
      target.members.push(memberInfo);
      saveDemoState();
    }
    activeListId = target.id;
    renderSidebarLists();
    renderActiveListHeader();
    subscribeToTasks(activeListId);
    inviteCodeInput.value = "";
    showToast(`🤝 已加入「${target.name}」！`);
    return;
  }

  try {
    const q = query(collection(db, "todoLists"), where("inviteCode", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) {
      showToast(`找不到邀請碼為「${code}」的清單，請確認邀請碼是否正確`);
      return;
    }

    const listDoc = snap.docs[0];
    const listData = listDoc.data();

    if (listData.memberIds && listData.memberIds.includes(currentUser.uid)) {
      activeListId = listDoc.id;
      renderSidebarLists();
      renderActiveListHeader();
      subscribeToTasks(activeListId);
      inviteCodeInput.value = "";
      showToast(`您已經是「${listData.name}」的協作成員囉！`);
      return;
    }

    await updateDoc(doc(db, "todoLists", listDoc.id), {
      memberIds: arrayUnion(currentUser.uid),
      members: arrayUnion(memberInfo),
      updatedAt: serverTimestamp()
    });

    activeListId = listDoc.id;
    inviteCodeInput.value = "";
    showToast(`🎉 成功加入協作清單「${listData.name}」！`);
  } catch (err) {
    console.error("加入清單失敗:", err);
    showToast(`加入清單失敗：${err.message}`);
  }
}

// ==========================================
// 任務訂閱與 CRUD 操作
// ==========================================
function subscribeToTasks(listId) {
  if (unsubTasks) unsubTasks();
  if (!listId) return;

  if (isDemoMode) {
    loadDemoTasks(listId);
    return;
  }

  const tasksRef = collection(db, "todoLists", listId, "tasks");
  unsubTasks = onSnapshot(
    tasksRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      // 依完成狀態與優先級排序
      items.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const pWeight = { high: 3, medium: 2, low: 1 };
        return (pWeight[b.priority] || 2) - (pWeight[a.priority] || 2);
      });
      tasks = items;
      renderTasksAndStats();
    },
    (err) => {
      console.error("讀取待辦任務失敗:", err);
    }
  );
}

addTaskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeListId) return;

  const title = taskTitleInput.value.trim();
  if (!title) return;

  const priority = taskPriorityInput.value;
  const category = taskCategoryInput.value;
  const dueDate = taskDueDateInput.value || "";
  const assigneeSelect = taskAssigneeInput;
  const assigneeUid = assigneeSelect.value || "";
  const assigneeName = assigneeUid
    ? assigneeSelect.options[assigneeSelect.selectedIndex].dataset.name || ""
    : "";

  taskTitleInput.value = "";

  if (isDemoMode) {
    const newTask = {
      id: `task-${Date.now()}`,
      title,
      completed: false,
      priority,
      category,
      dueDate,
      assigneeUid,
      assigneeName,
      createdByUid: currentUser.uid,
      createdByName: currentUser.displayName,
      updatedByName: currentUser.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tasks.unshift(newTask);
    saveDemoTasks(activeListId, tasks);
    renderTasksAndStats();
    showToast("✅ 已新增任務並同步給協作成員");
    return;
  }

  try {
    await addDoc(collection(db, "todoLists", activeListId, "tasks"), {
      title,
      completed: false,
      priority,
      category,
      dueDate,
      assigneeUid,
      assigneeName,
      createdByUid: currentUser.uid,
      createdByName: currentUser.displayName,
      updatedByName: currentUser.displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error("新增任務失敗:", err);
    showToast(`新增任務失敗：${err.message}`);
  }
});

async function toggleTaskCompleted(task) {
  if (!activeListId) return;
  const nextCompleted = !task.completed;

  if (isDemoMode) {
    task.completed = nextCompleted;
    task.updatedByName = currentUser.displayName;
    saveDemoTasks(activeListId, tasks);
    renderTasksAndStats();
    return;
  }

  try {
    await updateDoc(doc(db, "todoLists", activeListId, "tasks", task.id), {
      completed: nextCompleted,
      title: task.title,
      updatedByName: currentUser.displayName,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error("更新任務狀態失敗:", err);
    showToast(`更新失敗：${err.message}`);
  }
}

async function editTaskTitle(task) {
  const nextTitle = window.prompt("編輯待辦事項內容：", task.title);
  if (!nextTitle || nextTitle.trim() === "" || nextTitle.trim() === task.title) return;

  if (isDemoMode) {
    task.title = nextTitle.trim();
    task.updatedByName = currentUser.displayName;
    saveDemoTasks(activeListId, tasks);
    renderTasksAndStats();
    showToast("✏️ 已更新任務內容");
    return;
  }

  try {
    await updateDoc(doc(db, "todoLists", activeListId, "tasks", task.id), {
      title: nextTitle.trim(),
      completed: Boolean(task.completed),
      updatedByName: currentUser.displayName,
      updatedAt: serverTimestamp()
    });
    showToast("✏️ 已同步更新任務內容");
  } catch (err) {
    console.error("編輯任務失敗:", err);
    showToast(`編輯失敗：${err.message}`);
  }
}

async function removeTask(taskId) {
  if (!activeListId) return;

  if (isDemoMode) {
    tasks = tasks.filter((t) => t.id !== taskId);
    saveDemoTasks(activeListId, tasks);
    renderTasksAndStats();
    showToast("🗑️ 已刪除任務");
    return;
  }

  try {
    await deleteDoc(doc(db, "todoLists", activeListId, "tasks", taskId));
    showToast("🗑️ 已刪除任務");
  } catch (err) {
    console.error("刪除任務失敗:", err);
    showToast(`刪除失敗：${err.message}`);
  }
}

// ==========================================
// 畫面渲染邏輯
// ==========================================
function renderSidebarLists() {
  todoListsContainer.innerHTML = "";
  todoLists.forEach((list) => {
    const li = document.createElement("li");
    li.className = `list-nav-item ${list.id === activeListId ? "active" : ""}`;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = `📋 ${list.name}`;

    const countSpan = document.createElement("span");
    countSpan.className = "list-nav-meta";
    const memberCount = Array.isArray(list.memberIds) ? list.memberIds.length : 1;
    countSpan.textContent = `${memberCount} 人協作`;

    li.appendChild(nameSpan);
    li.appendChild(countSpan);

    li.addEventListener("click", () => {
      if (activeListId === list.id) return;
      activeListId = list.id;
      renderSidebarLists();
      renderActiveListHeader();
      subscribeToTasks(activeListId);
    });

    todoListsContainer.appendChild(li);
  });
}

function renderActiveListHeader() {
  const activeList = todoLists.find((l) => l.id === activeListId);
  if (!activeList) return;

  currentListName.textContent = activeList.name;
  currentListDesc.textContent = activeList.description || "所有協作成員皆可即時新增、指派與勾選完成任務";
  currentInviteCode.textContent = activeList.inviteCode || "------";

  const isOwner = activeList.ownerId === currentUser?.uid;
  currentListRoleBadge.textContent = isOwner ? "👑 建立者" : "🤝 協作成員";

  if (isOwner && todoLists.length > 1) {
    deleteListBtn.classList.remove("hidden");
  } else {
    deleteListBtn.classList.add("hidden");
  }

  // 渲染協作成員名單與指派下拉選單
  memberAvatars.innerHTML = "";
  taskAssigneeInput.innerHTML = `<option value="">🙌 不限 / 任何人</option>`;

  const membersList = Array.isArray(activeList.members) && activeList.members.length > 0
    ? activeList.members
    : [{ uid: activeList.ownerId, displayName: activeList.ownerName || "建立者" }];

  membersList.forEach((m) => {
    const chip = document.createElement("div");
    chip.className = "member-chip";

    const dot = document.createElement("span");
    dot.className = "member-chip-dot";
    dot.textContent = (m.displayName || "U").charAt(0).toUpperCase();

    const label = document.createElement("span");
    label.textContent = m.displayName || m.email || "成員";

    chip.appendChild(dot);
    chip.appendChild(label);
    memberAvatars.appendChild(chip);

    const opt = document.createElement("option");
    opt.value = m.uid;
    opt.dataset.name = m.displayName || "成員";
    opt.textContent = `👤 ${m.displayName || m.email}`;
    taskAssigneeInput.appendChild(opt);
  });
}

function renderTasksAndStats() {
  const total = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = total - completedCount;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  statTotal.textContent = String(total);
  statActive.textContent = String(activeCount);
  statCompleted.textContent = String(completedCount);
  statPercent.textContent = `${percent}%`;
  progressBarFill.style.width = `${percent}%`;

  // 篩選與搜尋
  const filtered = tasks.filter((t) => {
    if (activeFilter === "active" && t.completed) return false;
    if (activeFilter === "completed" && !t.completed) return false;
    if (activeFilter === "mine" && t.assigneeUid !== currentUser?.uid) return false;
    if (activeFilter === "high" && t.priority !== "high") return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (t.title || "").toLowerCase().includes(q);
      const matchCat = (t.category || "").toLowerCase().includes(q);
      const matchAssignee = (t.assigneeName || "").toLowerCase().includes(q);
      return matchTitle || matchCat || matchAssignee;
    }
    return true;
  });

  tasksContainer.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <p>✨ 目前沒有符合條件的待辦事項</p>
      <small>在上方輸入框新增任務，並將邀請碼分享給團隊成員一起協作吧！</small>
    `;
    tasksContainer.appendChild(empty);
    return;
  }

  filtered.forEach((task) => {
    const item = document.createElement("div");
    item.className = `task-item ${task.completed ? "completed" : ""}`;

    const left = document.createElement("div");
    left.className = "task-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = Boolean(task.completed);
    checkbox.addEventListener("change", () => toggleTaskCompleted(task));

    const content = document.createElement("div");
    content.className = "task-content";

    const titleEl = document.createElement("div");
    titleEl.className = "task-title";
    titleEl.textContent = task.title;

    const badges = document.createElement("div");
    badges.className = "task-badges";

    // 優先級標籤
    const priorityMap = {
      high: { label: "🔴 高優先", cls: "badge-high" },
      medium: { label: "🟡 一般", cls: "badge-medium" },
      low: { label: "🟢 低優先", cls: "badge-low" }
    };
    const pInfo = priorityMap[task.priority] || priorityMap.medium;
    const pBadge = document.createElement("span");
    pBadge.className = `badge ${pInfo.cls}`;
    pBadge.textContent = pInfo.label;
    badges.appendChild(pBadge);

    if (task.category) {
      const catBadge = document.createElement("span");
      catBadge.className = "badge badge-category";
      catBadge.textContent = `#${task.category}`;
      badges.appendChild(catBadge);
    }

    if (task.assigneeName) {
      const assignBadge = document.createElement("span");
      assignBadge.className = "badge badge-assignee";
      assignBadge.textContent = `👤 指派：${task.assigneeName}`;
      badges.appendChild(assignBadge);
    }

    if (task.dueDate) {
      const dueBadge = document.createElement("span");
      dueBadge.className = "badge badge-due";
      dueBadge.textContent = `📅 截止：${task.dueDate}`;
      badges.appendChild(dueBadge);
    }

    const audit = document.createElement("div");
    audit.className = "task-audit";
    audit.textContent = `由 ${task.createdByName || "成員"} 建立 · 最後更新：${task.updatedByName || task.createdByName || "成員"}`;

    content.appendChild(titleEl);
    content.appendChild(badges);
    content.appendChild(audit);

    left.appendChild(checkbox);
    left.appendChild(content);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-ghost btn-xs";
    editBtn.textContent = "編輯";
    editBtn.addEventListener("click", () => editTaskTitle(task));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-danger-ghost btn-xs";
    delBtn.textContent = "刪除";
    delBtn.addEventListener("click", () => removeTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    item.appendChild(left);
    item.appendChild(actions);
    tasksContainer.appendChild(item);
  });
}

// ==========================================
// 互動事件綁定 (篩選、搜尋、邀請分享、Modal)
// ==========================================
filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filterTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    renderTasksAndStats();
  });
});

searchTaskInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderTasksAndStats();
});

joinListForm.addEventListener("submit", (e) => {
  e.preventDefault();
  joinListByInviteCode(inviteCodeInput.value);
});

copyInviteBtn.addEventListener("click", async () => {
  const activeList = todoLists.find((l) => l.id === activeListId);
  if (!activeList) return;
  const shareUrl = `${window.location.origin}${window.location.pathname}?join=${activeList.inviteCode}`;
  const shareText = `邀請您加入 MyToDoList 協作清單「${activeList.name}」！\n邀請碼：${activeList.inviteCode}\n直接點擊連結加入：${shareUrl}`;
  try {
    await navigator.clipboard.writeText(shareText);
    showToast(`📋 已複製邀請碼 (${activeList.inviteCode}) 與分享連結！`);
  } catch {
    showToast(`邀請碼為：${activeList.inviteCode}`);
  }
});

deleteListBtn.addEventListener("click", async () => {
  const activeList = todoLists.find((l) => l.id === activeListId);
  if (!activeList) return;
  if (!window.confirm(`確定要刪除「${activeList.name}」協作清單嗎？`)) return;

  if (isDemoMode) {
    todoLists = todoLists.filter((l) => l.id !== activeListId);
    saveDemoState();
    activeListId = todoLists[0]?.id || null;
    renderSidebarLists();
    renderActiveListHeader();
    subscribeToTasks(activeListId);
    showToast("🗑️ 已刪除協作清單");
    return;
  }

  try {
    await deleteDoc(doc(db, "todoLists", activeListId));
    showToast("🗑️ 已刪除協作清單");
  } catch (err) {
    showToast(`刪除清單失敗：${err.message}`);
  }
});

// 新增清單 Modal
newListModalBtn.addEventListener("click", () => {
  newListModal.classList.remove("hidden");
  newListNameInput.focus();
});

closeNewListModalBtn.addEventListener("click", () => newListModal.classList.add("hidden"));
cancelNewListBtn.addEventListener("click", () => newListModal.classList.add("hidden"));

createListForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = newListNameInput.value.trim();
  const desc = newListDescInput.value.trim();
  if (!name) return;
  newListNameInput.value = "";
  newListDescInput.value = "";
  newListModal.classList.add("hidden");
  await createNewTodoList(name, desc);
});

// Firebase 設定 Modal
function populateConfigModal(cfg) {
  cfgApiKey.value = cfg.apiKey?.startsWith("REPLACE_") ? "" : cfg.apiKey || "";
  cfgAuthDomain.value = cfg.authDomain || "my-to-do-list-50788.firebaseapp.com";
  cfgProjectId.value = cfg.projectId || "my-to-do-list-50788";
  cfgStorageBucket.value = cfg.storageBucket || "my-to-do-list-50788.firebasestorage.app";
  cfgSenderId.value = cfg.messagingSenderId?.startsWith("REPLACE_") ? "" : cfg.messagingSenderId || "";
  cfgAppId.value = cfg.appId?.startsWith("REPLACE_") ? "" : cfg.appId || "";
}

openConfigBtn.addEventListener("click", () => {
  populateConfigModal(getActiveFirebaseConfig());
  configModal.classList.remove("hidden");
});

bannerConfigBtn.addEventListener("click", () => {
  populateConfigModal(getActiveFirebaseConfig());
  configModal.classList.remove("hidden");
});

closeConfigModalBtn.addEventListener("click", () => configModal.classList.add("hidden"));

saveConfigForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const newCfg = {
    apiKey: cfgApiKey.value.trim(),
    authDomain: cfgAuthDomain.value.trim(),
    projectId: cfgProjectId.value.trim(),
    storageBucket: cfgStorageBucket.value.trim(),
    messagingSenderId: cfgSenderId.value.trim(),
    appId: cfgAppId.value.trim()
  };
  localStorage.setItem("mytodolist_firebase_config", JSON.stringify(newCfg));
  configModal.classList.add("hidden");
  showToast("✅ 已儲存 Firebase 設定，正在重新連線...");
  setTimeout(() => window.location.reload(), 600);
});

resetConfigBtn.addEventListener("click", () => {
  localStorage.removeItem("mytodolist_firebase_config");
  populateConfigModal(defaultFirebaseConfig);
  showToast("已還原為預設設定檔");
});

// ==========================================
// 本機多視窗即時協作預覽模式 (BroadcastChannel)
// ==========================================
function loadDemoLists() {
  const raw = localStorage.getItem("mytodolist_demo_lists");
  if (raw) {
    todoLists = JSON.parse(raw);
  } else {
    const defaultId = "demo-list-1";
    todoLists = [
      {
        id: defaultId,
        name: "🚀 產品開發多人協作清單",
        description: "支援開啟多個瀏覽器視窗即時同步測試",
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName,
        memberIds: [currentUser.uid, "teammate-1"],
        members: [
          { uid: currentUser.uid, displayName: currentUser.displayName },
          { uid: "teammate-1", displayName: "Alex (設計師)" }
        ],
        inviteCode: "TEAM88"
      }
    ];
    localStorage.setItem("mytodolist_demo_lists", JSON.stringify(todoLists));
    localStorage.setItem(
      `mytodolist_demo_tasks_${defaultId}`,
      JSON.stringify([
        {
          id: "t-1",
          title: "完成 Firebase (my-to-do-list-50788) Google 登入與 Firestore 安全規則",
          completed: true,
          priority: "high",
          category: "專案",
          dueDate: "2026-11-10",
          assigneeUid: currentUser.uid,
          assigneeName: currentUser.displayName,
          createdByName: "Alex (設計師)",
          updatedByName: currentUser.displayName
        },
        {
          id: "t-2",
          title: "邀請團隊成員透過邀請碼加入共享待辦清單",
          completed: false,
          priority: "high",
          category: "工作",
          dueDate: "2026-11-12",
          assigneeUid: "teammate-1",
          assigneeName: "Alex (設計師)",
          createdByName: currentUser.displayName,
          updatedByName: currentUser.displayName
        }
      ])
    );
  }

  activeListId = todoLists[0].id;
  renderSidebarLists();
  renderActiveListHeader();
  loadDemoTasks(activeListId);
}

function saveDemoState() {
  localStorage.setItem("mytodolist_demo_lists", JSON.stringify(todoLists));
  demoChannel?.postMessage({ type: "lists_updated" });
}

function loadDemoTasks(listId) {
  const raw = localStorage.getItem(`mytodolist_demo_tasks_${listId}`);
  tasks = raw ? JSON.parse(raw) : [];
  renderTasksAndStats();
}

function saveDemoTasks(listId, nextTasks) {
  localStorage.setItem(`mytodolist_demo_tasks_${listId}`, JSON.stringify(nextTasks));
  demoChannel?.postMessage({ type: "tasks_updated", listId });
}

demoChannel?.addEventListener("message", (event) => {
  if (!isDemoMode) return;
  if (event.data?.type === "lists_updated") {
    loadDemoLists();
  } else if (event.data?.type === "tasks_updated" && event.data.listId === activeListId) {
    loadDemoTasks(activeListId);
  }
});

// 啟動應用程式
initFirebaseService();
