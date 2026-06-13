const adminStorageKey = "shushu-planet.admin-token.v1";
const adminApiBase = "/api/admin";

const loginPanel = document.querySelector("#admin-login-panel");
const reviewPanel = document.querySelector("#admin-review-panel");
const loginForm = document.querySelector("#admin-login-form");
const loginStatus = document.querySelector("#admin-login-status");
const reviewStatus = document.querySelector("#admin-review-status");
const submissionsEl = document.querySelector("#admin-submissions");
const contentTypeFilter = document.querySelector("#admin-content-type");
const statusFilter = document.querySelector("#admin-status-filter");
const refreshButton = document.querySelector("#admin-refresh");
const logoutButton = document.querySelector("#admin-logout");

function getAdminToken() {
    try {
        return sessionStorage.getItem(adminStorageKey) || "";
    } catch {
        return "";
    }
}

function setAdminToken(token) {
    try {
        sessionStorage.setItem(adminStorageKey, token);
    } catch {
        // 当前会话不可写时，页面刷新后需要重新登录。
    }
}

function clearAdminToken() {
    try {
        sessionStorage.removeItem(adminStorageKey);
    } catch {
        // 忽略存储错误。
    }
}

function setStatus(element, message, type = "") {
    if (!element) return;
    element.textContent = message;
    element.className = `form-status${type ? ` ${type}` : ""}`;
}

function escapeHtml(value) {
    return (value == null ? "" : value.toString()).replace(/[&<>'"]/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    }[char]));
}

function formatDate(value) {
    if (!value) return "未填写";
    return value.toString().slice(0, 10);
}

function showReviewPanel() {
    loginPanel.hidden = true;
    reviewPanel.hidden = false;
}

function showLoginPanel(message = "请使用管理员账号登录。") {
    reviewPanel.hidden = true;
    loginPanel.hidden = false;
    setStatus(loginStatus, message);
}

async function adminFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "x-admin-token": getAdminToken(),
            ...(options.headers || {}),
        },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || "请求失败，请稍后重试。");
    }
    return data;
}

function renderSubmission(submission) {
    const photos = Array.isArray(submission.photos) ? submission.photos : [];
    const traits = Array.isArray(submission.traits) ? submission.traits : [];
    const isPending = submission.status === "pending";

    return `
    <article class="admin-card" data-submission-id="${escapeHtml(submission.id)}">
      <div class="admin-card-head">
        <div>
          <p class="eyebrow">${escapeHtml(submission.status)}</p>
          <h2>${escapeHtml(submission.name)}</h2>
          <p class="admin-meta">玩家：${escapeHtml(submission.playerName)} · ${escapeHtml(submission.region)} · ${formatDate(submission.arrivedAt)}</p>
        </div>
        <span class="admin-consent ${submission.publicConsent ? "ok" : "warn"}">${submission.publicConsent ? "已同意公开" : "未同意公开"}</span>
      </div>
      <div class="admin-card-grid">
        <div>
          <dl class="admin-fields">
            <div><dt>昵称</dt><dd>${escapeHtml(submission.nickname || "-")}</dd></div>
            <div><dt>品种</dt><dd>${escapeHtml(submission.breed || "-")}</dd></div>
            <div><dt>爱吃</dt><dd>${escapeHtml(submission.food || "-")}</dd></div>
            <div><dt>标签</dt><dd>${escapeHtml(traits.join("、") || "-")}</dd></div>
            <div><dt>抖音</dt><dd>${escapeHtml(submission.douyin || "-")}</dd></div>
            <div><dt>小红书</dt><dd>${escapeHtml(submission.xiaohongshu || "-")}</dd></div>
            <div><dt>B站</dt><dd>${escapeHtml(submission.bilibili || "-")}</dd></div>
          </dl>
          <p class="admin-memory">${escapeHtml(submission.memory)}</p>
        </div>
        <div class="admin-photos">
          ${photos.length ? photos.map((photo) => `<a href="${escapeHtml(photo)}" target="_blank" rel="noopener"><img src="${escapeHtml(photo)}" alt="${escapeHtml(submission.name)} 的投稿照片" /></a>`).join("") : "<p class=\"empty compact\">没有上传照片</p>"}
        </div>
      </div>
      <label class="admin-note">
        <span>审核备注</span>
        <textarea rows="2" maxlength="255" ${isPending ? "" : "disabled"}>${escapeHtml(submission.reviewerNote || "")}</textarea>
      </label>
      <div class="form-actions admin-card-actions">
        <button class="button primary" type="button" data-action="approve" ${isPending ? "" : "disabled"}>通过</button>
        <button class="button ghost" type="button" data-action="reject" ${isPending ? "" : "disabled"}>拒绝</button>
      </div>
    </article>
  `;
}

