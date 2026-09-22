const totalCountEl = document.querySelector("#total-count");
const favoriteFoodEl = document.querySelector("#favorite-food");
const latestArrivalEl = document.querySelector("#latest-arrival");
const submissionForm = document.querySelector("#submission-form");
const submissionStatusEl = document.querySelector("#submission-status");
const wallCardsEl = document.querySelector("#wall-cards");
const wallStarCountEl = document.querySelector("#wall-star-count");
const wallLightTotalEl = document.querySelector("#wall-light-total");
const wallFilterButtons = [...document.querySelectorAll("[data-wall-filter]")];
const wallListTitleEl = document.querySelector("#wall-list-title");
const singleResidentEl = document.querySelector("#single-resident");
const mapRegionEyebrowEl = document.querySelector("#map-region-eyebrow");
const mapRegionTitleEl = document.querySelector("#map-region-title");
const mapRegionDescEl = document.querySelector("#map-region-desc");
const mapResidentsEl = document.querySelector("#map-residents");
const residentDetailEl = document.querySelector("#resident-detail");
const timelineContainerEl = document.querySelector("#timeline-container");
const guardianListEl = document.querySelector("#guardian-list");
const lightsStorageKey = "shushu-planet.wall-lights.v1";
const apiBase = "/api";
const defaultRegion = "月光谷";
const adminStorageKey = "shushu-planet.admin-token.v1";
const adminEditId = new URLSearchParams(location.search).get("adminEdit") || "";
let adminEditRecord = null;
let adminExistingPhotos = [];
let adminExistingSpreadImage = "";

function getAdminToken() {
  try {
    return sessionStorage.getItem(adminStorageKey) || "";
  } catch {
    return "";
  }
}

function normalizePresence(value) {
  return value === "earth" ? "earth" : "star";
}

function isEarthResident(memory) {
  return normalizePresence(memory?.presence) === "earth";
}

function getPresenceCopy(memory = {}) {
  const earth = isEarthResident(memory);
  const name = memory.name || "它";
  const playerName = memory.playerName || "一位玩家";

  return {
    earth,
    key: earth ? "earth" : "star",
    label: earth ? "地球来信" : "鼠星居民",
    dateVerb: earth ? "来到我身边" : "抵达鼠星",
    pageNoun: earth ? "故事页" : "纪念页",
    ownerLine: earth ? `由 ${playerName} 从地球寄来` : `由 ${playerName} 送到鼠鼠星球`,
    shareOpen: earth
      ? `我在鼠鼠星球为「${name}」留下一封地球来信。`
      : `我在鼠鼠星球为「${name}」点亮了一颗星。`,
    shareClose: earth ? "愿你慢慢长大。" : "谢谢你来过我的世界。",
    lightNoun: earth ? "陪伴灯" : "归家星灯",
    lightButton: earth ? "点亮一盏陪伴灯" : "点亮归家星灯",
    lightPressed: earth ? "陪伴灯已点亮" : "已点亮",
    lightCountLabel: (count) => `${count} 盏${earth ? "陪伴灯" : "归家星灯"}`,
    lightAlready: earth ? "这盏陪伴灯一直亮着。" : "这盏星灯一直亮着。",
    lightSuccess: earth ? "陪伴灯已点亮，今天又被轻轻记住了一点。" : "星灯已点亮，它的归途又亮了一点。",
    cardFooter: earth ? "愿你慢慢长大" : "谢谢你来过我的世界",
    cardFilename: `鼠鼠星球-${name}-${earth ? "地球来信" : "纪念卡"}.png`,
    placeLine: earth ? "还在地球" : null,
    worldTitle: earth ? "它在地球的今天" : "它在鼠星的今天",
    ritualTitle: earth ? "陪伴小灯" : "归家星灯",
    ritualLead: earth
      ? "轻轻点亮一盏灯，告诉它：今天也被认真爱着。"
      : "轻轻点亮一盏灯，告诉它：还有人记得这条回家的路。",
    ritualIdle: earth ? "你将成为陪伴它的旅鼠之一。" : "你将成为点亮归途的旅鼠之一。",
    notePlaceholder: earth
      ? "例如：今天也要好好吃饭，慢慢长大。"
      : "例如：在鼠星记得吃胖点，也要继续做快乐的小星星。",
    capsulePlaceholder: earth
      ? "一年后，如果你还想再看看今天的它，就回来读这封信。"
      : "一年后，如果你还想它，就回来看看这颗星。",
  };
}

// ---- 自定义下拉组件 ----
function initCustomSelect(nativeSelect) {
  if (!nativeSelect || nativeSelect.dataset.customized === "1") return;
  nativeSelect.dataset.customized = "1";

  const wrapper = document.createElement("div");
  wrapper.className = "custom-select";

  // 触发器
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select-trigger";
  trigger.innerHTML = `<span class="custom-select-text"></span><span class="custom-select-arrow"></span>`;

  // 下拉面板
  const panel = document.createElement("div");
  panel.className = "custom-select-panel";
  panel.setAttribute("role", "listbox");

  // 填充选项
  const renderOptions = () => {
    panel.innerHTML = "";
    for (const opt of nativeSelect.options) {
      if (opt.tagName === "OPTGROUP") continue; // skip optgroups for now
      const item = document.createElement("div");
      item.className = "custom-select-option";
      item.setAttribute("role", "option");
      item.dataset.value = opt.value;
      item.textContent = opt.textContent;
      if (opt.value === nativeSelect.value) {
        item.classList.add("active");
        item.setAttribute("aria-selected", "true");
      }
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        nativeSelect.value = opt.value;
        nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        closePanel();
      });
      panel.appendChild(item);
    }
  };

  const updateTrigger = () => {
    const idx = nativeSelect.selectedIndex;
    const selected = idx >= 0 ? nativeSelect.options[idx] : null;
    trigger.querySelector(".custom-select-text").textContent = selected ? selected.textContent : "";
    trigger.classList.toggle("disabled", nativeSelect.disabled);
    // 更新面板高亮
    panel.querySelectorAll(".custom-select-option").forEach((item) => {
      const active = item.dataset.value === nativeSelect.value;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
    });
  };

  const openPanel = () => {
    if (nativeSelect.disabled) return;
    renderOptions();
    updateTrigger();
    panel.classList.add("open");
    trigger.classList.add("open");
    // 滚动到选中项
    const activeItem = panel.querySelector(".custom-select-option.active");
    if (activeItem) activeItem.scrollIntoView({ block: "nearest" });
  };

  const closePanel = () => {
    panel.classList.remove("open");
    trigger.classList.remove("open");
  };

  trigger.addEventListener("click", () => {
    if (panel.classList.contains("open")) closePanel();
    else openPanel();
  });

  // 点击外部关闭
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) closePanel();
  });

  // 键盘
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!panel.classList.contains("open")) openPanel();
      const items = [...panel.querySelectorAll(".custom-select-option")];
      const idx = items.findIndex((item) => item.classList.contains("active"));
      const next = e.key === "ArrowDown" ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
      if (items[next]) {
        items[next].classList.add("active");
        items[next].scrollIntoView({ block: "nearest" });
        if (idx >= 0) items[idx].classList.remove("active");
      }
    } else if (e.key === "Enter" && panel.classList.contains("open")) {
      e.preventDefault();
      const activeItem = panel.querySelector(".custom-select-option.active");
      if (activeItem) {
        nativeSelect.value = activeItem.dataset.value;
        nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        closePanel();
      }
    } else if (e.key === "Escape") {
      closePanel();
    }
  });

  nativeSelect.addEventListener("change", updateTrigger);
  nativeSelect.addEventListener("disabled-change", updateTrigger);

  // 监听原生 select 的选项变化（级联更新时自动刷新面板）
  const observer = new MutationObserver(() => {
    updateTrigger();
  });
  observer.observe(nativeSelect, { childList: true, subtree: true });

  // 插入 DOM
  nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);
  nativeSelect.hidden = true;
  wrapper.appendChild(nativeSelect); // 移到 wrapper 内

  updateTrigger();
}

