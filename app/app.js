import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  update,
  query,
  orderByChild,
  limitToLast,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig, hasRequiredFirebaseConfig } from "./firebase-config.js";

const MAX_MESSAGES = 120;
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

const state = {
  shellMode: detectShellMode(),
  authMode: "login",
  firebaseReady: false,
  auth: null,
  db: null,
  currentUser: null,
  chats: [],
  filteredChats: [],
  activeChatId: null,
  activeChat: null,
  messages: [],
  usersMap: new Map(),
  stopChatMessagesListener: null,
  stopChatsListener: null,
  stopCallsListener: null,
  mediaRecorder: null,
  recordingChunks: [],
  peerConnection: null,
  localStream: null,
  remoteStream: new MediaStream(),
  currentCallId: null,
  pendingIncomingCall: null,
  appliedCandidateIds: new Set()
};

const els = {
  setupBanner: document.querySelector("#setupBanner"),
  landingScreen: document.querySelector("#landingScreen"),
  authScreen: document.querySelector("#authScreen"),
  appScreen: document.querySelector("#appScreen"),
  openMessengerBtn: document.querySelector("#openMessengerBtn"),
  heroOpenMessengerBtn: document.querySelector("#heroOpenMessengerBtn"),
  backToSiteBtn: document.querySelector("#backToSiteBtn"),
  backToSiteFromAppBtn: document.querySelector("#backToSiteFromAppBtn"),
  loginTabBtn: document.querySelector("#loginTabBtn"),
  registerTabBtn: document.querySelector("#registerTabBtn"),
  authForm: document.querySelector("#authForm"),
  authSubmitBtn: document.querySelector("#authSubmitBtn"),
  displayNameField: document.querySelector("#displayNameField"),
  displayNameInput: document.querySelector("#displayNameInput"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  authStatus: document.querySelector("#authStatus"),
  userAvatar: document.querySelector("#userAvatar"),
  userNameLabel: document.querySelector("#userNameLabel"),
  userEmailLabel: document.querySelector("#userEmailLabel"),
  logoutBtn: document.querySelector("#logoutBtn"),
  chatSearchInput: document.querySelector("#chatSearchInput"),
  newChatTitleInput: document.querySelector("#newChatTitleInput"),
  createChatBtn: document.querySelector("#createChatBtn"),
  chatsList: document.querySelector("#chatsList"),
  chatAvatar: document.querySelector("#chatAvatar"),
  chatTitle: document.querySelector("#chatTitle"),
  chatMeta: document.querySelector("#chatMeta"),
  refreshBtn: document.querySelector("#refreshBtn"),
  startCallBtn: document.querySelector("#startCallBtn"),
  endCallBtn: document.querySelector("#endCallBtn"),
  callBanner: document.querySelector("#callBanner"),
  callBannerText: document.querySelector("#callBannerText"),
  acceptCallBtn: document.querySelector("#acceptCallBtn"),
  rejectCallBtn: document.querySelector("#rejectCallBtn"),
  messagesPanel: document.querySelector("#messagesPanel"),
  messagesList: document.querySelector("#messagesList"),
  messageInput: document.querySelector("#messageInput"),
  sendMessageBtn: document.querySelector("#sendMessageBtn"),
  recordVoiceBtn: document.querySelector("#recordVoiceBtn"),
  recordingStatus: document.querySelector("#recordingStatus"),
  remoteAudio: document.querySelector("#remoteAudio")
};

els.remoteAudio.srcObject = state.remoteStream;

bindEvents();
bootstrap();

function bindEvents() {
  els.openMessengerBtn.addEventListener("click", openMessengerEntry);
  els.heroOpenMessengerBtn.addEventListener("click", openMessengerEntry);
  els.backToSiteBtn.addEventListener("click", showLandingScreen);
  els.backToSiteFromAppBtn.addEventListener("click", showLandingScreen);
  els.loginTabBtn.addEventListener("click", () => setAuthMode("login"));
  els.registerTabBtn.addEventListener("click", () => setAuthMode("register"));
  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.logoutBtn.addEventListener("click", handleLogout);
  els.chatSearchInput.addEventListener("input", renderFilteredChats);
  els.createChatBtn.addEventListener("click", handleCreateChat);
  els.sendMessageBtn.addEventListener("click", handleSendMessage);
  els.recordVoiceBtn.addEventListener("click", handleRecordVoice);
  els.refreshBtn.addEventListener("click", () => {
    if (state.currentUser) {
      loadChats();
      refreshIncomingCalls();
    }
  });
  els.startCallBtn.addEventListener("click", startOutgoingCall);
  els.endCallBtn.addEventListener("click", endCurrentCall);
  els.acceptCallBtn.addEventListener("click", acceptIncomingCall);
  els.rejectCallBtn.addEventListener("click", rejectIncomingCall);

  els.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  });
}

