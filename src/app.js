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
const wallStarCountEl = document.querySelector("#wall-star-count");
const wallLightTotalEl = document.querySelector("#wall-light-total");
const wallFilterButtons = [...document.querySelectorAll("[data-wall-filter]")];
const residentDetailEl = document.querySelector("#resident-detail");
const singleResidentEl = document.querySelector("#single-resident");
const mapRegionEyebrowEl = document.querySelector("#map-region-eyebrow");
const mapRegionTitleEl = document.querySelector("#map-region-title");
const mapRegionDescEl = document.querySelector("#map-region-desc");
const mapResidentsEl = document.querySelector("#map-residents");
const localStorageKey = "shushu-planet.memories.v1";
const lightsStorageKey = "shushu-planet.wall-lights.v1";
const themeStorageKey = "shushu-planet.theme.v1";
const apiBase = "/api";
const defaultRegion = "月光谷";

// ---- 主题切换 ----
function getSavedTheme() {
  try {
    return localStorage.getItem(themeStorageKey);
  } catch {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // 忽略存储错误
  }
}

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === "dark") {
    html.setAttribute("data-theme", "dark");
  } else {
    html.removeAttribute("data-theme");
  }
}

function updateToggleButton(theme) {
  const btn = document.querySelector("#theme-toggle");
  if (!btn) return;
  btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  const saved = getSavedTheme();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);
  updateToggleButton(theme);
}

function toggleTheme() {
  const isDark = document.documentElement.hasAttribute("data-theme");
  const newTheme = isDark ? "light" : "dark";
  applyTheme(newTheme);
  saveTheme(newTheme);
  updateToggleButton(newTheme);
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  const toggleBtn = document.querySelector("#theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleTheme);
  }
});

const seedMemories = Array.isArray(window.shushuSeedMemories) ? window.shushuSeedMemories : [];

let memories = loadMemories();
let activeRegion = "all";
let wallActiveRegion = "all";
let mapRegion = null;
let editingMemoryId = null;
let apiResidentsLoaded = false;

function normalizeMemory(memory) {
  const arrivedAt = memory.arrivedAt || new Date().toISOString().slice(0, 10);
  const createdAt = memory.createdAt || `${arrivedAt}T00:00:00.000Z`;

  return {
    id: memory.id,
    databaseId: memory.databaseId ?? null,
    ownerId: memory.ownerId ?? null,
    visibility: memory.visibility || "private",
    playerName: memory.playerName || "",
    name: memory.name || "未命名鼠鼠",
    nickname: memory.nickname || "新来的星星",
    region: memory.region || defaultRegion,
    arrivedAt: arrivedAt?.toString().slice(0, 10),
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

function getSeedMemories() {
  return seedMemories.map(normalizeMemory);
}

function getLocalMemories() {
  try {
    const saved = JSON.parse(localStorage.getItem(localStorageKey) || "[]");
    return Array.isArray(saved) ? saved.map(normalizeMemory) : [];
  } catch {
    return [];
  }
}

function loadMemories() {
  return [...getLocalMemories(), ...getSeedMemories()];
}

function getSavedMemories() {
  return memories.filter((memory) => memory.saved);
}

function saveMemories() {
  localStorage.setItem(localStorageKey, JSON.stringify(getSavedMemories()));
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "请求失败。");
  }

  return data;
}

async function loadApiResidents() {
  try {
    const data = await fetchJson(`${apiBase}/residents`);
    const publicResidents = Array.isArray(data.residents) ? data.residents.map(normalizeMemory) : [];
    apiResidentsLoaded = true;
    memories = [...getLocalMemories(), ...publicResidents];
    renderAll();
  } catch {
    apiResidentsLoaded = false;
  }
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateValue));
}

