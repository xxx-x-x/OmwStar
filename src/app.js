const cardsEl = document.querySelector("#cards");
const searchInput = document.querySelector("#search-input");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const totalCountEl = document.querySelector("#total-count");
const favoriteFoodEl = document.querySelector("#favorite-food");
const latestArrivalEl = document.querySelector("#latest-arrival");
const form = document.querySelector("#memory-form");
const addTitleEl = document.querySelector("#add-title");
const memorySubmitButton = document.querySelector("#memory-submit");
const cancelEditButton = document.querySelector("#cancel-edit");
const clearLocalButton = document.querySelector("#clear-local");
const memoryFormStatusEl = document.querySelector("#memory-form-status");
const submissionForm = document.querySelector("#submission-form");
const submissionStatusEl = document.querySelector("#submission-status");
const submissionCopyEl = document.querySelector("#submission-copy");
const submissionPreviewEl = document.querySelector("#submission-preview");
const wallCardsEl = document.querySelector("#wall-cards");
const residentDetailEl = document.querySelector("#resident-detail");
const mapZoneButtons = [...document.querySelectorAll("[data-map-region]")];
const mapRegionNameEl = document.querySelector("#map-region-name");
const mapRegionTitleEl = document.querySelector("#map-region-title");
const mapRegionCopyEl = document.querySelector("#map-region-copy");
const mapResidentsEl = document.querySelector("#map-residents");
const localStorageKey = "shushu-planet.memories.v1";
const defaultRegion = "月光谷";
const seedMemories = Array.isArray(window.shushuSeedMemories) ? window.shushuSeedMemories : [];

const regionDetails = {
  月光谷: {
    title: "这里住着温柔的小星星",
    copy: "月光谷收留那些安静、亲近、喜欢在掌心或窝边发呆的鼠鼠。",
  },
  瓜子环: {
    title: "这里有转不停的小行星",
    copy: "瓜子环适合精力旺盛、爱跑轮、听见袋子声就会冲出来的鼠鼠。",
  },
  棉花云: {
    title: "这里适合慢慢睡一觉",
    copy: "棉花云留给爱睡、慢吞吞、喜欢把木屑整理成小窝的鼠鼠。",
  },
};

let memories = loadMemories();
let activeRegion = "all";
let activeMapRegion = defaultRegion;
let editingMemoryId = null;

function normalizeMemory(memory) {
  const arrivedAt = memory.arrivedAt || new Date().toISOString().slice(0, 10);
  const createdAt = memory.createdAt || `${arrivedAt}T00:00:00.000Z`;

  return {
    id: memory.id,
    ownerId: memory.ownerId ?? null,
    visibility: memory.visibility || "private",
    playerName: memory.playerName || "",
    name: memory.name || "未命名鼠鼠",
    nickname: memory.nickname || "新来的星星",
    region: memory.region || defaultRegion,
    arrivedAt,
    food: memory.food || "小零食",
    color: memory.color || "#8fd2c8",
    traits: Array.isArray(memory.traits) ? memory.traits : [],
    memory: memory.memory || "",
    photos: Array.isArray(memory.photos) ? memory.photos : [],
    createdAt,
    updatedAt: memory.updatedAt || createdAt,
    saved: Boolean(memory.saved),
  };
}

function loadMemories() {
  try {
    const saved = JSON.parse(localStorage.getItem(localStorageKey) || "[]");
    const normalizedSeeds = seedMemories.map(normalizeMemory);
    if (!Array.isArray(saved)) return normalizedSeeds;
    return [...saved.map(normalizeMemory), ...normalizedSeeds];
  } catch {
    return seedMemories.map(normalizeMemory);
  }
}

function getSavedMemories() {
  return memories.filter((memory) => memory.saved);
}

function saveMemories() {
  localStorage.setItem(localStorageKey, JSON.stringify(getSavedMemories()));
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateValue));
}