async function bootstrap() {
  setAuthMode("login");
  applyShellMode();

  if (!hasRequiredFirebaseConfig()) {
    showSetupBanner([
      "Нужно заполнить Firebase Web Config в app/firebase-config.js.",
      "Откройте Firebase Console -> Project settings -> Your apps -> Web app.",
      "Вставьте apiKey, authDomain, projectId, appId и остальные поля."
    ].join(" "));
    els.authStatus.textContent = "Сначала заполните app/firebase-config.js.";
    return;
  }

  const app = initializeApp(firebaseConfig);
  state.auth = getAuth(app);
  state.db = getDatabase(app);
  state.firebaseReady = true;

  onAuthStateChanged(state.auth, async (user) => {
    state.currentUser = user;
    if (user) {
      hideSetupBanner();
      await ensureUserProfile(user);
      await ensureGlobalChat();
      showAppScreen(user);
      startChatsListener();
      startCallsListener();
    } else {
      teardownRealtimeListeners();
      teardownCall();
      if (hasRequiredFirebaseConfig()) {
        showAuthScreen();
      }
    }
  });
}

function openMessengerEntry() {
  if (state.currentUser) {
    showAppScreen(state.currentUser);
  } else {
    showAuthScreen();
  }
}

function showLandingScreen() {
  if (state.shellMode !== "web") {
    showAuthScreen();
    return;
  }
  els.landingScreen.classList.remove("hidden");
  els.authScreen.classList.add("hidden");
  els.appScreen.classList.add("hidden");
}

function showAuthScreen() {
  els.landingScreen.classList.add("hidden");
  els.authScreen.classList.remove("hidden");
  els.appScreen.classList.add("hidden");
}

function showAppScreen(user) {
  els.landingScreen.classList.add("hidden");
  els.authScreen.classList.add("hidden");
  els.appScreen.classList.remove("hidden");
  els.userAvatar.textContent = initials(displayNameOf(user));
  els.userNameLabel.textContent = displayNameOf(user);
  els.userEmailLabel.textContent = user.email || "";
}

function applyShellMode() {
  document.body.dataset.shellMode = state.shellMode;

  if (state.shellMode === "web") {
    showLandingScreen();
    return;
  }

  els.landingScreen.classList.add("hidden");
  els.authScreen.classList.remove("hidden");
  els.appScreen.classList.add("hidden");
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isRegister = mode === "register";
  els.displayNameField.classList.toggle("hidden", !isRegister);
  els.loginTabBtn.classList.toggle("active", !isRegister);
  els.registerTabBtn.classList.toggle("active", isRegister);
  els.authSubmitBtn.textContent = isRegister ? "Создать аккаунт" : "Войти";
  els.authStatus.textContent = isRegister
    ? "Создайте аккаунт с email и паролем."
    : "Введите email и пароль.";
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!state.firebaseReady) {
    els.authStatus.textContent = "Firebase еще не настроен.";
    return;
  }

  const email = els.emailInput.value.trim();
  const password = els.passwordInput.value.trim();
  const displayName = els.displayNameInput.value.trim();

  if (!email || !password) {
    els.authStatus.textContent = "Email и пароль обязательны.";
    return;
  }

  try {
    if (state.authMode === "register") {
      if (!displayName) {
        els.authStatus.textContent = "Укажите имя для регистрации.";
        return;
      }
      const credentials = await createUserWithEmailAndPassword(state.auth, email, password);
      await updateProfile(credentials.user, { displayName });
      await ensureUserProfile(credentials.user, displayName);
      els.authStatus.textContent = "Аккаунт создан.";
    } else {
      await signInWithEmailAndPassword(state.auth, email, password);
      els.authStatus.textContent = "Вход выполнен.";
    }
  } catch (error) {
    els.authStatus.textContent = mapFirebaseError(error);
  }
}

async function handleLogout() {
  if (!state.currentUser) {
    return;
  }

  await update(ref(state.db, `users/${state.currentUser.uid}`), {
    lastSeenAt: Date.now(),
    status: "offline"
  });
  await signOut(state.auth);
}

