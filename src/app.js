const cardsEl = document.querySelector("#cards");
const searchInput = document.querySelector("#search-input");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const totalCountEl = document.querySelector("#total-count");
const favoriteFoodEl = document.querySelector("#favorite-food");
const latestArrivalEl = document.querySelector("#latest-arrival");
const form = document.querySelector("#memory-form");
const clearLocalButton = document.querySelector("#clear-local");
const residentDetailEl = document.querySelector("#resident-detail");
const mapZoneButtons = [...document.querySelectorAll("[data-map-region]")];
const mapRegionNameEl = document.querySelector("#map-region-name");
const mapRegionTitleEl = document.querySelector("#map-region-title");
const mapRegionCopyEl = document.querySelector("#map-region-copy");
const mapResidentsEl = document.querySelector("#map-residents");
const dialog = document.querySelector("#detail-dialog");
const detailContent = document.querySelector("#detail-content");
const closeDialogButton = document.querySelector(".close");
const localStorageKey = "shushu-planet.memories.v1";
const defaultRegion = "月光谷";

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

const seedMemories = [
  {
    id: 1,
    name: "芝麻",
    nickname: "黑芝麻汤圆",
    region: "月光谷",
    arrivedAt: "2024-11-02",
    food: "小米穗",
    color: "#3b2f2f",
    traits: ["胆小", "爱囤粮", "会把纸巾做成被子"],
    memory: "它总是把最喜欢的小米穗拖进窝里，露出半截尾巴，以为谁都看不见。",
  },
  {
    id: 2,
    name: "奶盖",
    nickname: "盖盖",
    region: "瓜子环",
    arrivedAt: "2025-03-18",
    food: "南瓜籽",
    color: "#f3dfc0",
    traits: ["亲人", "爱跑轮", "听见袋子声会冲出来"],
    memory: "它跑轮的时候像一颗小小的行星，认真、热烈，整个夜晚都被它转亮了。",
  },
  {
    id: 3,
    name: "团子",
    nickname: "白糯米",
    region: "棉花云",
    arrivedAt: "2025-08-09",
    food: "冻干豆腐",
    color: "#f8f1e8",
    traits: ["慢吞吞", "爱睡", "喜欢把脸埋进木屑"],
    memory: "团子睡醒时会迷迷糊糊地坐着，像刚从云里滚出来的一小团月光。",
  },
  {
    id: 4,
    name: "栗子",
    nickname: "小栗",
    region: "瓜子环",
    arrivedAt: "2026-01-21",
    food: "苹果干",
    color: "#9f6a45",
    traits: ["机灵", "越狱高手", "会认真洗脸"],
    memory: "它每次洗脸都像在准备一场重要会面，胡须一抖一抖，郑重得让人想笑。",
  },
  {
    id: 5,
    name: "小星星",
    nickname: "星宝",
    region: "月光谷",
    arrivedAt: "2026-05-12",
    food: "燕麦片",
    color: "#c8b7a6",
    traits: ["温柔", "爱钻袖口", "喜欢安静听人说话"],
    memory: "它趴在掌心的时候很轻，像有一颗小星星短暂停在了这里。",
  },
];

let memories = loadMemories();
let activeRegion = "all";
let activeMapRegion = defaultRegion;

function loadMemories() {
  try {
    const saved = JSON.parse(localStorage.getItem(localStorageKey) || "[]");
    if (!Array.isArray(saved)) return [...seedMemories];
    return [...saved, ...seedMemories];
  } catch {
    return [...seedMemories];
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

function getResidentSlug(memory) {
  return `resident-${memory.id}`;
}

function getSearchText(memory) {
  return [
    memory.name,
    memory.nickname,
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
    button.classList.toggle("active", button.dataset.mapRegion === activeMapRegion);
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
      <li>${safeFood}</li>
      ${safeTraits.slice(0, 2).map((trait) => `<li>${trait}</li>`).join("")}
    </ul>
    <p class="memory">${safeMemory}</p>
    <button class="button ghost" type="button" data-id="${memory.id}">查看详情页</button>
  `;

  article.querySelector("button").addEventListener("click", () => openResidentPage(memory.id));
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

function openResidentPage(id, shouldUpdateHash = true) {
  if (!residentDetailEl) {
    window.location.href = `./residents.html#resident-${id}`;
    return;
  }

  const memory = memories.find((item) => item.id === id);
  if (!memory) return;

  const safeName = escapeHtml(memory.name);
  const safeNickname = escapeHtml(memory.nickname);
  const safeRegion = escapeHtml(memory.region);
  const safeFood = escapeHtml(memory.food);
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
        <p class="resident-subtitle">${safeNickname} · ${formatDate(memory.arrivedAt)} 抵达鼠星</p>
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

  const id = Number(hash.replace("resident-", ""));
  if (Number.isFinite(id)) openResidentPage(id, false);
}

function openDetail(id) {
  if (!dialog || !detailContent) return;

  const memory = memories.find((item) => item.id === id);
  if (!memory) return;

  const safeName = escapeHtml(memory.name);
  const safeNickname = escapeHtml(memory.nickname);
  const safeRegion = escapeHtml(memory.region);
  const safeFood = escapeHtml(memory.food);
  const safeTraits = memory.traits.map(escapeHtml);
  const safeMemory = escapeHtml(memory.memory);

  detailContent.innerHTML = `
    <article class="detail">
      <span class="avatar" style="background:${memory.color}" aria-hidden="true"></span>
      <h3>${safeName}</h3>
      <p>${safeNickname} · ${safeRegion} · ${formatDate(memory.arrivedAt)}</p>
      <ul class="tags">
        <li>爱吃 ${safeFood}</li>
        ${safeTraits.map((trait) => `<li>${trait}</li>`).join("")}
      </ul>
      <p class="memory">${safeMemory}</p>
    </article>
  `;
  dialog.showModal();
}

function setActiveFilter(region) {
  if (!filterButtons.length) return;

  activeRegion = region;
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === activeRegion);
  });
  renderCards();
}

function setMapRegion(region) {
  activeMapRegion = region;
  renderMap();
  document.querySelector("#planet-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function addMemory(event) {
  event.preventDefault();
  const data = new FormData(form);
  const name = data.get("name").toString().trim();
  const food = data.get("food").toString().trim() || "小零食";
  const memory = data.get("memory").toString().trim();

  if (!name || !memory) return;

  memories = [
    {
      id: Date.now(),
      name,
      nickname: "新来的星星",
      region: data.get("region").toString(),
      arrivedAt: new Date().toISOString().slice(0, 10),
      food,
      color: ["#8fd2c8", "#e98f73", "#f2c36b", "#8a6aa8"][memories.length % 4],
      traits: ["被认真记住", "有自己的小星光"],
      memory,
      saved: true,
    },
    ...memories,
  ];

  saveMemories();
  form.reset();
  searchInput.value = "";
  setActiveFilter("all");
  renderStats();
  renderMap();
  document.querySelector("#archive")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearLocalMemories() {
  localStorage.removeItem(localStorageKey);
  memories = [...seedMemories];
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
clearLocalButton?.addEventListener("click", clearLocalMemories);
mapZoneButtons.forEach((button) => {
  button.addEventListener("click", () => setMapRegion(button.dataset.mapRegion));
});
window.addEventListener("hashchange", handleHashRoute);
closeDialogButton?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

renderStats();
renderMap();
renderCards();
handleHashRoute();