const seedMemories = Array.isArray(window.shushuSeedMemories) ? window.shushuSeedMemories : [];

let memories = [];
let wallActiveRegion = "all";
const wallActivePresence = document.body?.dataset.wallPresence === "earth" ? "earth" : "star";
let mapSelection = null;
let apiResidentsLoaded = false;
let apiResidentsSettled = false;

function normalizeColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#8fd2c8";
}

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
    presence: normalizePresence(memory.presence),
    arrivedAt: arrivedAt?.toString().slice(0, 10),
    food: memory.food || "小零食",
    color: normalizeColor(memory.color),
    traits: Array.isArray(memory.traits) ? memory.traits : [],
    memory: memory.memory || "",
    photos: Array.isArray(memory.photos) ? memory.photos : [],
    spreadImage: memory.spreadImage || "",
    lightCount: Number(memory.lightCount || 0),
    createdAt,
    updatedAt: memory.updatedAt || createdAt,
  };
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
    apiResidentsSettled = true;
    memories = publicResidents;
    renderAll();
  } catch {
    apiResidentsLoaded = false;
    apiResidentsSettled = true;
    renderAll();
  }
}

async function loadGuardians() {
  if (!guardianListEl) return;

  try {
    const response = await fetch("./data/guardians.json", { cache: "no-store" });
    const guardians = await response.json();
    if (!response.ok || !Array.isArray(guardians)) throw new Error("守护者配置不可用");

    guardianListEl.innerHTML = guardians.map((guardian) => `
      <li>
        <strong>${escapeHtml(guardian.name || "匿名守护者")}</strong>
        <span>${escapeHtml(guardian.note || "谢谢你点亮鼠鼠星球")}</span>
      </li>
    `).join("");
  } catch {
    // 保留 HTML 中的默认占位名单。
  }
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateValue));
}