async function handleCreateChat() {
  if (!state.currentUser) {
    return;
  }

  const title = els.newChatTitleInput.value.trim();
  if (!title) {
    return;
  }

  const newChatRef = push(ref(state.db, "chats"));
  const payload = {
    title,
    type: "group",
    createdAt: Date.now(),
    createdBy: state.currentUser.uid,
    memberIds: {
      [state.currentUser.uid]: true
    },
    lastMessageText: "Чат создан",
    lastMessageAt: Date.now(),
    lastMessageSenderName: displayNameOf(state.currentUser)
  };

  await set(newChatRef, payload);
  els.newChatTitleInput.value = "";
  await selectChat(newChatRef.key);
}

async function handleSendMessage() {
  if (!state.currentUser || !state.activeChatId) {
    return;
  }

  const text = els.messageInput.value.trim();
  if (!text) {
    return;
  }

  await sendMessage({ type: "text", text });
  els.messageInput.value = "";
}

async function handleRecordVoice() {
  if (!state.currentUser || !state.activeChatId) {
    return;
  }

  if (state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.recordingChunks = [];
    state.mediaRecorder = new MediaRecorder(stream, { mimeType: pickSupportedMimeType() });
    state.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        state.recordingChunks.push(event.data);
      }
    };
    state.mediaRecorder.onstop = async () => {
      const blob = new Blob(state.recordingChunks, { type: state.mediaRecorder.mimeType || "audio/webm" });
      const audioBase64 = await blobToBase64(blob);
      await sendMessage({
        type: "voice",
        text: "Голосовое сообщение",
        audioBase64,
        audioMimeType: blob.type || "audio/webm"
      });
      stream.getTracks().forEach((track) => track.stop());
      els.recordVoiceBtn.textContent = "Голосовое";
      els.recordingStatus.textContent = "Голосовое сообщение отправлено.";
    };

    state.mediaRecorder.start();
    els.recordVoiceBtn.textContent = "Стоп";
    els.recordingStatus.textContent = "Идет запись...";
  } catch (error) {
    els.recordingStatus.textContent = `Не удалось включить микрофон: ${error.message}`;
  }
}

async function sendMessage(payload) {
  const senderName = displayNameOf(state.currentUser);
  const messageRef = push(ref(state.db, `messages/${state.activeChatId}`));
  const createdAt = Date.now();

  await set(messageRef, {
    ...payload,
    chatId: state.activeChatId,
    senderId: state.currentUser.uid,
    senderName,
    createdAt
  });

  await update(ref(state.db, `chats/${state.activeChatId}`), {
    lastMessageText: payload.type === "voice" ? "Голосовое сообщение" : payload.text,
    lastMessageAt: createdAt,
    lastMessageSenderName: senderName,
    [`memberIds/${state.currentUser.uid}`]: true
  });
}

async function ensureUserProfile(user, forcedName = "") {
  const displayName = forcedName || user.displayName || user.email?.split("@")[0] || "User";
  await update(ref(state.db, `users/${user.uid}`), {
    uid: user.uid,
    displayName,
    email: user.email || "",
    photoURL: user.photoURL || "",
    lastSeenAt: Date.now(),
    status: "online"
  });
}

async function ensureGlobalChat() {
  const snapshot = await get(ref(state.db, "chats"));
  const chats = snapshot.exists() ? Object.entries(snapshot.val()) : [];
  const globalEntry = chats.find(([, value]) => value?.systemKey === "global");
  if (globalEntry) {
    if (state.currentUser) {
      await update(ref(state.db, `chats/${globalEntry[0]}/memberIds`), {
        [state.currentUser.uid]: true
      });
    }
    return globalEntry[0];
  }

  const chatRef = push(ref(state.db, "chats"));
  await set(chatRef, {
    title: "Общий чат",
    description: "Главный канал проекта",
    type: "group",
    systemKey: "global",
    createdAt: Date.now(),
    createdBy: state.currentUser?.uid || "system",
    memberIds: state.currentUser ? { [state.currentUser.uid]: true } : {},
    lastMessageText: "Добро пожаловать в MaxyMessenger",
    lastMessageAt: Date.now(),
    lastMessageSenderName: "System"
  });

  return chatRef.key;
}

function startChatsListener() {
  teardownChatListeners();

  const chatsRef = query(ref(state.db, "chats"), orderByChild("lastMessageAt"));
  state.stopChatsListener = onValue(chatsRef, async (snapshot) => {
    const items = snapshot.exists() ? mapCollection(snapshot.val()) : [];
    state.chats = items
      .filter((chat) => chat.type === "group")
      .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    renderFilteredChats();

    if (!state.activeChatId && state.chats[0]) {
      await selectChat(state.chats[0].id);
    } else if (state.activeChatId) {
      state.activeChat = state.chats.find((chat) => chat.id === state.activeChatId) || null;
      renderActiveChatHeader();
      updateCallButtons();
    }
  });
}