function escapeHtml(value) {
  return value
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseTraits(value) {
  return value
    .toString()
    .split(/[,，]/)
    .map((trait) => trait.trim())
    .filter(Boolean);
}

function getResidentSlug(memory) {
  return `resident-${memory.id}`;
}

function getSearchText(memory) {
  return [
    memory.name,
    memory.nickname,
    memory.playerName,
    memory.region,
    memory.food,
    memory.memory,
    ...memory.traits,
  ]
    .join(" ")
    .toLowerCase();
}

function getVisibleMemories() {
  const keyword = searchInput.value.trim().toLowerCase();

  return memories.filter((memory) => {
    const matchesRegion = activeRegion === "all" || memory.region === activeRegion;
    const matchesKeyword = !keyword || getSearchText(memory).includes(keyword);
    return matchesRegion && matchesKeyword;
  });
}

function renderStats() {
  if (!totalCountEl || !favoriteFoodEl || !latestArrivalEl) return;

  totalCountEl.textContent = memories.length;

  const foodCounts = memories.reduce((counts, memory) => {
    counts[memory.food] = (counts[memory.food] || 0) + 1;
    return counts;
  }, {});

  const [favoriteFood = "瓜子"] = Object.entries(foodCounts).sort((a, b) => b[1] - a[1])[0] || [];
  const latest = [...memories].sort((a, b) => new Date(b.arrivedAt) - new Date(a.arrivedAt))[0];

  favoriteFoodEl.textContent = favoriteFood;
  latestArrivalEl.textContent = latest?.name || "小星星";
}

function renderMap() {
  if (!mapRegionNameEl || !mapRegionTitleEl || !mapRegionCopyEl || !mapResidentsEl) return;

  const detail = regionDetails[activeMapRegion] || regionDetails[defaultRegion];
  const residents = memories.filter((memory) => memory.region === activeMapRegion);

  mapZoneButtons.forEach((button) => {
    const isActive = button.dataset.mapRegion === activeMapRegion;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive.toString());
  });

  mapRegionNameEl.textContent = activeMapRegion;
  mapRegionTitleEl.textContent = detail.title;
  mapRegionCopyEl.textContent = detail.copy;
  mapResidentsEl.innerHTML = "";

  if (!residents.length) {
    const empty = document.createElement("p");
    empty.className = "empty compact";
    empty.textContent = "这片区域还没有居民，下一颗星也许会落在这里。";
    mapResidentsEl.append(empty);
    return;
  }

  mapResidentsEl.append(
    ...residents.map((memory) => {
      const button = document.createElement("button");
      button.className = "resident-chip";
      button.type = "button";
      button.innerHTML = `
        <span class="mini-avatar" style="background:${memory.color}" aria-hidden="true"></span>
        <span>${escapeHtml(memory.name)}</span>
      `;
      button.addEventListener("click", () => openResidentPage(memory.id));
      return button;
    }),
  );
}

function createCard(memory) {
  const safeName = escapeHtml(memory.name);
  const safeNickname = escapeHtml(memory.nickname);
  const safeRegion = escapeHtml(memory.region);
  const safeFood = escapeHtml(memory.food);
  const safePlayerName = escapeHtml(memory.playerName || "本地记录");
  const safeTraits = memory.traits.map(escapeHtml);
  const safeMemory = escapeHtml(memory.memory);

  const article = document.createElement("article");
  article.className = "card";
  article.innerHTML = `
    <div class="card-top">
      <span class="avatar" style="background:${memory.color}" aria-hidden="true"></span>
      <div>
        <h3>${safeName}</h3>
        <small>${safeNickname} · ${safeRegion}</small>
      </div>
    </div>
    <ul class="tags">
      <li>${safePlayerName}</li>
      <li>${safeFood}</li>
      ${safeTraits.slice(0, 2).map((trait) => `<li>${trait}</li>`).join("")}
    </ul>
    <p class="memory">${safeMemory}</p>
    <div class="card-actions">
      <button class="button ghost" type="button" data-action="detail" data-id="${memory.id}">查看详情页</button>
      ${
        memory.saved
          ? `
            <button class="button ghost" type="button" data-action="edit" data-id="${memory.id}">编辑</button>
            <button class="button ghost danger" type="button" data-action="delete" data-id="${memory.id}">删除</button>
          `
          : ""
      }
    </div>
  `;

  article.querySelector("[data-action='detail']").addEventListener("click", () => openResidentPage(memory.id));
  article.querySelector("[data-action='edit']")?.addEventListener("click", () => startEditMemory(memory.id));
  article.querySelector("[data-action='delete']")?.addEventListener("click", () => deleteMemory(memory.id));
  return article;
}