function formatDateInput(dateValue) {
  if (!dateValue) return "";
  const match = dateValue.toString().match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getMouseStarCalendar(dateValue) {
  const arrivedDate = new Date(dateValue);
  const now = new Date();
  const monthDiff = Math.max(0,
    (now.getFullYear() - arrivedDate.getFullYear()) * 12
    + now.getMonth() - arrivedDate.getMonth()
    + (now.getDate() >= arrivedDate.getDate() ? 0 : -1),
  );
  const starDay = monthDiff + 1;
  const seasonNames = ["月光汛", "瓜子风", "棉花雪", "星砂潮", "蜜糖晴", "软绒夜"];
  const season = seasonNames[(starDay - 1) % seasonNames.length];

  return {
    starDay,
    season,
    label: `鼠星第 ${starDay} 日 · ${season}`,
    rule: "鼠星一日，约等于人间一月。",
  };
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

function getResidentLoadingHtml() {
  return `
    <section class="resident-loader" aria-label="正在加载鼠鼠纪念页">
      <div class="resident-loader-card">
        <div class="resident-loader-face" aria-hidden="true">🐹</div>
        <p class="eyebrow">Loading Resident</p>
        <p class="resident-loader-text" aria-live="polite"></p>
        <div class="resident-loader-track" aria-hidden="true">
          <span></span>
        </div>
      </div>
    </section>
  `;
}

function getVisibleMemories(presence) {
  const baseMemories = apiResidentsLoaded
    ? memories.filter((memory) => !memory.saved)
    : getSeedMemories();

  if (!presence) return baseMemories;
  return baseMemories.filter((memory) => normalizePresence(memory.presence) === presence);
}

function getArchiveHome(memory) {
  return isEarthResident(memory) ? "./earth-letters.html" : "./planet-wall.html";
}

function getArchiveHomeLabel(memory) {
  return isEarthResident(memory) ? "地球来信" : "纪念星河";
}

function renderStats() {
  if (!totalCountEl || !favoriteFoodEl || !latestArrivalEl) return;

  const starMemories = getVisibleMemories("star");
  totalCountEl.textContent = starMemories.length;

  const foodCounts = starMemories.reduce((counts, memory) => {
    counts[memory.food] = (counts[memory.food] || 0) + 1;
    return counts;
  }, {});

  const [favoriteFood = "瓜子"] = Object.entries(foodCounts).sort((a, b) => b[1] - a[1])[0] || [];
  const latest = [...starMemories].sort((a, b) => new Date(b.arrivedAt) - new Date(a.arrivedAt))[0];

  favoriteFoodEl.textContent = favoriteFood;
  latestArrivalEl.textContent = latest?.name || "小星星";
}

function getMapResidents(selection) {
  if (!selection) return [];
  if (selection.presence === "earth") return getVisibleMemories("earth");
  return getVisibleMemories("star").filter((memory) => memory.region === selection.region);
}

function renderMap() {
  if (!mapResidentsEl) return;

  document.querySelectorAll(".planet-world").forEach((el) => {
    const selected = mapSelection?.presence === el.dataset.planet;
    el.classList.toggle("is-active", selected);
  });

  if (!mapSelection) {
    if (mapRegionEyebrowEl) mapRegionEyebrowEl.textContent = "选择一颗星球";
    if (mapRegionTitleEl) mapRegionTitleEl.textContent = "点鼠星上的色块，或点一下地球";
    if (mapRegionDescEl) {
      mapRegionDescEl.textContent = "左边的彩色陆地住着鼠星居民；右边的地球上，还有鼠鼠在慢慢长大。";
    }
    mapResidentsEl.innerHTML = "";
    return;
  }

  const earth = mapSelection.presence === "earth";
  const residents = getMapResidents(mapSelection);
  const placeLabel = earth ? "地球" : mapSelection.region;

  if (mapRegionEyebrowEl) mapRegionEyebrowEl.textContent = placeLabel;
  if (mapRegionTitleEl) {
    mapRegionTitleEl.textContent = earth ? "还在地球的鼠鼠们" : `住在${placeLabel}的鼠鼠们`;
  }
  if (mapRegionDescEl) {
    mapRegionDescEl.textContent = residents.length
      ? earth
        ? `地球上目前有 ${residents.length} 位还在人间的鼠鼠。点卡片可以查看故事页。`
        : `「${placeLabel}」目前有 ${residents.length} 位居民。点卡片可以查看纪念页。`
      : earth
        ? "地球上暂时还没有寄来的故事。去投稿页留下第一封地球来信吧。"
        : `「${placeLabel}」暂时还没有居民入住。去投稿页为它添加第一位鼠鼠吧。`;
  }

  mapResidentsEl.innerHTML = "";

  if (!residents.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.innerHTML = earth
      ? `地球上还在等待第一封来信。<a href="./submit.html">去投稿</a>`
      : `这片星域还在等待第一位小居民。<a href="./submit.html">去投稿</a>`;
    mapResidentsEl.append(empty);
    return;
  }

  const cards = residents.map((memory) => {
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
  const copy = getPresenceCopy(memory);
  const traits = memory.traits.length ? `它是${memory.traits.slice(0, 2).join("、")}的小星星，` : "";
  return [
    copy.shareOpen,
    `${traits}最喜欢${memory.food}。`,
    memory.memory,
    copy.shareClose,
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
  context.fillText(getPlaceLabel(memory), 450, 410);

  context.fillStyle = "#273033";
  context.font = "900 84px sans-serif";
  context.fillText(memory.name, 450, 510);

  const copy = getPresenceCopy(memory);
  context.fillStyle = "#687579";
  context.font = "700 28px sans-serif";
  context.fillText(`${memory.nickname} · ${formatDate(memory.arrivedAt)} ${copy.dateVerb}`, 450, 565);

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
  context.fillText(copy.cardFooter, 450, 1086);

  const link = document.createElement("a");
  link.download = copy.cardFilename;
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

async function lightResident(memory, countEl, buttonEl, statusEl) {
  buttonEl.disabled = true;

  try {
    const data = await fetchJson(`${apiBase}/residents/${encodeURIComponent(memory.id)}/lights`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const copy = getPresenceCopy(memory);
    memory.lightCount = Number(data.lightCount || memory.lightCount || 0);
    countEl.textContent = copy.lightCountLabel(memory.lightCount);
    buttonEl.textContent = data.alreadyLit ? "你已点亮过" : copy.lightPressed;
    buttonEl.setAttribute("aria-pressed", "true");
    if (statusEl) statusEl.textContent = data.alreadyLit ? copy.lightAlready : copy.lightSuccess;
  } catch (error) {
    const copy = getPresenceCopy(memory);
    const savedLights = getLightCount(memory.id);
    addLight(memory.id);
    const totalLights = Math.max(memory.lightCount || 0, savedLights + 1);
    countEl.textContent = copy.lightCountLabel(totalLights);
    buttonEl.textContent = copy.lightPressed;
    buttonEl.setAttribute("aria-pressed", "true");
    if (statusEl) statusEl.textContent = "后端暂时不可用，已先在当前浏览器点亮。";
  }
}

function renderResidentNotes(notesEl, notes) {
  if (!notesEl) return;

  if (!notes.length) {
    notesEl.innerHTML = `<p class="empty">还没有便签。你可以成为第一个轻轻说话的人。</p>`;
    return;
  }

  notesEl.innerHTML = notes.map((note) => `
    <article class="memory-note-card">
      <p>${escapeHtml(note.message)}</p>
      <span>${escapeHtml(note.author || "匿名旅鼠")} · ${formatDate(note.createdAt)}</span>
    </article>
  `).join("");
}

async function loadResidentNotes(memory, notesEl) {
  if (!notesEl) return;
  if (!apiResidentsLoaded) {
    renderResidentNotes(notesEl, []);
    return;
  }

  try {
    const data = await fetchJson(`${apiBase}/residents/${encodeURIComponent(memory.id)}/notes`);
    renderResidentNotes(notesEl, Array.isArray(data.notes) ? data.notes : []);
  } catch {
    renderResidentNotes(notesEl, []);
  }
}

async function submitResidentNote(event, memory, notesEl, statusEl) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const payload = {
    author: data.get("author")?.toString().trim() || "匿名旅鼠",
    message: data.get("message")?.toString().trim() || "",
  };

  if (!payload.message) {
    statusEl.textContent = "请先写下一张便签。";
    statusEl.className = "form-status error";
    return;
  }

  statusEl.textContent = "正在把便签贴到星灯旁……";
  statusEl.className = "form-status";

  try {
    const result = await fetchJson(`${apiBase}/residents/${encodeURIComponent(memory.id)}/notes`, {
      method: "POST",
      body: JSON.stringify(payload),
    }); 故事
    form.reset();
    statusEl.textContent = "便签已送去审核，通过后会贴在纪念页。";
    statusEl.className = "form-status success";
    await loadResidentNotes(memory, notesEl);
    if (!apiResidentsLoaded && result.note?.status === "approved") renderResidentNotes(notesEl, [result.note]);
  } catch (error) {
    statusEl.textContent = error.message || "便签暂时没有贴上，请稍后再试。";
    statusEl.className = "form-status error";
  }
}

async function submitTimeCapsule(event, memory, statusEl) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const payload = {
    email: data.get("email")?.toString().trim() || "",
    deliverAt: data.get("deliverAt")?.toString() || "",
    message: data.get("message")?.toString().trim() || "",
  };

  statusEl.textContent = "正在把时间胶囊送进星轨……";
  statusEl.className = "form-status";

  try {
    const result = await fetchJson(`${apiBase}/residents/${encodeURIComponent(memory.id)}/time-capsules`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    form.reset();
    statusEl.textContent = result.message || "时间胶囊已寄存。";
    statusEl.className = "form-status success";
  } catch (error) {
    statusEl.textContent = error.message || "时间胶囊暂时没有寄存成功。";
    statusEl.className = "form-status error";
  }
}

function getPlaceLabel(memory) {
  const copy = getPresenceCopy(memory);
  return copy.placeLine || memory.region || defaultRegion;
}

function createCard(memory) {
  const copy = getPresenceCopy(memory);
  const safeName = escapeHtml(memory.name);
  const safeNickname = escapeHtml(memory.nickname);
  const safePlace = escapeHtml(getPlaceLabel(memory));
  const safeFood = escapeHtml(memory.food);
  const safePlayerName = escapeHtml(memory.playerName || "本地记录");
  const safeTraits = memory.traits.map(escapeHtml);
  const safeMemory = escapeHtml(memory.memory);

  const article = document.createElement("article");
  article.className = `card presence-${copy.key}`;
  article.innerHTML = `
    <div class="card-top">
      <span class="avatar" style="background:${memory.color}" aria-hidden="true"></span>
      <div>
        <h3>${safeName}</h3>
        <small>${safeNickname} · ${safePlace}</small>
      </div>
      <span class="presence-chip ${copy.key}">${copy.label}</span>
    </div>
    <ul class="tags">
      <li>${safePlayerName}</li>
      <li>${safeFood}</li>
      ${safeTraits.slice(0, 2).map((trait) => `<li>${trait}</li>`).join("")}
    </ul>
    <p class="memory">${safeMemory}</p>
    <div class="card-actions">
      <a class="button ghost" href="${getResidentPageUrl(memory.id)}">查看${copy.pageNoun}</a>
    </div>
  `;

  return article;
}

function createWallCard(memory, index) {
  const copy = getPresenceCopy(memory);
  const safeName = escapeHtml(memory.name);
  const safeNickname = escapeHtml(memory.nickname);
  const safePlace = escapeHtml(getPlaceLabel(memory));
  const safeFood = escapeHtml(memory.food);
  const safePlayerName = escapeHtml(memory.playerName || "一位玩家");
  const safeMemory = escapeHtml(memory.memory);
  const safeTraits = memory.traits.map(escapeHtml);
  const savedLights = getLightCount(memory.id);
  const baseLights = memory.lightCount || (8 + index * 3);
  const totalLights = baseLights + savedLights;
  const wasLit = savedLights > 0;

  const article = document.createElement("article");
  article.className = `wall-card presence-${copy.key}${wasLit ? " lit" : ""}`;
  article.innerHTML = `
    <div class="wall-card-glow" style="background:${memory.color}" aria-hidden="true"></div>
    <div class="card-top">
      <span class="avatar" style="background:${memory.color}" aria-hidden="true"></span>
      <div>
        <h3>${safeName}</h3>
        <small>${safeNickname} · ${safePlace}</small>
      </div>
      <span class="presence-chip ${copy.key}">${copy.label}</span>
    </div>
    <p class="wall-owner">${escapeHtml(copy.ownerLine)}</p>
    <p class="memory">${safeMemory}</p>
    <ul class="tags">
      <li>爱吃 ${safeFood}</li>
      ${safeTraits.slice(0, 2).map((trait) => `<li>${trait}</li>`).join("")}
    </ul>
    <div class="wall-actions">
      <span data-light-count>${copy.lightCountLabel(totalLights)}</span>
      <button class="button ghost light-button" type="button" aria-pressed="${wasLit}">${wasLit ? copy.lightPressed : "点一盏灯"}</button>
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
    lightButton.textContent = copy.lightPressed;
    lightCountEl.textContent = copy.lightCountLabel(newTotal);
    article.classList.add("lit");
    updateWallStats();
  });

  article.querySelector(".card-top")?.addEventListener("click", () => {
    window.location.href = getResidentPageUrl(memory.id);
  });

  return article;
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

function getSeedMemories() {
  return seedMemories.map(normalizeMemory);
}

function getWallMemories() {
  const memoriesForWall = getVisibleMemories(wallActivePresence);
  if (wallActivePresence === "earth") return memoriesForWall;
  return memoriesForWall.filter((memory) => {
    return wallActiveRegion === "all" || memory.region === wallActiveRegion;
  });
}

function updateWallStats() {
  if (!wallStarCountEl || !wallLightTotalEl) return;

  const wallMemories = getWallMemories();
  const allMemories = getVisibleMemories(wallActivePresence);

  wallStarCountEl.textContent = wallMemories.length;

  let totalLights = 0;
  const lights = getWallLights();
  allMemories.forEach((m) => {
    totalLights += lights[m.id] || 0;
  });
  // 加上后端灯数；种子数据无后端时保留基础灯数
  allMemories.forEach((m, i) => {
    totalLights += m.lightCount || (lights[m.id] ? 0 : 8 + i * 3);
  });
  wallLightTotalEl.textContent = totalLights;
}

function getWallEmptyText() {
  if (wallActivePresence === "earth") {
    return "还没有从地球寄来的故事。";
  }
  return wallActiveRegion === "all"
    ? "纪念星河还没有点亮的小星星。"
    : `「${wallActiveRegion}」星域还没有居民抵达。`;
}

function updateWallListTitle() {
  if (!wallListTitleEl) return;
  wallListTitleEl.textContent = wallActivePresence === "earth"
    ? "还在地球的来信"
    : "已经抵达鼠星的小居民";
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
  updateWallListTitle();

  if (!wallMemories.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = getWallEmptyText();
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

  const copy = getPresenceCopy(memory);
  const safeName = escapeHtml(memory.name);
  const safeNickname = escapeHtml(memory.nickname);
  const safePlace = escapeHtml(getPlaceLabel(memory));
  const safeFood = escapeHtml(memory.food);
  const safePlayerName = escapeHtml(memory.playerName || "本地记录");
  const safeId = escapeHtml(memory.id);
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
        <p class="eyebrow">${safePlace} · ${copy.label}</p>
        <h2>${safeName}</h2>
        <p class="resident-subtitle">${safeNickname} · ${safePlayerName} · ${formatDate(memory.arrivedAt)} ${copy.dateVerb}</p>
        <p class="memory">${safeMemory}</p>
        <ul class="tags">
          <li>爱吃 ${safeFood}</li>
          ${safeTraits.map((trait) => `<li>${trait}</li>`).join("")}
        </ul>
      </div>
    </div>
    <div class="resident-notes">
      <article>
        <span>${copy.earth ? "此刻" : "所在星域"}</span>
        <strong>${safePlace}</strong>
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
        <strong>#${safeId}</strong>
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

  if (id && !memory && !apiResidentsSettled) {
    document.title = "鼠鼠星球 | 正在寻找这颗星";
    singleResidentEl.innerHTML = getResidentLoadingHtml();
    return;
  }

  if (!memory) {
    document.title = "鼠鼠星球 | 没有找到这颗星";
    singleResidentEl.innerHTML = `
      <section class="page-hero compact-hero" aria-labelledby="missing-resident-title">
        <p class="eyebrow">Resident Not Found</p>
        <h1 id="missing-resident-title">没有找到这颗星</h1>
        <p class="lede">这颗星可能来自旧缓存里的示例链接，或者对应档案已经被移除。现在鼠鼠星球只展示真实收录的鼠鼠。</p>
        <a class="button primary" href="./planet-wall.html">回到纪念星河</a>
        <a class="button ghost" href="./earth-letters.html">去地球来信</a>
      </section>
    `;
    return;
  }

  const copy = getPresenceCopy(memory);
  const safeName = escapeHtml(memory.name);
  const safeNickname = escapeHtml(memory.nickname);
  const safePlace = escapeHtml(getPlaceLabel(memory));
  const safeFood = escapeHtml(memory.food);
  const safePlayerName = escapeHtml(memory.playerName || "本地记录");
  const safeId = escapeHtml(memory.id);
  const safeTraits = memory.traits.map(escapeHtml);
  const safeMemory = escapeHtml(memory.memory);
  const starCalendar = getMouseStarCalendar(memory.arrivedAt);
  const lightTotal = Math.max(Number(memory.lightCount || 0), getLightCount(memory.id));
  const safeTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const worldLead = copy.earth
    ? `${safeName} 此刻还在地球。人间的日子慢慢过，故事会先被这颗星球轻轻收着。`
    : `按照鼠星历，${safeName} 正住在「${safePlace}」的 ${escapeHtml(starCalendar.season)} 里。人间每过一个月，鼠星就翻过一天；想念不是倒计时，而是一盏慢慢亮着的灯。`;

  document.title = `鼠鼠星球 | ${memory.name} 的${copy.pageNoun}`;
  singleResidentEl.innerHTML = `
    <section class="single-hero" aria-labelledby="single-resident-title">
      <a class="back-link" href="${getArchiveHome(memory)}">返回${getArchiveHomeLabel(memory)}</a>
      <div class="single-portrait">
        <span class="avatar memorial-avatar" style="background:${memory.color}" aria-hidden="true"></span>
      </div>
      <div class="single-copy">
        <p class="eyebrow">${safePlace} · ${copy.label}</p>
        <h1 id="single-resident-title">${safeName}</h1>
        <p class="resident-subtitle">${safeNickname} · ${safePlayerName} · ${formatDate(memory.arrivedAt)} ${copy.dateVerb}</p>
        <p class="star-calendar-pill">${escapeHtml(starCalendar.label)} · ${escapeHtml(starCalendar.rule)}</p>
        <p class="single-memory">${safeMemory}</p>
        <ul class="tags">
          <li>爱吃 ${safeFood}</li>
          ${safeTraits.map((trait) => `<li>${trait}</li>`).join("")}
        </ul>
        <div class="share-actions" aria-label="${copy.pageNoun}分享操作">
          <button class="button primary resident-light-button" id="resident-light" type="button" aria-pressed="false">${copy.lightButton}</button>
          <button class="button primary" id="copy-share" type="button">复制分享文案</button>
          <button class="button ghost" id="download-card" type="button">生成纪念卡图片</button>
        </div>
        <p class="form-status share-status" id="share-status" aria-live="polite">
          分享文案和纪念卡只在当前浏览器生成，不会上传内容。
        </p>
      </div>
    </section>

    <section class="memorial-note" aria-label="${safeName} 的故事">
      <article>
        <span>${copy.earth ? "此刻" : "所在星域"}</span>
        <strong>${safePlace}</strong>
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
        <strong>#${safeId}</strong>
      </article>
      <article>
        <span>${copy.lightNoun}</span>
        <strong id="resident-light-count">${lightTotal} 盏</strong>
      </article>
      <article>
        <span>鼠星历</span>
        <strong>${escapeHtml(starCalendar.label)}</strong>
      </article>
    </section>

    <section class="world-panel" aria-labelledby="world-title">
      <div>
        <p class="eyebrow">${copy.earth ? "Earth Letter" : "Mouse Star Lore"}</p>
        <h2 id="world-title">${copy.worldTitle}</h2>
        <p>${worldLead}</p>
      </div>
      <div class="world-orbit" aria-hidden="true">
        <span></span>
      </div>
    </section>

    <section class="ritual-panel" aria-labelledby="ritual-title">
      <div>
        <p class="eyebrow">${copy.earth ? "Companion Light" : "Home Star"}</p>
        <h2 id="ritual-title">${copy.ritualTitle}</h2>
        <p>${copy.ritualLead}</p>
      </div>
      <div class="ritual-stars" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <p class="form-status" id="ritual-status" aria-live="polite">${copy.ritualIdle}</p>
    </section>

    <section class="memory-board" aria-labelledby="notes-title">
      <div class="memory-board-head">
        <div>
          <p class="eyebrow">Memory Notes</p>
          <h2 id="notes-title">回忆便签</h2>
        </div>
        <p>匿名、轻声、真诚地留下一句话。</p>
      </div>
      <div class="memory-notes-list" id="resident-notes" aria-live="polite">
        <p class="empty">正在翻找贴在星灯旁的便签。</p>
      </div>
      <form class="note-form" id="resident-note-form">
        <label>
          <span>署名（可留空）</span>
          <input name="author" maxlength="32" placeholder="匿名旅鼠" />
        </label>
        <label class="full-field">
          <span>便签内容</span>
          <textarea name="message" maxlength="280" required placeholder="${copy.notePlaceholder}"></textarea>
        </label>
        <div class="form-actions">
          <button class="button primary" type="submit">贴上便签</button>
        </div>
        <p class="form-status" id="note-status" aria-live="polite">便签会公开显示，请不要留下隐私信息。</p>
      </form>
    </section>

    <section class="time-capsule-panel" aria-labelledby="capsule-title">
      <div>
        <p class="eyebrow">Time Capsule</p>
        <h2 id="capsule-title">时间胶囊</h2>
        <p>把今天没说完的话寄给未来的自己。到日期后，可由服务器定时任务发送邮件。</p>
      </div>
      <form class="capsule-form" id="time-capsule-form">
        <label>
          <span>接收邮箱</span>
          <input name="email" type="email" maxlength="160" required placeholder="you@example.com" />
        </label>
        <label>
          <span>投递日期</span>
          <input name="deliverAt" type="date" min="${safeTomorrow}" required />
        </label>
        <label class="full-field">
          <span>写给未来的话</span>
          <textarea name="message" maxlength="2000" required placeholder="${copy.capsulePlaceholder}"></textarea>
        </label>
        <div class="form-actions">
          <button class="button primary" type="submit">封存时间胶囊</button>
        </div>
        <p class="form-status" id="capsule-status" aria-live="polite">邮箱仅用于这封未来邮件。</p>
      </form>
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
  const ritualStatusEl = singleResidentEl.querySelector("#ritual-status");
  const lightCountEl = singleResidentEl.querySelector("#resident-light-count");
  const lightButtonEl = singleResidentEl.querySelector("#resident-light");
  const notesEl = singleResidentEl.querySelector("#resident-notes");
  const noteStatusEl = singleResidentEl.querySelector("#note-status");
  const capsuleStatusEl = singleResidentEl.querySelector("#capsule-status");
  lightButtonEl?.addEventListener("click", () => {
    lightResident(memory, lightCountEl, lightButtonEl, ritualStatusEl);
  });
  singleResidentEl.querySelector("#copy-share")?.addEventListener("click", () => {
    copyResidentShareText(memory, statusEl);
  });
  singleResidentEl.querySelector("#download-card")?.addEventListener("click", () => {
    downloadResidentCard(memory);
    statusEl.textContent = copy.earth ? "地球来信卡片已生成。" : "纪念卡图片已生成。";
  });
  singleResidentEl.querySelector("#resident-note-form")?.addEventListener("submit", (event) => {
    submitResidentNote(event, memory, notesEl, noteStatusEl);
  });
  singleResidentEl.querySelector("#time-capsule-form")?.addEventListener("submit", (event) => {
    submitTimeCapsule(event, memory, capsuleStatusEl);
  });
  loadResidentNotes(memory, notesEl);
}

function handleHashRoute() {
  const hash = decodeURIComponent(location.hash.replace("#", ""));
  if (!hash.startsWith("resident-")) return;

  const id = hash.replace("resident-", "");
  if (id) openResidentPage(id, false);
}

function setMapSelection(detail = {}) {
  const presence = detail.presence === "earth" ? "earth" : "star";
  mapSelection = presence === "earth"
    ? { presence: "earth", region: null }
    : detail.region
      ? { presence: "star", region: detail.region }
      : null;
  renderMap();
  document.querySelector(".map-region-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function renderSubmissionPreview(event) {
  event.preventDefault();
  if (!submissionForm || !submissionStatusEl) return;

  const data = new FormData(submissionForm);
  const customBreed = submissionForm.elements.breedCustom?.value?.trim();
  if (customBreed) data.set("breed", customBreed);
  const playerName = data.get("playerName").toString().trim();
  const name = data.get("name").toString().trim();
  const arrivedAt = data.get("arrivedAt").toString();
  const memory = data.get("memory").toString().trim();
  const publicConsent = data.get("publicConsent") === "on";
  const presence = data.get("presence") === "earth" ? "earth" : "star";
  const dateLabel = presence === "earth" ? "相遇日期" : "抵达日期";

  if (!playerName || !name || !arrivedAt || !memory) {
    submissionStatusEl.hidden = false;
    submissionStatusEl.textContent = `请填写玩家昵称、鼠鼠名字、${dateLabel}和故事。`;
    submissionStatusEl.className = "form-status error";
    return;
  }

  submissionStatusEl.hidden = false;
  submissionStatusEl.textContent = "正在送往鼠鼠星球……";
  submissionStatusEl.className = "form-status";

  try {
    if (adminEditRecord) {
      const secondaryPassword = document.querySelector("#admin-secondary-password")?.value || "";
      if (!secondaryPassword) {
        throw new Error("请输入管理员二级密码后再保存。");
      }
      data.set("existingPhotos", JSON.stringify(adminExistingPhotos.filter(Boolean)));
      data.set("existingSpreadImage", adminExistingSpreadImage);
      data.set("publicConsent", submissionForm.elements.publicConsent?.checked ? "true" : "false");
      const response = await fetch(`${apiBase}/admin/submissions/${encodeURIComponent(adminEditRecord.id)}`, {
        method: "PUT",
        headers: {
          "x-admin-token": getAdminToken(),
          "x-admin-secondary-password": secondaryPassword,
        },
        body: data,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "档案保存失败。");
      submissionStatusEl.textContent = "档案已保存，公开页面也已同步更新。";
      submissionStatusEl.className = "form-status success";
      adminEditRecord = result.submission || adminEditRecord;
      document.querySelector("#admin-secondary-password").value = "";
      return;
    }

    const response = await fetch(`${apiBase}/submissions`, {
      method: "POST",
      body: data,
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "提交失败。");
    }

    submissionStatusEl.hidden = false;
    submissionStatusEl.textContent = publicConsent
      ? `已提交！档案编号 ${result.id}。审核通过后会出现在${presence === "earth" ? "地球来信" : "纪念星河"}。`
      : `已保存（编号 ${result.id}），但你未勾选同意公开展示，管理员无法审核通过。`;
    submissionStatusEl.className = "form-status success";
    submissionForm.reset();
    syncSubmissionPresenceCopy();
    // 清除照片预览
    document.querySelectorAll(".photo-drop").forEach((drop) => {
      const input = drop.querySelector('input[type="file"]');
      const placeholder = drop.querySelector(".photo-placeholder");
      const preview = drop.querySelector(".photo-preview");
      const removeBtn = drop.querySelector(".photo-remove");
      if (input) input.value = "";
      if (preview) { preview.src = ""; preview.hidden = true; }
      if (placeholder) placeholder.hidden = false;
      if (removeBtn) removeBtn.hidden = true;
    });
  } catch (error) {
    submissionStatusEl.hidden = false;
    submissionStatusEl.textContent = error.message || "后端暂时不可用，请稍后再试。";
    submissionStatusEl.className = "form-status error";
  }
}

function setSubmissionField(name, value) {
  const field = submissionForm?.elements[name];
  if (!field) return;
  field.value = value == null ? "" : value;
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function setAdminPhotoPreview(field, url) {
  const drop = field?.closest(".photo-drop");
  if (!drop || !url) return;
  const preview = drop.querySelector(".photo-preview");
  const placeholder = drop.querySelector(".photo-placeholder");
  const removeButton = drop.querySelector(".photo-remove");
  preview.src = url;
  preview.hidden = false;
  placeholder.hidden = true;
  removeButton.hidden = false;
}

function fillAdminSubmission(record) {
  adminEditRecord = record;
  adminExistingPhotos = Array.isArray(record.photos) ? [...record.photos] : [];
  adminExistingSpreadImage = record.spreadImage || "";
  setSubmissionField("presence", record.presence);
  setSubmissionField("playerName", record.playerName);
  setSubmissionField("name", record.name);
  setSubmissionField("arrivedAt", formatDateInput(record.arrivedAt));
  setSubmissionField("breed", record.breed);
  setSubmissionField("nickname", record.nickname);
  setSubmissionField("douyin", record.douyin);
  setSubmissionField("xiaohongshu", record.xiaohongshu);
  setSubmissionField("bilibili", record.bilibili);
  setSubmissionField("region", record.region);
  setSubmissionField("food", record.food);
  setSubmissionField("traits", (record.traits || []).join("，"));
  setSubmissionField("color", record.color || "#8fd2c8");
  setSubmissionField("memory", record.memory);
  if (submissionForm.elements.publicConsent) submissionForm.elements.publicConsent.checked = Boolean(record.publicConsent);
  ["confirm", "originalConfirm"].forEach((name) => {
    const field = submissionForm.elements[name];
    if (field) {
      field.checked = true;
      field.disabled = true;
    }
  });

  const category = document.querySelector("#breed-category");
  const breedSelect = document.querySelector("#breed-select");
  const breedCustom = document.querySelector("#breed-custom");
  if (category && breedSelect) {
    const categoryOptions = [...category.options];
    const matchingCategory = categoryOptions.find((option) => option.value && record.breed && record.breed.includes(option.value.split("（")[0]));
    category.value = matchingCategory?.value || "其他";
    category.dispatchEvent(new Event("change", { bubbles: true }));
    if (category.value === "其他" && breedCustom) {
      breedCustom.value = record.breed || "";
      breedCustom.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      breedSelect.value = record.breed || "";
      breedSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  document.querySelectorAll('.photo-field:not(.spread-field) input[type="file"]').forEach((field, index) => {
    if (adminExistingPhotos[index]) setAdminPhotoPreview(field, adminExistingPhotos[index]);
  });
  const spreadInput = document.querySelector(".spread-field input[type=\"file\"]");
  if (adminExistingSpreadImage) setAdminPhotoPreview(spreadInput, adminExistingSpreadImage);
  syncSubmissionPresenceCopy();
  document.querySelector("#admin-edit-banner").hidden = false;
  document.querySelector("#admin-edit-record").textContent = `投稿编号：${record.id}${record.residentPublicId ? ` · 档案编号：${record.residentPublicId}` : ""}`;
  document.querySelector("#admin-secondary-panel").hidden = false;
  document.querySelector("#admin-delete-submission").hidden = false;
  document.querySelector("#submission-submit").textContent = "保存管理员修改";
  document.querySelector("#submission-reset").hidden = true;
  document.querySelector("#public-consent-text").closest(".consent-check").hidden = true;
  document.title = `鼠鼠星球 | 编辑 ${record.name}`;
}

async function loadAdminSubmission() {
  if (!adminEditId || !submissionForm) return;
  const token = getAdminToken();
  if (!token) {
    submissionStatusEl.hidden = false;
    submissionStatusEl.textContent = "请先从审核后台登录，再打开编辑页面。";
    submissionStatusEl.className = "form-status error";
    submissionForm.querySelectorAll("input, select, textarea, button").forEach((field) => { field.disabled = true; });
    return;
  }
  try {
    const response = await fetch(`${apiBase}/admin/submissions/${encodeURIComponent(adminEditId)}`, {
      headers: { "x-admin-token": token },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "档案读取失败。");
    fillAdminSubmission(result.submission);
  } catch (error) {
    submissionStatusEl.hidden = false;
    submissionStatusEl.textContent = error.message;
    submissionStatusEl.className = "form-status error";
  }
}

async function deleteAdminSubmission() {
  if (!adminEditRecord) return;
  if (!window.confirm(`确定删除「${adminEditRecord.name}」吗？\n这会同时删除公开档案、便签、点灯和时间胶囊，且无法恢复。`)) return;
  const secondaryPassword = document.querySelector("#admin-secondary-password")?.value || "";
  if (!secondaryPassword) {
    submissionStatusEl.hidden = false;
    submissionStatusEl.textContent = "请输入管理员二级密码后再删除。";
    submissionStatusEl.className = "form-status error";
    return;
  }
  const response = await fetch(`${apiBase}/admin/submissions/${encodeURIComponent(adminEditRecord.id)}`, {
    method: "DELETE",
    headers: {
      "x-admin-token": getAdminToken(),
      "x-admin-secondary-password": secondaryPassword,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    submissionStatusEl.hidden = false;
    submissionStatusEl.textContent = result.error || "删除失败。";
    submissionStatusEl.className = "form-status error";
    return;
  }
  location.href = "./_review.html";
}

function syncSubmissionPresenceCopy() {
  if (!submissionForm) return;

  const presence = submissionForm.elements.presence?.value === "earth" ? "earth" : "star";
  const earth = presence === "earth";
  const dateLabel = document.querySelector("#arrived-at-label");
  const dateHint = document.querySelector("#arrived-at-hint");
  const regionField = document.querySelector("#region-field");
  const regionSelect = submissionForm.elements.region;
  const memoryLabel = document.querySelector("#memory-label");
  const memoryField = submissionForm.elements.memory;
  const consentText = document.querySelector("#public-consent-text");
  const confirmText = document.querySelector("#confirm-text");

  if (dateLabel) dateLabel.textContent = earth ? "来到我身边的日子" : "抵达鼠星日期";
  if (dateHint) {
    dateHint.textContent = earth
      ? "写下你们相遇的日子。这封来信会先被星球轻轻收着。"
      : "写下它抵达鼠星的日子。想念会在这里慢慢变成星光。";
  }
  if (regionField) regionField.hidden = earth;
  if (regionSelect) {
    regionSelect.disabled = earth;
    regionSelect.required = !earth;
    regionSelect.dispatchEvent(new Event("disabled-change"));
  }
  if (memoryLabel) memoryLabel.textContent = earth ? "此刻想分享的故事" : "鼠鼠和我的故事";
  if (memoryField) {
    memoryField.placeholder = earth
      ? "写下此刻的它。它怎么来到你身边的？有什么小习惯？今天最想被记住的瞬间是什么？"
      : "写下你和鼠鼠之间最难忘的故事。它怎么来到你身边的？它有什么小习惯？它最喜欢做什么？那些闪闪发亮的小瞬间，都值得被记住……";
  }
  if (consentText) {
    consentText.textContent = earth
      ? "我同意将这封地球来信公开展示在地球来信页。未勾选将无法通过审核。"
      : "我同意将这份档案公开展示在纪念星河。未勾选将无法通过审核。";
  }
  if (confirmText) {
    confirmText.textContent = earth
      ? "我确认以上信息真实，并理解提交后将进入待审核状态，审核通过后会作为地球来信公开展示。"
      : "我确认以上信息真实，并理解提交后将进入待审核状态，审核通过后公开展示在纪念星河。";
  }
}

function resetSubmissionPreview() {
  if (!submissionStatusEl) return;

  submissionStatusEl.hidden = true;
  submissionStatusEl.textContent = "";
  submissionStatusEl.className = "form-status";

  // 清除所有照片预览
  document.querySelectorAll(".photo-drop").forEach((drop) => {
    const input = drop.querySelector('input[type="file"]');
    const placeholder = drop.querySelector(".photo-placeholder");
    const preview = drop.querySelector(".photo-preview");
    const removeBtn = drop.querySelector(".photo-remove");
    if (input) input.value = "";
    if (preview) { preview.src = ""; preview.hidden = true; }
    if (placeholder) placeholder.hidden = false;
    if (removeBtn) removeBtn.hidden = true;
  });
}

function renderTimeline() {
  if (!timelineContainerEl) return;

  const residents = getVisibleMemories("star");

  if (!residents.length) {
    timelineContainerEl.innerHTML = `<p class="empty">时光轴上还没有记录。等故事被收下之后，这里会亮起来。</p>`;
    return;
  }

  const sorted = [...residents].sort(
    (a, b) => new Date(b.arrivedAt) - new Date(a.arrivedAt)
  );

  // 按年份分组
  const groups = new Map();
  sorted.forEach((m) => {
    const year = new Date(m.arrivedAt).getFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(m);
  });

  const years = [...groups.keys()].sort((a, b) => b - a);

  let html = "";
  years.forEach((year) => {
    html += `<div class="timeline-year"><span class="timeline-year-label">${year} 年</span></div>`;
    const entries = groups.get(year);
    entries.forEach((m, i) => {
      const side = i % 2 === 0 ? "left" : "right";
      const copy = getPresenceCopy(m);
      const safeName = escapeHtml(m.name);
      const safeNickname = escapeHtml(m.nickname);
      const safeMemory = escapeHtml(m.memory);
      const shortMemory = safeMemory.length > 60 ? safeMemory.slice(0, 60) + "……" : safeMemory;

      html += `
        <div class="timeline-entry ${side}">
          <div class="timeline-dot" style="background:${m.color}" aria-hidden="true"></div>
          <a class="timeline-card" href="./resident.html?id=${encodeURIComponent(m.id)}">
            <span class="timeline-date">${formatDate(m.arrivedAt)} · ${copy.label}</span>
            <div class="timeline-card-top">
              <span class="avatar" style="background:${m.color}" aria-hidden="true"></span>
              <div>
                <h3>${safeName}</h3>
                <small>${safeNickname} · ${escapeHtml(getPlaceLabel(m))}</small>
              </div>
            </div>
            <p class="timeline-memory">${shortMemory}</p>
          </a>
        </div>`;
    });
  });

  timelineContainerEl.innerHTML = html;
}

function renderAll() {
  renderStats();
  renderMap();
  renderTimeline();
  renderWall();
  renderSingleResidentPage();
}

wallFilterButtons.forEach((button) => {
  button.addEventListener("click", () => setWallFilter(button.dataset.wallFilter));
});

submissionForm?.addEventListener("submit", renderSubmissionPreview);
submissionForm?.addEventListener("reset", resetSubmissionPreview);
window.addEventListener("hashchange", handleHashRoute);

// 星球地图：监听鼠星区域或地球点击
document.addEventListener("planet:region-click", (event) => {
  setMapSelection(event.detail || {});
});

// 照片上传：点击区域触发文件选择，预览图片，支持拖拽
document.querySelectorAll(".photo-drop").forEach((drop) => {
  const input = drop.querySelector('input[type="file"]');
  const placeholder = drop.querySelector(".photo-placeholder");
  const preview = drop.querySelector(".photo-preview");
  const removeBtn = drop.querySelector(".photo-remove");

  if (!input) return;

  // 点击上传区域
  drop.addEventListener("click", (e) => {
    if (e.target === removeBtn) return;
    input.click();
  });

  // 文件选择后预览
  input.addEventListener("change", () => {
    const file = input.files[0];
    const statusEl = drop.parentElement?.querySelector(".spread-status");
    if (statusEl) {
      statusEl.hidden = true;
      statusEl.textContent = "";
    }
    if (!file) return;

    if (adminEditRecord) {
      if (drop.closest(".spread-field")) adminExistingSpreadImage = "";
      else {
        const index = Number(input.dataset.photoIndex);
        adminExistingPhotos[index] = "";
      }
    }

    const requiredSize = input.dataset.requiredSize;
    const showPreview = () => {
      const reader = new FileReader();
      reader.onload = () => {
        if (preview) {
          preview.src = reader.result;
          preview.hidden = false;
        }
        if (placeholder) placeholder.hidden = true;
        if (removeBtn) removeBtn.hidden = false;
      };
      reader.readAsDataURL(file);
    };

    if (!requiredSize) {
      showPreview();
      return;
    }

    const [requiredWidth, requiredHeight] = requiredSize.split("x").map(Number);
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (image.naturalWidth !== requiredWidth || image.naturalHeight !== requiredHeight) {
        input.value = "";
        if (preview) {
          preview.src = "";
          preview.hidden = true;
        }
        if (placeholder) placeholder.hidden = false;
        if (removeBtn) removeBtn.hidden = true;
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = `这张图是 ${image.naturalWidth}×${image.naturalHeight}，必须正好是 ${requiredWidth}×${requiredHeight}。`;
        }
        return;
      }
      showPreview();
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      input.value = "";
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "无法读取这张图片，请换一张再试。";
      }
    };
    image.src = objectUrl;
  });

  // 移除照片
  if (removeBtn) {
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      input.value = "";
      if (preview) {
        preview.src = "";
        preview.hidden = true;
      }
      if (placeholder) placeholder.hidden = false;
      if (removeBtn) removeBtn.hidden = true;
      if (adminEditRecord) {
        if (drop.closest(".spread-field")) adminExistingSpreadImage = "";
        else {
          const index = Number(input.dataset.photoIndex);
          adminExistingPhotos[index] = "";
        }
      }
    });
  }

  // 拖拽支持
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("drag-over");
  });
  drop.addEventListener("dragleave", () => {
    drop.classList.remove("drag-over");
  });
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("change"));
  });
});

// 鼠鼠种类级联下拉
(function initBreedCascade() {
  const breedCategory = document.querySelector("#breed-category");
  const breedSelect = document.querySelector("#breed-select");
  const breedCustom = document.querySelector("#breed-custom");

  if (!breedCategory || !breedSelect) return;

  const breedMap = {
    "叙利亚仓鼠（金丝熊）": ["金丝熊", "黑熊", "白熊", "米熊", "眼圈熊", "花仓", "奶牛仓鼠", "象牙白", "卷毛熊", "长毛熊", "短毛熊", "金狐", "琥珀"],
    "加卡利亚仓鼠（三线）": ["三线仓鼠", "银狐仓鼠", "布丁仓鼠", "奶茶仓鼠", "紫仓", "蓝宝石仓鼠", "冬白"],
    "坎贝尔仓鼠（一线）": ["一线仓鼠", "斑块一线", "紫衣一线", "暗化一线"],
    "罗伯罗夫斯基仓鼠（公婆）": ["老婆婆仓鼠", "公公仓鼠"],
  };

  breedCategory.addEventListener("change", () => {
    const category = breedCategory.value;
    breedSelect.innerHTML = "";

    if (category === "其他") {
      breedSelect.innerHTML = '<option value="">手动输入</option>';
      breedSelect.disabled = true;
      if (breedCustom) {
        breedCustom.style.display = "block";
        breedCustom.value = "";
        breedCustom.focus();
      }
    } else if (breedMap[category]) {
      breedSelect.disabled = false;
      if (breedCustom) breedCustom.style.display = "none";
      breedSelect.appendChild(new Option("请选择具体品种", ""));
      breedMap[category].forEach((breed) => {
        breedSelect.appendChild(new Option(breed, breed));
      });
    } else {
      breedSelect.disabled = true;
      if (breedCustom) breedCustom.style.display = "none";
      breedSelect.innerHTML = '<option value="">请先选择大类</option>';
    }
  });

  // 选择"其他"时的手动输入同步到 breed 字段
  if (breedCustom) {
    breedCustom.addEventListener("input", () => {
      // 动态更新 breed select 的值用于表单提交
      const customBreed = breedCustom.value.trim();
      if (!customBreed) {
        breedSelect.replaceChildren(new Option("手动输入", ""));
        return;
      }

      if (breedSelect.value !== customBreed) {
        breedSelect.replaceChildren(new Option(customBreed, customBreed, true, true));
      }
    });
  }
})();
submissionForm?.elements.presence?.addEventListener("change", syncSubmissionPresenceCopy);
syncSubmissionPresenceCopy();
document.querySelector("#admin-delete-submission")?.addEventListener("click", () => {
  deleteAdminSubmission().catch((error) => {
    submissionStatusEl.hidden = false;
    submissionStatusEl.textContent = error.message || "删除失败。";
    submissionStatusEl.className = "form-status error";
  });
});
loadAdminSubmission();


// 初始化自定义下拉组件（所有 select 统一替换原生外观）
document.querySelectorAll("select").forEach((sel) => initCustomSelect(sel));

renderAll();
handleHashRoute();
loadGuardians();
loadApiResidents();