function startCallsListener() {
  if (state.stopCallsListener) {
    state.stopCallsListener();
    state.stopCallsListener = null;
  }

  const callsRef = ref(state.db, "calls");
  state.stopCallsListener = onValue(callsRef, async (snapshot) => {
    const calls = snapshot.exists() ? mapCollection(snapshot.val()) : [];
    await processCalls(calls);
  });
}

async function processCalls(calls) {
  if (!state.currentUser) {
    return;
  }

  const relevantCalls = calls.filter((call) => call.chatId === state.activeChatId || call.toUserId === state.currentUser.uid || call.fromUserId === state.currentUser.uid);
  const incoming = relevantCalls.find((call) => call.toUserId === state.currentUser.uid && call.status === "ringing");

  if (incoming && !state.currentCallId) {
    state.pendingIncomingCall = incoming;
    els.callBannerText.textContent = `Входящий звонок от ${incoming.fromUserName || "пользователя"}`;
    els.callBanner.classList.remove("hidden");
  } else if (!incoming && !state.currentCallId) {
    hideCallBanner();
    state.pendingIncomingCall = null;
  }

  const active = relevantCalls.find((call) => call.id === state.currentCallId);

  if (active?.answer && state.peerConnection && !state.peerConnection.currentRemoteDescription) {
    await state.peerConnection.setRemoteDescription(active.answer);
  }

  if (active?.status === "ended" || active?.status === "rejected") {
    teardownCall();
  }

  if (active?.status === "connected") {
    els.endCallBtn.classList.remove("hidden");
    els.startCallBtn.classList.add("hidden");
  }

  if (state.peerConnection && active?.candidates) {
    const role = active.fromUserId === state.currentUser.uid ? "callee" : "caller";
    const candidates = mapCollection(active.candidates[role] || {});
    for (const candidate of candidates) {
      if (!state.appliedCandidateIds.has(candidate.id)) {
        state.appliedCandidateIds.add(candidate.id);
        try {
          await state.peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.warn("ICE candidate skipped", error);
        }
      }
    }
  }
}

async function refreshIncomingCalls() {
  const snapshot = await get(ref(state.db, "calls"));
  const calls = snapshot.exists() ? mapCollection(snapshot.val()) : [];
  await processCalls(calls);
}

async function loadChats() {
  const snapshot = await get(ref(state.db, "chats"));
  const items = snapshot.exists() ? mapCollection(snapshot.val()) : [];
  state.chats = items.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
  renderFilteredChats();
}

async function selectChat(chatId) {
  state.activeChatId = chatId;
  state.activeChat = state.chats.find((chat) => chat.id === chatId) || null;
  renderFilteredChats();
  renderActiveChatHeader();
  updateCallButtons();
  subscribeToMessages(chatId);
}

function subscribeToMessages(chatId) {
  if (state.stopChatMessagesListener) {
    state.stopChatMessagesListener();
    state.stopChatMessagesListener = null;
  }

  const messagesRef = query(ref(state.db, `messages/${chatId}`), orderByChild("createdAt"), limitToLast(MAX_MESSAGES));
  state.stopChatMessagesListener = onValue(messagesRef, async (snapshot) => {
    state.messages = snapshot.exists()
      ? mapCollection(snapshot.val()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      : [];
    await hydrateUsers(state.messages.map((item) => item.senderId));
    renderMessages();
  });
}

async function hydrateUsers(userIds) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))].filter((uid) => !state.usersMap.has(uid));
  await Promise.all(uniqueIds.map(async (uid) => {
    const snapshot = await get(ref(state.db, `users/${uid}`));
    if (snapshot.exists()) {
      state.usersMap.set(uid, snapshot.val());
    }
  }));
}

