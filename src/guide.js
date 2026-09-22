(function () {
  "use strict";

  const data = window.shushuGuides;
  if (!data || !Array.isArray(data.articles)) return;

  const articleById = new Map(data.articles.map((article) => [article.id, article]));
  const categoryById = new Map(data.categories.map((category) => [category.id, category.name]));
  const typeLabels = { official: "站方指南", curated: "精选分享" };
  const riskLabels = { routine: "日常照护", attention: "建议咨询", urgent: "尽快就医" };
  const riskClasses = { routine: "is-routine", attention: "is-attention", urgent: "is-urgent" };

  const text = (value) => document.createTextNode(value || "");
  const el = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.append(text(String(content)));
    return node;
  };

  function createArticleCard(article) {
    const link = el("a", "guide-card");
    link.href = `./guide-article.html?id=${encodeURIComponent(article.id)}`;
    link.append(
      el("div", "guide-card-meta", `${typeLabels[article.type] || "资料"} · ${categoryById.get(article.category) || "其他"}`),
      el("h3", "", article.title),
      el("p", "guide-card-summary", article.summary),
    );
    const footer = el("div", "guide-card-footer");
    footer.append(el("span", "guide-card-author", article.author), el("span", `guide-risk ${riskClasses[article.riskLevel] || ""}`, riskLabels[article.riskLevel] || "请核查"));
    link.append(footer);
    return link;
  }

  function renderHome() {
    const path = document.querySelector("#guide-path");
    const cards = document.querySelector("#guide-cards");
    if (!path || !cards) return;

    path.replaceChildren();
    data.beginnerPath.forEach((id, index) => {
      const article = articleById.get(id);
      if (!article) return;
      const item = el("li", "guide-path-item");
      const link = el("a", "guide-path-link");
      link.href = `./guide-article.html?id=${encodeURIComponent(article.id)}`;
      link.append(el("span", "guide-path-number", String(index + 1).padStart(2, "0")), el("span", "guide-path-copy", article.title));
      item.append(link);
      path.append(item);
    });

    const search = document.querySelector("#guide-search");
    const typeFilters = document.querySelector("#guide-type-filters");
    const categoryFilters = document.querySelector("#guide-category-filters");
    const resultCount = document.querySelector("#guide-result-count");
    const state = { query: "", type: "all", category: "all" };

    function addFilter(container, label, value, group) {
      const button = el("button", `guide-filter ${value === "all" ? "is-selected" : ""}`, label);
      button.type = "button";
      button.dataset.value = value;
      button.addEventListener("click", () => {
        state[group] = value;
        container.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item.dataset.value === value));
        renderCards();
      });
      container.append(button);
    }

    addFilter(typeFilters, "全部", "all", "type");
    addFilter(typeFilters, "站方指南", "official", "type");
    addFilter(typeFilters, "精选分享", "curated", "type");
    addFilter(categoryFilters, "全部", "all", "category");
    data.categories.forEach((category) => addFilter(categoryFilters, category.name, category.id, "category"));

    function renderCards() {
      const query = state.query.trim().toLowerCase();
      const results = data.articles.filter((article) => {
        const searchable = [article.title, article.summary, article.author, categoryById.get(article.category), ...(article.tags || [])].join(" ").toLowerCase();
        return (!query || searchable.includes(query)) && (state.type === "all" || article.type === state.type) && (state.category === "all" || article.category === state.category);
      });
      cards.replaceChildren();
      if (!results.length) {
        cards.append(el("p", "empty guide-empty", "没有找到符合条件的内容，可以换个关键词或筛选条件。"));
      } else {
        results.forEach((article) => cards.append(createArticleCard(article)));
      }
      resultCount.textContent = `共 ${results.length} 篇内容`;
    }

    search.addEventListener("input", () => {
      state.query = search.value;
      renderCards();
    });
    renderCards();
  }

  function appendMetadata(parent, article) {
    const metadata = el("div", "guide-article-meta");
    metadata.append(
      el("span", "guide-source-label", typeLabels[article.type] || "资料"),
      el("span", "", `适用：${article.applicableTo}`),
      el("span", "", `阅读约 ${article.readingMinutes} 分钟`),
      el("span", "", `最近核查：${article.reviewedAt}`),
    );
    parent.append(metadata);
  }

  function renderArticle() {
    const target = document.querySelector("#guide-article");
    if (!target) return;
    const id = new URLSearchParams(window.location.search).get("id");
    const article = articleById.get(id);
    if (!article) {
      target.replaceChildren(el("h1", "", "暂时找不到这篇文章"), el("p", "guide-article-lede", "文章链接可能已经更新，先回到照护手册继续浏览吧。"));
      document.title = "鼠鼠星球 | 文章未找到";
      return;
    }

    document.title = `鼠鼠星球 | ${article.title}`;
    target.replaceChildren();
    const heading = el("header", "guide-article-header");
    heading.append(el("p", "eyebrow", `${typeLabels[article.type] || "资料"} · ${categoryById.get(article.category) || "其他"}`), el("h1", "", article.title), el("p", "guide-article-lede", article.summary));
    appendMetadata(heading, article);
    target.append(heading);

    const risk = el("aside", `guide-risk-panel ${riskClasses[article.riskLevel] || ""}`);
    risk.append(el("strong", "", riskLabels[article.riskLevel] || "请核查"), el("span", "", "内容仅供照护参考，不能替代具备资质的异宠兽医诊断与治疗。"));
    target.append(risk);

    const content = el("div", "guide-article-content");
    if (article.type === "curated") {
      content.append(el("p", "guide-curated-intro", "这里仅展示站方摘要与推荐语，分享全文请前往原作者页面阅读。"));
    }
    (article.sections || []).forEach((section) => {
      const block = el("section", "guide-article-section");
      block.append(el("h2", "", section.heading));
      section.paragraphs.forEach((paragraph) => block.append(el("p", "", paragraph)));
      content.append(block);
    });
    target.append(content);

    const source = el("section", "guide-source");
    source.append(
      el("h2", "", "来源与说明"),
      el("p", "", `作者或整理者：${article.author} · 首次收录：${article.publishedAt}`),
      el("p", "", `出处：${article.sourceName || "待核查"}`),
      el("p", "", `收录方式：${article.copyrightMode === "curated-link" ? "站方摘要与原文链接" : article.copyrightMode === "licensed" ? "经授权转载" : "站方原创"}`),
      el("p", "", article.editorNote),
    );
    if (!article.sourceUrl && (!article.references || !article.references.length)) {
      source.append(el("p", "guide-draft-note", "当前为站方结构示例，正式发布前需要完成事实核查。"));
    }
    if (article.references && article.references.length) {
      source.append(el("h3", "", "参考资料"));
      const list = el("ul", "guide-references");
      article.references.forEach((reference) => {
        const item = el("li");
        if (reference.url && /^https?:\/\//i.test(reference.url)) {
          const link = el("a", "", reference.title);
          link.href = reference.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          item.append(link);
        } else {
          item.append(text(reference.title));
        }
        list.append(item);
      });
      source.append(list);
    }
    if (article.type === "curated" && article.sourceUrl && /^https?:\/\//i.test(article.sourceUrl)) {
      const action = el("div", "guide-source-action");
      const link = el("a", "button ghost", "阅读作者原文 ↗");
      link.href = article.sourceUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      action.append(link);
      source.append(action);
    }
    target.append(source);

    const related = document.querySelector("#guide-related");
    const relatedCards = document.querySelector("#guide-related-cards");
    const relatedArticles = article.relatedIds.map((relatedId) => articleById.get(relatedId)).filter(Boolean);
    if (relatedArticles.length) {
      related.hidden = false;
      relatedCards.replaceChildren(...relatedArticles.map(createArticleCard));
    }
  }

  if (document.body.dataset.guideView === "article") renderArticle();
  else renderHome();
})();