function createWallCard(memory, index) {
  const safeName = escapeHtml(memory.name);
  const safeNickname = escapeHtml(memory.nickname);
  const safeRegion = escapeHtml(memory.region);
  const safeFood = escapeHtml(memory.food);
  const safePlayerName = escapeHtml(memory.playerName || "一位玩家");
  const safeMemory = escapeHtml(memory.memory);
  const safeTraits = memory.traits.map(escapeHtml);
  const baseLights = 8 + index * 3;

  const article = document.createElement("article");
  article.className = "wall-card";
  article.innerHTML = `
    <div class="wall-card-glow" style="background:${memory.color}" aria-hidden="true"></div>
    <div class="card-top">
      <span class="avatar" style="background:${memory.color}" aria-hidden="true"></span>
      <div>
        <h3>${safeName}</h3>
        <small>${safeNickname} · ${safeRegion}</small>
      </div>
    </div>
    <p class="wall-owner">由 ${safePlayerName} 送到鼠鼠星球</p>
    <p class="memory">${safeMemory}</p>
    <ul class="tags">
      <li>爱吃 ${safeFood}</li>
      ${safeTraits.slice(0, 2).map((trait) => `<li>${trait}</li>`).join("")}
    </ul>
    <div class="wall-actions">
      <span data-light-count>${baseLights} 盏小灯</span>
      <button class="button ghost light-button" type="button" aria-pressed="false">点一盏灯</button>
    </div>
  `;

  const lightButton = article.querySelector(".light-button");
  const lightCountEl = article.querySelector("[data-light-count]");
  lightButton.addEventListener("click", () => {
    const isLit = lightButton.getAttribute("aria-pressed") === "true";
    lightButton.setAttribute("aria-pressed", (!isLit).toString());
    lightButton.textContent = isLit ? "点一盏灯" : "已点亮";
    lightCountEl.textContent = `${baseLights + (isLit ? 0 : 1)} 盏小灯`;
    article.classList.toggle("lit", !isLit);
  });

  return article;
}

function renderCards() {
  if (!cardsEl || !searchInput) return;

  const visibleMemories = getVisibleMemories();
  cardsEl.innerHTML = "";

  if (!visibleMemories.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "这片星域暂时还没有找到对应的鼠鼠。换个关键词再看看。";
    cardsEl.append(empty);
    return;
  }

  cardsEl.append(...visibleMemories.map(createCard));
}

function renderWall() {
  if (!wallCardsEl) return;

  wallCardsEl.innerHTML = "";
  const wallMemories = seedMemories.map(normalizeMemory);

  if (!wallMemories.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "纪念星河还没有点亮的小星星。未来公开收录的鼠鼠会在这里出现。";
    wallCardsEl.append(empty);
    return;
  }

  wallCardsEl.append(...wallMemories.map(createWallCard));
}

function openResidentPage(id, shouldUpdateHash = true) {
  if (!residentDetailEl) {
    window.location.href = `./residents.html#resident-${id}`;
    return;
  }

  const memory = memories.find((item) => item.id.toString() === id.toString());
  if (!memory) return;

  const safeName = escapeHtml(memory.name);
  const safeNickname = escapeHtml(memory.nickname);
  const safeRegion = escapeHtml(memory.region);
  const safeFood = escapeHtml(memory.food);
  const safePlayerName = escapeHtml(memory.playerName || "本地记录");
  const safeTraits = memory.traits.map(escapeHtml);
  const safeMemory = escapeHtml(memory.memory);
  const hasArchive = Boolean(document.querySelector("#archive"));
  const backHref = hasArchive ? "#archive" : "#planet-map";
  const backText = hasArchive ? "返回档案列表" : "返回星球地图";

  residentDetailEl.hidden = false;
  residentDetailEl.innerHTML = `
    <div class="resident-hero">
      <a class="back-link" href="${backHref}">${backText}</a>
      <div class="resident-portrait">
        <span class="avatar large" style="background:${memory.color}" aria-hidden="true"></span>
      </div>
      <div class="resident-copy">
        <p class="eyebrow">${safeRegion}</p>
        <h2>${safeName}</h2>
        <p class="resident-subtitle">${safeNickname} · ${safePlayerName} · ${formatDate(memory.arrivedAt)} 抵达鼠星</p>
        <p class="memory">${safeMemory}</p>
        <ul class="tags">
          <li>爱吃 ${safeFood}</li>
          ${safeTraits.map((trait) => `<li>${trait}</li>`).join("")}
        </ul>
      </div>
    </div>
    <div class="resident-notes">
      <article>
        <span>所在星域</span>
        <strong>${safeRegion}</strong>
      </article>
      <article>
        <span>记录玩家</span>
        <strong>${safePlayerName}</strong>
      </article>
      <article>
        <span>最爱的零食</span>
        <strong>${safeFood}</strong>
      </article>
      <article>
        <span>档案编号</span>
        <strong>#${memory.id}</strong>
      </article>
    </div>
  `;

  activeMapRegion = memory.region;
  renderMap();

  if (shouldUpdateHash) {
    history.pushState(null, "", `#${getResidentSlug(memory)}`);
  }
  residentDetailEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleHashRoute() {
  const hash = decodeURIComponent(location.hash.replace("#", ""));
  if (!hash.startsWith("resident-")) return;

  const id = hash.replace("resident-", "");
  if (id) openResidentPage(id, false);
}

function setActiveFilter(region) {
  if (!filterButtons.length) return;

  activeRegion = region;
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === activeRegion;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive.toString());
  });
  renderCards();
}