async function startOutgoingCall() {
  if (!state.currentUser || !state.activeChat) {
    return;
  }

  const memberIds = Object.keys(state.activeChat.memberIds || {}).filter((uid) => uid !== state.currentUser.uid);
  if (!memberIds.length) {
    alert("Для звонка нужен хотя бы один другой участник в чате.");
    return;
  }

  const targetUserId = memberIds[0];
  const targetUser = state.usersMap.get(targetUserId) || { displayName: "Пользователь" };
  const callId = push(ref(state.db, "calls")).key;
  state.currentCallId = callId;
  await setupPeerConnection(callId, targetUserId, true);

  await set(ref(state.db, `calls/${callId}`), {
    chatId: state.activeChatId,
    fromUserId: state.currentUser.uid,
    fromUserName: displayNameOf(state.currentUser),
    toUserId: targetUserId,
    toUserName: targetUser.displayName,
    status: "ringing",
    createdAt: Date.now(),
    offer: state.peerConnection.localDescription.toJSON()
  });

  els.startCallBtn.classList.add("hidden");
  els.endCallBtn.classList.remove("hidden");
}

async function acceptIncomingCall() {
  if (!state.pendingIncomingCall) {
    return;
  }

  const call = state.pendingIncomingCall;
  state.pendingIncomingCall = null;
  hideCallBanner();
  state.currentCallId = call.id;
  await setupPeerConnection(call.id, call.fromUserId, false, call.offer);

  await update(ref(state.db, `calls/${call.id}`), {
    answer: state.peerConnection.localDescription.toJSON(),
    status: "connected",
    acceptedAt: Date.now()
  });

  els.startCallBtn.classList.add("hidden");
  els.endCallBtn.classList.remove("hidden");
}

async function rejectIncomingCall() {
  if (!state.pendingIncomingCall) {
    return;
  }

  await update(ref(state.db, `calls/${state.pendingIncomingCall.id}`), {
    status: "rejected",
    rejectedAt: Date.now()
  });
  state.pendingIncomingCall = null;
  hideCallBanner();
}

async function endCurrentCall() {
  if (!state.currentCallId) {
    return;
  }

  await update(ref(state.db, `calls/${state.currentCallId}`), {
    status: "ended",
    endedAt: Date.now()
  });
  teardownCall();
}

async function setupPeerConnection(callId, remoteUserId, isCaller, remoteOffer = null) {
  teardownCall(false);

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.localStream = stream;
  state.peerConnection = new RTCPeerConnection(rtcConfig);
  stream.getTracks().forEach((track) => state.peerConnection.addTrack(track, stream));

  state.peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => state.remoteStream.addTrack(track));
  };

  state.peerConnection.onicecandidate = async (event) => {
    if (!event.candidate || !state.currentCallId) {
      return;
    }
    const role = isCaller ? "caller" : "callee";
    await pushCandidate(state.currentCallId, role, event.candidate.toJSON());
  };

  if (isCaller) {
    const offer = await state.peerConnection.createOffer();
    await state.peerConnection.setLocalDescription(offer);
  } else if (remoteOffer) {
    await state.peerConnection.setRemoteDescription(remoteOffer);
    const answer = await state.peerConnection.createAnswer();
    await state.peerConnection.setLocalDescription(answer);
  }
}

async function pushCandidate(callId, role, candidate) {
  const candidateRef = push(ref(state.db, `calls/${callId}/candidates/${role}`));
  await set(candidateRef, candidate);
}

function teardownCall(resetId = true) {
  if (state.peerConnection) {
    state.peerConnection.close();
    state.peerConnection = null;
  }
  if (state.localStream) {
    state.localStream.getTracks().forEach((track) => track.stop());
    state.localStream = null;
  }
  state.remoteStream.getTracks().forEach((track) => state.remoteStream.removeTrack(track));
  state.appliedCandidateIds.clear();
  if (resetId) {
    state.currentCallId = null;
  }
  updateCallButtons();
  hideCallBanner();
}

function updateCallButtons() {
  const canCall = Boolean(state.activeChatId && state.currentUser);
  els.startCallBtn.disabled = !canCall;

  if (state.currentCallId) {
    els.startCallBtn.classList.add("hidden");
    els.endCallBtn.classList.remove("hidden");
  } else {
    els.startCallBtn.classList.remove("hidden");
    els.endCallBtn.classList.add("hidden");
  }
}

function hideCallBanner() {
  els.callBanner.classList.add("hidden");
}