function getMemoryById(id) {
  return memories.find((item) => item.id.toString() === id.toString());
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

function getResidentPageUrl(id) {
  return `./resident.html?id=${encodeURIComponent(id)}`;
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
  if (!mapResidentsEl) return;

  if (!mapRegion) {
    // 初始状态：展示引导文案
    if (mapRegionEyebrowEl) mapRegionEyebrowEl.textContent = "选择一片星域";
    if (mapRegionTitleEl) mapRegionTitleEl.textContent = "点击星球上的色块，查看那里的居民";
    if (mapRegionDescEl) mapRegionDescEl.textContent = "旋转星球，找到彩色的陆地区域，点一下就能看到住在那里的鼠鼠们。";
    mapResidentsEl.innerHTML = "";
    return;
  }

  const regionResidents = memories.filter((m) => m.region === mapRegion);

  if (mapRegionEyebrowEl) mapRegionEyebrowEl.textContent = mapRegion;
  if (mapRegionTitleEl) mapRegionTitleEl.textContent = `住在${mapRegion}的鼠鼠们`;
  if (mapRegionDescEl) {
    mapRegionDescEl.textContent = regionResidents.length
      ? `「${mapRegion}」目前有 ${regionResidents.length} 位居民。点卡片可以查看纪念页。`
      : `「${mapRegion}」暂时还没有居民入住。去星球居民页为它添加第一位鼠鼠吧。`;
  }

  mapResidentsEl.innerHTML = "";

  if (!regionResidents.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.innerHTML = `这片星域还在等待第一位小居民。<a href="./residents.html#add-memory">去新增鼠鼠</a>`;
    mapResidentsEl.append(empty);
    return;
  }

  const cards = regionResidents.map((memory) => {
    const card = createCard(memory);
    const detailLink = card.querySelector(".card-actions a");
    if (detailLink && residentDetailEl) {
      detailLink.addEventListener("click", (e) => {
        e.preventDefault();
        openResidentPage(memory.id);
      });
    }
    return card;
  });

  mapResidentsEl.append(...cards);
}

function createShareText(memory) {
  const traits = memory.traits.length ? `它是${memory.traits.slice(0, 2).join("、")}的小星星，` : "";
  return [
    `我在鼠鼠星球为「${memory.name}」点亮了一颗星。`,
    `${traits}最喜欢${memory.food}。`,
    memory.memory,
    "谢谢你来过我的世界。",
  ].join("\n");
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const characters = text.toString().split("");
  const lines = [];
  let line = "";

  characters.forEach((character) => {
    const testLine = line + character;
    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = character;
      return;
    }
    line = testLine;
  });

  if (line) lines.push(line);
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    visibleLines[maxLines - 1] = `${visibleLines[maxLines - 1].slice(0, -1)}...`;
  }

  visibleLines.forEach((item, index) => {
    context.fillText(item, x, y + index * lineHeight);
  });

  return visibleLines.length * lineHeight;
}