function renderResidentNote(note) {
    const isPending = note.status === "pending";

    return `
        <article class="admin-card" data-note-id="${escapeHtml(note.id)}">
            <div class="admin-card-head">
                <div>
                    <p class="eyebrow">${escapeHtml(note.status)}</p>
                    <h2>${escapeHtml(note.residentName || "未知鼠鼠")}</h2>
                    <p class="admin-meta">署名：${escapeHtml(note.author || "匿名旅鼠")} · ${formatDate(note.createdAt)}</p>
                </div>
                <a class="button ghost" href="./resident.html?id=${encodeURIComponent(note.residentId)}" target="_blank" rel="noopener">查看纪念页</a>
            </div>
            <p class="admin-memory">${escapeHtml(note.message)}</p>
            <div class="form-actions admin-card-actions">
                <button class="button primary" type="button" data-note-action="approve" ${isPending || note.status === "hidden" ? "" : "disabled"}>通过</button>
                <button class="button ghost danger" type="button" data-note-action="hide" ${note.status === "hidden" ? "disabled" : ""}>隐藏</button>
            </div>
        </article>
    `;
}

function getContentType() {
    return contentTypeFilter?.value || "submissions";
}

async function loadSubmissions() {
    const status = statusFilter.value || "pending";
    setStatus(reviewStatus, "正在读取投稿...");
    submissionsEl.innerHTML = "";

    try {
        const data = await adminFetch(`${adminApiBase}/submissions?status=${encodeURIComponent(status)}`);
        const submissions = Array.isArray(data.submissions) ? data.submissions : [];
        submissionsEl.innerHTML = submissions.length ? submissions.map(renderSubmission).join("") : "<p class=\"empty\">当前没有这个状态的投稿。</p>";
        setStatus(reviewStatus, `已加载 ${submissions.length} 条投稿。`, "success");
    } catch (error) {
        if (error.message.includes("审核权限")) {
            clearAdminToken();
            showLoginPanel("登录已失效，请重新登录。");
            return;
        }
        setStatus(reviewStatus, error.message, "error");
    }
}

async function loadResidentNotes() {
    const status = statusFilter.value || "pending";
    setStatus(reviewStatus, "正在读取回忆便签...");
    submissionsEl.innerHTML = "";

    try {
        const data = await adminFetch(`${adminApiBase}/notes?status=${encodeURIComponent(status)}`);
        const notes = Array.isArray(data.notes) ? data.notes : [];
        submissionsEl.innerHTML = notes.length ? notes.map(renderResidentNote).join("") : "<p class=\"empty\">当前没有这个状态的便签。</p>";
        setStatus(reviewStatus, `已加载 ${notes.length} 张便签。`, "success");
    } catch (error) {
        if (error.message.includes("审核权限")) {
            clearAdminToken();
            showLoginPanel("登录已失效，请重新登录。");
            return;
        }
        setStatus(reviewStatus, error.message, "error");
    }
}

async function loadCurrentContent() {
    if (getContentType() === "notes") {
        await loadResidentNotes();
        return;
    }
    await loadSubmissions();
}

async function reviewSubmission(card, action) {
    const id = card.dataset.submissionId;
    const reviewerNote = card.querySelector("textarea")?.value || "";
    const actionText = action === "reject" ? "拒绝" : "通过";

    setStatus(reviewStatus, `正在${actionText}投稿...`);
    try {
        await adminFetch(`${adminApiBase}/submissions/${encodeURIComponent(id)}/review`, {
            method: "POST",
            body: JSON.stringify({ action, reviewerNote }),
        });
        setStatus(reviewStatus, `已${actionText}这份投稿。`, "success");
        await loadSubmissions();
    } catch (error) {
        setStatus(reviewStatus, error.message, "error");
    }
}

async function reviewResidentNote(card, action) {
    const id = card.dataset.noteId;
    const actionText = action === "approve" ? "通过" : "隐藏";

    setStatus(reviewStatus, `正在${actionText}便签...`);
    try {
        await adminFetch(`${adminApiBase}/notes/${encodeURIComponent(id)}/review`, {
            method: "POST",
            body: JSON.stringify({ action }),
        });
        setStatus(reviewStatus, `已${actionText}这张便签。`, "success");
        await loadResidentNotes();
    } catch (error) {
        setStatus(reviewStatus, error.message, "error");
    }
}

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    setStatus(loginStatus, "正在登录...");

    try {
        const response = await fetch(`${adminApiBase}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: formData.get("username"),
                password: formData.get("password"),
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "登录失败，请稍后重试。");

        setAdminToken(data.token);
        loginForm.reset();
        showReviewPanel();
        await loadCurrentContent();
    } catch (error) {
        setStatus(loginStatus, error.message, "error");
    }
});

submissionsEl?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const noteButton = event.target.closest("button[data-note-action]");

    if (button && !button.disabled) {
        const card = button.closest(".admin-card");
        if (!card) return;
        reviewSubmission(card, button.dataset.action);
        return;
    }

    if (noteButton && !noteButton.disabled) {
        const card = noteButton.closest(".admin-card");
        if (!card) return;
        reviewResidentNote(card, noteButton.dataset.noteAction);
    }
});

contentTypeFilter?.addEventListener("change", loadCurrentContent);
statusFilter?.addEventListener("change", loadCurrentContent);
refreshButton?.addEventListener("click", loadCurrentContent);
logoutButton?.addEventListener("click", () => {
    clearAdminToken();
    showLoginPanel("已退出登录。");
});

if (getAdminToken()) {
    showReviewPanel();
    loadCurrentContent();
} else {
    showLoginPanel();
}