function renderFilteredChats() {
  const search = els.chatSearchInput.value.trim().toLowerCase();
  const chats = search
    ? state.chats.filter((chat) => [chat.title, chat.lastMessageText, chat.lastMessageSenderName].join(" ").toLowerCase().includes(search))
    : state.chats;

  state.filteredChats = chats;
  els.chatsList.innerHTML = "";

  for (const chat of chats) {
    const button = document.createElement("button");
    button.className = `chat-list-item ${chat.id === state.activeChatId ? "active" : ""}`;
    button.innerHTML = `
      <div class="avatar">${initials(chat.title)}</div>
      <div class="chat-list-copy">
        <strong>${escapeHtml(chat.title || "Без названия")}</strong>
        <p class="subtle small">${escapeHtml(composePreview(chat))}</p>
      </div>
    `;
    button.addEventListener("click", () => selectChat(chat.id));
    els.chatsList.appendChild(button);
  }

  if (!chats.length) {
    els.chatsList.innerHTML = '<div class="empty-state">Ничего не найдено.</div>';
  }
}

function renderActiveChatHeader() {
  if (!state.activeChat) {
    els.chatAvatar.textContent = "?";
    els.chatTitle.textContent = "Выберите чат";
    els.chatMeta.textContent = "После входа можно начать переписку.";
    return;
  }

  els.chatAvatar.textContent = initials(state.activeChat.title);
  els.chatTitle.textContent = state.activeChat.title;
  const membersCount = Object.keys(state.activeChat.memberIds || {}).length;
  els.chatMeta.textContent = `${membersCount || 1} участник(ов)`;
}

function renderMessages() {
  if (!state.activeChatId) {
    els.messagesList.innerHTML = '<div class="empty-state">Выберите чат слева.</div>';
    return;
  }

  if (!state.messages.length) {
    els.messagesList.innerHTML = '<div class="empty-state">Пока нет сообщений. Напишите первым.</div>';
    return;
  }

  els.messagesList.innerHTML = "";

  for (const message of state.messages) {
    const row = document.createElement("div");
    row.className = `message-row ${message.senderId === state.currentUser?.uid ? "self" : ""}`;

    const time = formatTime(message.createdAt);
    const author = message.senderName || state.usersMap.get(message.senderId)?.displayName || "User";

    row.innerHTML = `
      <article class="message-bubble">
        <div class="message-meta">
          <strong>${escapeHtml(author)}</strong>
          <span>${time}</span>
        </div>
        <div class="message-text">${escapeHtml(message.text || "")}</div>
      </article>
    `;

    if (message.type === "voice" && message.audioBase64) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.className = "voice-player";
      audio.src = message.audioBase64;
      row.querySelector(".message-bubble").appendChild(audio);
    }

    els.messagesList.appendChild(row);
  }

  els.messagesPanel.scrollTop = els.messagesPanel.scrollHeight;
}

function teardownChatListeners() {
  if (state.stopChatMessagesListener) {
    state.stopChatMessagesListener();
    state.stopChatMessagesListener = null;
  }

  if (state.stopChatsListener) {
    state.stopChatsListener();
    state.stopChatsListener = null;
  }
}

function teardownRealtimeListeners() {
  teardownChatListeners();

  if (state.stopCallsListener) {
    state.stopCallsListener();
    state.stopCallsListener = null;
  }

  state.activeChatId = null;
  state.activeChat = null;
  state.chats = [];
  state.filteredChats = [];
  state.messages = [];
}

function showSetupBanner(text) {
  els.setupBanner.textContent = text;
  els.setupBanner.classList.remove("hidden");
}

function hideSetupBanner() {
  els.setupBanner.classList.add("hidden");
}

function displayNameOf(user) {
  return user?.displayName || user?.email?.split("@")[0] || "User";
}

function composePreview(chat) {
  if (!chat.lastMessageText) {
    return "Пока нет сообщений";
  }
  return `${chat.lastMessageSenderName || ""}: ${chat.lastMessageText}`.trim();
}

function initials(text) {
  return String(text || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function formatTime(value) {
  return new Date(value || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function pickSupportedMimeType() {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return options.find((item) => MediaRecorder.isTypeSupported(item)) || "audio/webm";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function mapCollection(collection) {
  if (!collection || typeof collection !== "object") {
    return [];
  }
  return Object.entries(collection).map(([id, value]) => ({ id, ...value }));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mapFirebaseError(error) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "Этот email уже используется.";
  if (code.includes("invalid-email")) return "Некорректный email.";
  if (code.includes("weak-password")) return "Слишком слабый пароль. Нужно минимум 6 символов.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Неверный email или пароль.";
  }
  if (code.includes("network-request-failed")) return "Ошибка сети при подключении к Firebase.";
  return error?.message || "Неизвестная ошибка Firebase.";
}

function detectShellMode() {
  const isCapacitor = Boolean(window.Capacitor);
  const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;

  if (isCapacitor || isStandalone) {
    return "app";
  }

  return "web";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