function downloadResidentCard(memory) {
  const canvas = document.createElement("canvas");
  const scale = 2;
  const width = 900;
  const height = 1200;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.fillStyle = "#fffaf2";
  context.fillRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f6fbf8");
  gradient.addColorStop(0.52, "#fffaf2");
  gradient.addColorStop(1, "#f8f1ea");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = memory.color;
  context.globalAlpha = 0.2;
  context.beginPath();
  context.arc(720, 150, 190, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(130, 1040, 170, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  context.fillStyle = "#ffffff";
  context.strokeStyle = "rgba(39, 48, 51, 0.14)";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(70, 80, 760, 1040, 28);
  context.fill();
  context.stroke();

  context.fillStyle = memory.color;
  context.beginPath();
  context.arc(450, 245, 96, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.9)";
  context.lineWidth = 12;
  context.stroke();

  context.fillStyle = "#e98f73";
  context.font = "700 28px sans-serif";
  context.textAlign = "center";
  context.fillText(memory.region, 450, 410);

  context.fillStyle = "#273033";
  context.font = "900 84px sans-serif";
  context.fillText(memory.name, 450, 510);

  context.fillStyle = "#687579";
  context.font = "700 28px sans-serif";
  context.fillText(`${memory.nickname} · ${formatDate(memory.arrivedAt)} 抵达鼠星`, 450, 565);

  context.textAlign = "left";
  context.fillStyle = "#4d5b5f";
  context.font = "400 34px sans-serif";
  wrapCanvasText(context, memory.memory, 150, 675, 600, 56, 5);

  const chips = [`爱吃 ${memory.food}`, ...(memory.traits || []).slice(0, 3)];
  let chipX = 150;
  let chipY = 915;
  context.font = "700 24px sans-serif";
  chips.forEach((chip) => {
    const chipWidth = context.measureText(chip).width + 34;
    if (chipX + chipWidth > 750) {
      chipX = 150;
      chipY += 54;
    }
    context.fillStyle = "#f4eee5";
    context.beginPath();
    context.roundRect(chipX, chipY, chipWidth, 38, 19);
    context.fill();
    context.fillStyle = "#5b5250";
    context.fillText(chip, chipX + 17, chipY + 26);
    chipX += chipWidth + 12;
  });

  context.textAlign = "center";
  context.fillStyle = "#273033";
  context.font = "900 30px sans-serif";
  context.fillText("鼠鼠星球", 450, 1050);
  context.fillStyle = "#687579";
  context.font = "400 22px sans-serif";
  context.fillText("谢谢你来过我的世界", 450, 1086);

  const link = document.createElement("a");
  link.download = `鼠鼠星球-${memory.name}-纪念卡.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function copyResidentShareText(memory, statusEl) {
  const shareText = createShareText(memory);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    statusEl.textContent = "分享文案已复制。";
  } catch {
    statusEl.textContent = shareText;
  }
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
      <a class="button ghost" href="${getResidentPageUrl(memory.id)}">查看纪念页</a>
      ${memory.saved
      ? `
            <button class="button ghost" type="button" data-action="edit" data-id="${memory.id}">编辑</button>
            <button class="button ghost danger" type="button" data-action="delete" data-id="${memory.id}">删除</button>
          `
      : ""
    }
    </div>
  `;

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
  const savedLights = getLightCount(memory.id);
  const baseLights = 8 + index * 3;
  const totalLights = baseLights + savedLights;
  const wasLit = savedLights > 0;

  const article = document.createElement("article");
  article.className = `wall-card${wasLit ? " lit" : ""}`;
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
      <span data-light-count>${totalLights} 盏小灯</span>
      <button class="button ghost light-button" type="button" aria-pressed="${wasLit}">${wasLit ? "已点亮" : "点一盏灯"}</button>
    </div>
  `;

  const lightButton = article.querySelector(".light-button");
  const lightCountEl = article.querySelector("[data-light-count]");
  lightButton.addEventListener("click", () => {
    const alreadyLit = lightButton.getAttribute("aria-pressed") === "true";
    if (alreadyLit) return; // 每人每只鼠鼠只能点一次
    addLight(memory.id);
    const newTotal = totalLights + 1;
    lightButton.setAttribute("aria-pressed", "true");
    lightButton.textContent = "已点亮";
    lightCountEl.textContent = `${newTotal} 盏小灯`;
    article.classList.add("lit");
    updateWallStats();
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

function getWallLights() {
  try {
    return JSON.parse(localStorage.getItem(lightsStorageKey) || "{}");
  } catch {
    return {};
  }
}

function getLightCount(memoryId) {
  const lights = getWallLights();
  return lights[memoryId] || 0;
}

function addLight(memoryId) {
  const lights = getWallLights();
  lights[memoryId] = (lights[memoryId] || 0) + 1;
  try {
    localStorage.setItem(lightsStorageKey, JSON.stringify(lights));
  } catch { /* 忽略存储错误 */ }
}

function getWallMemories() {
  const baseMemories = apiResidentsLoaded
    ? memories.filter((memory) => !memory.saved)
    : getSeedMemories();

  if (wallActiveRegion === "all") return baseMemories;
  return baseMemories.filter((m) => m.region === wallActiveRegion);
}

function updateWallStats() {
  if (!wallStarCountEl || !wallLightTotalEl) return;

  const wallMemories = getWallMemories();
  const allMemories = apiResidentsLoaded
    ? memories.filter((memory) => !memory.saved)
    : getSeedMemories();

  wallStarCountEl.textContent = wallMemories.length;

  let totalLights = 0;
  const lights = getWallLights();
  allMemories.forEach((m) => {
    totalLights += lights[m.id] || 0;
  });
  // 加上基础灯数（每个 seed memory 有 baseLights）
  allMemories.forEach((m, i) => {
    if (!lights[m.id]) totalLights += 8 + i * 3;
  });
  wallLightTotalEl.textContent = totalLights;
}

function setWallFilter(region) {
  wallActiveRegion = region;
  wallFilterButtons.forEach((btn) => {
    const isActive = btn.dataset.wallFilter === region;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive.toString());
  });
  renderWall();
}

function renderWall() {
  if (!wallCardsEl) return;

  const wallMemories = getWallMemories();
  wallCardsEl.innerHTML = "";

  if (!wallMemories.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = wallActiveRegion === "all"
      ? "纪念星河还没有点亮的小星星。"
      : `「${wallActiveRegion}」星域还没有居民抵达。`;
    wallCardsEl.append(empty);
  } else {
    wallCardsEl.append(...wallMemories.map((m, i) => createWallCard(m, i)));
  }

  updateWallStats();
}

function openResidentPage(id, shouldUpdateHash = true) {
  if (!residentDetailEl) {
    window.location.href = getResidentPageUrl(id);
    return;
  }

  const memory = getMemoryById(id);
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

  if (shouldUpdateHash) {
    history.pushState(null, "", `#${getResidentSlug(memory)}`);
  }
  residentDetailEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSingleResidentPage() {
  if (!singleResidentEl) return;

  const params = new URLSearchParams(location.search);
  const id = params.get("id") || decodeURIComponent(location.hash.replace("#resident-", ""));
  const memory = id ? getMemoryById(id) : null;

  if (!memory) {
    document.title = "鼠鼠星球 | 没有找到这颗星";
    singleResidentEl.innerHTML = `
      <section class="page-hero compact-hero" aria-labelledby="missing-resident-title">
        <p class="eyebrow">Resident Not Found</p>
        <h1 id="missing-resident-title">没有找到这颗星</h1>
        <p class="lede">这位鼠鼠可能只保存在另一台设备或另一个浏览器里。你可以回到星球居民页继续查看当前浏览器里的档案。</p>
        <a class="button primary" href="./residents.html">回到星球居民</a>
      </section>
    `;
    return;
  }

  const safeName = escapeHtml(memory.name);
  const safeNickname = escapeHtml(memory.nickname);
  const safeRegion = escapeHtml(memory.region);
  const safeFood = escapeHtml(memory.food);
  const safePlayerName = escapeHtml(memory.playerName || "本地记录");
  const safeTraits = memory.traits.map(escapeHtml);
  const safeMemory = escapeHtml(memory.memory);

  document.title = `鼠鼠星球 | ${memory.name} 的纪念页`;
  singleResidentEl.innerHTML = `
    <section class="single-hero" aria-labelledby="single-resident-title">
      <a class="back-link" href="./residents.html">返回星球居民</a>
      <div class="single-portrait">
        <span class="avatar memorial-avatar" style="background:${memory.color}" aria-hidden="true"></span>
      </div>
      <div class="single-copy">
        <p class="eyebrow">${safeRegion}</p>
        <h1 id="single-resident-title">${safeName}</h1>
        <p class="resident-subtitle">${safeNickname} · ${safePlayerName} · ${formatDate(memory.arrivedAt)} 抵达鼠星</p>
        <p class="single-memory">${safeMemory}</p>
        <ul class="tags">
          <li>爱吃 ${safeFood}</li>
          ${safeTraits.map((trait) => `<li>${trait}</li>`).join("")}
        </ul>
        <div class="share-actions" aria-label="纪念页分享操作">
          <button class="button primary" id="copy-share" type="button">复制分享文案</button>
          <button class="button ghost" id="download-card" type="button">生成纪念卡图片</button>
        </div>
        <p class="form-status share-status" id="share-status" aria-live="polite">
          分享文案和纪念卡只在当前浏览器生成，不会上传内容。
        </p>
      </div>
    </section>

    <section class="memorial-note" aria-label="${safeName} 的纪念内容">
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
    </section>

    <section class="share-preview" aria-labelledby="share-preview-title">
      <div>
        <p class="eyebrow">Share Copy</p>
        <h2 id="share-preview-title">分享文案预览</h2>
      </div>
      <pre>${escapeHtml(createShareText(memory))}</pre>
    </section>
  `;

  const statusEl = singleResidentEl.querySelector("#share-status");
  singleResidentEl.querySelector("#copy-share")?.addEventListener("click", () => {
    copyResidentShareText(memory, statusEl);
  });
  singleResidentEl.querySelector("#download-card")?.addEventListener("click", () => {
    downloadResidentCard(memory);
    statusEl.textContent = "纪念卡图片已生成。";
  });
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
  mapRegion = region;
  renderMap();
  // 滚动到区域居民面板
  document.querySelector(".map-region-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

async function renderSubmissionPreview(event) {
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

  submissionStatusEl.textContent = "正在送往鼠鼠星球";
  submissionCopyEl.textContent = "正在保存这份待审核档案。";

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

  try {
    const result = await fetchJson(`${apiBase}/submissions`, {
      method: "POST",
      body: JSON.stringify({
        playerName,
        name,
        nickname,
        region,
        arrivedAt,
        food,
        color: "#8fd2c8",
        traits,
        memory,
        photos: [],
        publicConsent: visibility === "review",
      }),
    });

    submissionStatusEl.textContent = "已进入待审核";
    submissionCopyEl.textContent =
      visibility === "review"
        ? `档案编号 ${result.id} 已保存。未来审核通过后，它会进入纪念星河。`
        : `档案编号 ${result.id} 已保存为私密意愿。未主动确认公开前，不会进入公开收录。`;
  } catch (error) {
    submissionStatusEl.textContent = "暂时没有保存成功";
    submissionCopyEl.textContent =
      error.message || "后端或数据库暂时不可用。预览已经生成，你可以稍后再试。";
  }
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
  memories = apiResidentsLoaded ? memories.filter((memory) => !memory.saved) : getSeedMemories();
  resetMemoryForm();
  if (searchInput) searchInput.value = "";
  if (residentDetailEl) residentDetailEl.hidden = true;
  setActiveFilter("all");
  renderStats();
  renderMap();
}

function renderAll() {
  renderStats();
  renderMap();
  renderCards();
  renderWall();
  renderSingleResidentPage();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveFilter(button.dataset.filter));
});

wallFilterButtons.forEach((button) => {
  button.addEventListener("click", () => setWallFilter(button.dataset.wallFilter));
});

searchInput?.addEventListener("input", renderCards);
form?.addEventListener("submit", addMemory);
cancelEditButton?.addEventListener("click", resetMemoryForm);
submissionForm?.addEventListener("submit", renderSubmissionPreview);
submissionForm?.addEventListener("reset", resetSubmissionPreview);
clearLocalButton?.addEventListener("click", clearLocalMemories);
window.addEventListener("hashchange", handleHashRoute);

// 星球地图：监听区域点击事件
document.addEventListener("planet:region-click", (event) => {
  setMapRegion(event.detail.region);
});

renderAll();
handleHashRoute();
loadApiResidents();
