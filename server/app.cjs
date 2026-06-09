const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const {
  createSubmission,
  getPublicResident,
  listPublicResidents,
  listSubmissions,
  reviewSubmission,
} = require("./repositories.cjs");

dotenv.config();

const app = express();
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

app.use(express.json({ limit: "1mb" }));
app.use((request, response, next) => {
  const blockedPaths = [
    /^\/server(?:\/|$)/,
    /^\/node_modules(?:\/|$)/,
    /^\/package(?:-lock)?\.json$/,
  ];

  if (blockedPaths.some((pattern) => pattern.test(request.path))) {
    response.status(404).end();
    return;
  }

  next();
});
app.use(express.static(root, {
  dotfiles: "ignore",
  extensions: ["html"],
  setHeaders(response, filePath) {
    if (filePath.endsWith(".html")) {
      response.setHeader("Cache-Control", "no-store");
    }
  },
}));

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function cleanText(value, maxLength, fallback = "") {
  const text = value == null ? fallback : value.toString().trim();
  return text.slice(0, maxLength);
}

function normalizeTraits(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item, 24)).filter(Boolean).slice(0, 8);
  }

  return cleanText(value, 120)
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeSubmissionPayload(body) {
  const payload = {
    playerName: cleanText(body.playerName, 40),
    name: cleanText(body.name, 32),
    nickname: cleanText(body.nickname, 40, "新来的星星"),
    region: ["月光谷", "瓜子环", "棉花云"].includes(body.region) ? body.region : "月光谷",
    arrivedAt: cleanText(body.arrivedAt, 10),
    food: cleanText(body.food, 40, "小零食"),
    color: /^#[0-9a-fA-F]{6}$/.test(body.color || "") ? body.color : "#8fd2c8",
    traits: normalizeTraits(body.traits),
    memory: cleanText(body.memory, 500),
    photos: Array.isArray(body.photos) ? body.photos.slice(0, 6) : [],
    publicConsent: Boolean(body.publicConsent),
  };

  if (!payload.playerName) return { error: "请填写玩家昵称。" };
  if (!payload.name) return { error: "请填写鼠鼠名字。" };
  if (!payload.arrivedAt || Number.isNaN(Date.parse(payload.arrivedAt))) {
    return { error: "请填写有效的抵达鼠星日期。" };
  }
  if (!payload.memory) return { error: "请写下一段纪念。" };

  return { payload };
}

function requireAdmin(request, response, next) {
  const token = request.get("x-admin-token");

  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    response.status(401).json({ error: "没有审核权限。" });
    return;
  }

  next();
}

app.get("/api/health", asyncRoute(async (_request, response) => {
  response.json({ ok: true, service: "shushu-planet" });
}));

app.get("/api/residents", asyncRoute(async (_request, response) => {
  const residents = await listPublicResidents();
  response.json({ residents });
}));

app.get("/api/residents/:id", asyncRoute(async (request, response) => {
  const resident = await getPublicResident(request.params.id);

  if (!resident) {
    response.status(404).json({ error: "没有找到这位鼠鼠。" });
    return;
  }

  response.json({ resident });
}));

app.post("/api/submissions", asyncRoute(async (request, response) => {
  const { error, payload } = normalizeSubmissionPayload(request.body || {});

  if (error) {
    response.status(400).json({ error });
    return;
  }

  const id = await createSubmission(payload);
  response.status(201).json({
    id,
    status: "pending",
    message: "投稿草稿已进入待审核状态。",
  });
}));

app.get("/api/admin/submissions", requireAdmin, asyncRoute(async (request, response) => {
  const submissions = await listSubmissions(request.query.status || "pending");
  response.json({ submissions });
}));

app.post("/api/admin/submissions/:id/review", requireAdmin, asyncRoute(async (request, response) => {
  const action = request.body?.action === "reject" ? "reject" : "approve";
  const reviewerNote = cleanText(request.body?.reviewerNote, 255);
  const submission = await reviewSubmission(request.params.id, action, reviewerNote);

  if (!submission) {
    response.status(404).json({ error: "没有找到这份投稿。" });
    return;
  }

  response.json({ submission });
}));

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "鼠鼠星球暂时有点忙，请稍后再试。" });
});

app.listen(port, host, () => {
  console.log(`鼠鼠星球网站已启动: http://${host}:${port}/`);
});