function setMapRegion(region) {
  activeMapRegion = region;
  renderMap();
  document.querySelector("#planet-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setMemoryFormStatus(message) {
  if (!memoryFormStatusEl) return;
  memoryFormStatusEl.textContent = message;
}

function resetMemoryForm() {
  if (!form) return;
  form.reset();
  editingMemoryId = null;
  if (addTitleEl) addTitleEl.textContent = "新增一张本地纪念卡";
  if (memorySubmitButton) memorySubmitButton.textContent = "点亮这颗星";
  if (cancelEditButton) cancelEditButton.hidden = true;
  setMemoryFormStatus("新增内容只保存在当前浏览器，之后可以编辑或删除。");
}

function getMemoryFormPayload(existingMemory) {
  const data = new FormData(form);
  const name = data.get("name").toString().trim();
  const playerName = data.get("playerName").toString().trim();
  const nickname = data.get("nickname").toString().trim() || "新来的星星";
  const arrivedAt = data.get("arrivedAt").toString() || new Date().toISOString().slice(0, 10);
  const food = data.get("food").toString().trim() || "小零食";
  const memory = data.get("memory").toString().trim();
  const now = new Date().toISOString();

  if (!name || !memory) return null;

  return {
    id: existingMemory?.id || Date.now(),
    ownerId: existingMemory?.ownerId ?? null,
    visibility: existingMemory?.visibility || "private",
    playerName,
    name,
    nickname,
    region: data.get("region").toString(),
    arrivedAt,
    food,
    color: data.get("color").toString() || existingMemory?.color || "#8fd2c8",
    traits: parseTraits(data.get("traits").toString()),
    memory,
    photos: existingMemory?.photos || [],
    createdAt: existingMemory?.createdAt || now,
    updatedAt: now,
    saved: true,
  };
}

function addMemory(event) {
  event.preventDefault();

  const existingMemory = editingMemoryId
    ? memories.find((memory) => memory.saved && memory.id.toString() === editingMemoryId.toString())
    : null;
  const payload = getMemoryFormPayload(existingMemory);

  if (!payload) return;

  if (existingMemory) {
    memories = memories.map((memory) =>
      memory.id.toString() === editingMemoryId.toString() ? payload : memory,
    );
    setMemoryFormStatus(`已更新 ${payload.name} 的本地纪念卡。`);
  } else {
    memories = [payload, ...memories];
    setMemoryFormStatus(`已点亮 ${payload.name} 这颗星。`);
  }

  saveMemories();
  editingMemoryId = null;
  form.reset();
  if (memorySubmitButton) memorySubmitButton.textContent = "点亮这颗星";
  if (addTitleEl) addTitleEl.textContent = "新增一张本地纪念卡";
  if (cancelEditButton) cancelEditButton.hidden = true;
  if (searchInput) searchInput.value = "";
  setActiveFilter("all");
  renderStats();
  renderCards();
  renderMap();
  document.querySelector("#archive")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startEditMemory(id) {
  if (!form) return;

  const memory = memories.find((item) => item.saved && item.id.toString() === id.toString());
  if (!memory) return;

  editingMemoryId = memory.id;
  form.elements.playerName.value = memory.playerName || "";
  form.elements.name.value = memory.name;
  form.elements.nickname.value = memory.nickname || "";
  form.elements.arrivedAt.value = memory.arrivedAt || "";
  form.elements.region.value = memory.region;
  form.elements.food.value = memory.food || "";
  form.elements.color.value = memory.color || "#8fd2c8";
  form.elements.traits.value = memory.traits.join(", ");
  form.elements.memory.value = memory.memory || "";

  if (addTitleEl) addTitleEl.textContent = `编辑 ${memory.name} 的本地纪念卡`;
  if (memorySubmitButton) memorySubmitButton.textContent = "保存修改";
  if (cancelEditButton) cancelEditButton.hidden = false;
  setMemoryFormStatus("正在编辑本地档案。修改只会保存在当前浏览器。");
  document.querySelector("#add-memory")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteMemory(id) {
  const memory = memories.find((item) => item.saved && item.id.toString() === id.toString());
  if (!memory) return;

  const confirmed = window.confirm(`确定删除 ${memory.name} 的本地纪念卡吗？这个操作只会删除浏览器本地新增内容。`);
  if (!confirmed) return;

  memories = memories.filter((item) => item.id.toString() !== id.toString());
  if (editingMemoryId?.toString() === id.toString()) resetMemoryForm();
  if (residentDetailEl && location.hash === `#${getResidentSlug(memory)}`) {
    residentDetailEl.hidden = true;
    history.pushState(null, "", location.pathname);
  }
  saveMemories();
  renderStats();
  renderCards();
  renderMap();
  setMemoryFormStatus(`已删除 ${memory.name} 的本地纪念卡。`);
}

function renderSubmissionPreview(event) {
  event.preventDefault();
  if (!submissionForm || !submissionStatusEl || !submissionCopyEl || !submissionPreviewEl) return;

  const data = new FormData(submissionForm);
  const playerName = data.get("playerName").toString().trim();
  const name = data.get("name").toString().trim();
  const nickname = data.get("nickname").toString().trim() || "还没有昵称";
  const region = data.get("region").toString();
  const arrivedAt = data.get("arrivedAt").toString();
  const food = data.get("food").toString().trim() || "小零食";
  const memory = data.get("memory").toString().trim();
  const visibility = data.get("visibility").toString();
  const traits = data
    .get("traits")
    .toString()
    .split(/[,，]/)
    .map((trait) => trait.trim())
    .filter(Boolean);

  if (!playerName || !name || !arrivedAt || !memory) return;

  const safePlayerName = escapeHtml(playerName);
  const safeName = escapeHtml(name);
  const safeNickname = escapeHtml(nickname);
  const safeRegion = escapeHtml(region);
  const safeFood = escapeHtml(food);
  const safeMemory = escapeHtml(memory);
  const safeTraits = traits.map(escapeHtml);
  const visibilityText = visibility === "review" ? "愿意公开，等待审核" : "先保持私密";

  submissionStatusEl.textContent = "已生成待审核预览";
  submissionCopyEl.textContent =
    visibility === "review"
      ? "这份草稿表达了玩家愿意未来公开收录的意愿。真实上线后，它仍需要经过确认、审核和可撤回流程。"
      : "这份草稿会先保持私密。真实上线后，只有玩家主动确认公开，才会进入待审核流程。";

  submissionPreviewEl.innerHTML = `
    <article class="card submission-card">
      <div class="card-top">
        <span class="avatar" style="background:#8fd2c8" aria-hidden="true"></span>
        <div>
          <h3>${safeName}</h3>
          <small>${safeNickname} · ${safeRegion}</small>
        </div>
      </div>
      <ul class="tags">
        <li>${escapeHtml(visibilityText)}</li>
        <li>玩家 ${safePlayerName}</li>
        <li>爱吃 ${safeFood}</li>
        ${safeTraits.map((trait) => `<li>${trait}</li>`).join("")}
      </ul>
      <p class="resident-subtitle">${formatDate(arrivedAt)} 抵达鼠星</p>
      <p class="memory">${safeMemory}</p>
    </article>
  `;
}

function resetSubmissionPreview() {
  if (!submissionStatusEl || !submissionCopyEl || !submissionPreviewEl) return;

  submissionStatusEl.textContent = "还没有生成档案";
  submissionCopyEl.textContent =
    "填好左侧表单后，可以生成一张待审核预览。它只会显示在当前页面，不会写入本地档案，也不会提交到服务器。";
  submissionPreviewEl.innerHTML = `<p class="empty compact">待审核预览会出现在这里。</p>`;
}

function clearLocalMemories() {
  localStorage.removeItem(localStorageKey);
  memories = seedMemories.map(normalizeMemory);
  resetMemoryForm();
  if (searchInput) searchInput.value = "";
  if (residentDetailEl) residentDetailEl.hidden = true;
  setActiveFilter("all");
  renderStats();
  renderMap();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveFilter(button.dataset.filter));
});

searchInput?.addEventListener("input", renderCards);
form?.addEventListener("submit", addMemory);
cancelEditButton?.addEventListener("click", resetMemoryForm);
submissionForm?.addEventListener("submit", renderSubmissionPreview);
submissionForm?.addEventListener("reset", resetSubmissionPreview);
clearLocalButton?.addEventListener("click", clearLocalMemories);
mapZoneButtons.forEach((button) => {
  button.addEventListener("click", () => setMapRegion(button.dataset.mapRegion));
});
window.addEventListener("hashchange", handleHashRoute);

renderStats();
renderMap();
renderCards();
renderWall();
handleHashRoute();
