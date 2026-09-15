const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const multer = require("multer");
const dotenv = require("dotenv");
const {
  addResidentLight,
  createResidentNote,
  createSubmission,
  createTimeCapsule,
  getPublicResident,
  listAdminResidentNotes,
  listResidentNotes,
  listPublicResidents,
  listSubmissions,
  reviewResidentNote,
  reviewSubmission,
} = require("./repositories.cjs");

dotenv.config();

const app = express();
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const uploadMaxFileSizeMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 2);
const uploadMaxFileSizeBytes = uploadMaxFileSizeMb * 1024 * 1024;
const imageExtensionsByMime = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// 确保上传目录存在
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// 文件上传配置
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename(_req, file, cb) {
      const ext = imageExtensionsByMime[file.mimetype] || ".jpg";
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${ext}`);
    },
  }),
  limits: { fileSize: uploadMaxFileSizeBytes, files: 3 },
  fileFilter(_req, file, cb) {
    if (!imageExtensionsByMime[file.mimetype]) {
      cb(new Error("只允许上传 JPG、PNG、WebP 或 GIF 图片。"));
      return;
    }
    cb(null, true);
  },
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
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
// 提供上传文件的静态访问
app.use("/uploads", express.static(uploadsDir, { maxAge: "30d" }));
app.use(express.static(root, {
  dotfiles: "ignore",
  extensions: ["html"],
  maxAge: "7d",
  setHeaders(response, filePath) {
    if (/\.(html|js|css|json)$/.test(filePath)) {
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

function safeCompare(value, expected) {
  if (!value || !expected) return false;

  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  if (valueBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
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
  const validRegions = ["月光谷", "瓜子环", "棉花云", "星砂海", "蜜糖丘", "软绒原"];
  const payload = {
    playerName: cleanText(body.playerName, 40),
    name: cleanText(body.name, 32),
    nickname: cleanText(body.nickname, 40, "新来的星星"),
    breed: cleanText(body.breed, 40, ""),
    region: validRegions.includes(body.region) ? body.region : "月光谷",
    arrivedAt: cleanText(body.arrivedAt, 10),
    food: cleanText(body.food, 40, "小零食"),
    color: /^#[0-9a-fA-F]{6}$/.test(body.color || "") ? body.color : "#8fd2c8",
    traits: normalizeTraits(body.traits),
    memory: cleanText(body.memory, 2000),
    photos: Array.isArray(body.photos) ? body.photos.slice(0, 6) : [],
    publicConsent: Boolean(body.publicConsent),
    douyin: cleanText(body.douyin, 40, ""),
    xiaohongshu: cleanText(body.xiaohongshu, 40, ""),
    bilibili: cleanText(body.bilibili, 40, ""),
  };

  if (!payload.playerName) return { error: "请填写玩家昵称。" };
  if (!payload.name) return { error: "请填写鼠鼠名字。" };
  if (!payload.arrivedAt || Number.isNaN(Date.parse(payload.arrivedAt))) {
    return { error: "请填写有效的抵达鼠星日期。" };
  }
  if (!payload.memory) return { error: "请写下一段纪念。" };

  return { payload };
}

function getVisitorKey(request) {
  const raw = [
    request.ip,
    request.get("user-agent") || "",
    request.get("accept-language") || "",
    process.env.VISITOR_KEY_SALT || "shushu-planet",
  ].join("|");

  return crypto.createHash("sha256").update(raw).digest("hex");
}

function normalizeNotePayload(body) {
  const author = cleanText(body?.author, 32, "匿名旅鼠") || "匿名旅鼠";
  const message = cleanText(body?.message, 280);

  if (!message) return { error: "请写下一张回忆便签。" };
  return { payload: { author, message } };
}

function normalizeTimeCapsulePayload(body) {
  const email = cleanText(body?.email, 160).toLowerCase();
  const message = cleanText(body?.message, 2000);
  const deliverAt = cleanText(body?.deliverAt, 10);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const deliverDate = new Date(`${deliverAt}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!emailPattern.test(email)) return { error: "请填写有效的邮箱。" };
  if (!message) return { error: "请写下想寄给未来自己的话。" };
  if (!deliverAt || Number.isNaN(deliverDate.getTime()) || deliverDate <= today) {
    return { error: "请选择一个未来的投递日期。" };
  }

  return { payload: { email, message, deliverAt } };
}

function hasValidImageSignature(buffer, mimetype) {
  if (mimetype === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimetype === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimetype === "image/gif") {
    const header = buffer.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }
  return false;
}

async function removeUploadedFiles(files) {
  await Promise.all((files || []).map((file) => fs.promises.unlink(file.path).catch(() => { })));
}

async function validateUploadedImages(files) {
  for (const file of files || []) {
    const handle = await fs.promises.open(file.path, "r");
    try {
      const buffer = Buffer.alloc(12);
      await handle.read(buffer, 0, buffer.length, 0);
      if (!hasValidImageSignature(buffer, file.mimetype)) {
        await removeUploadedFiles(files);
        return "图片文件内容与格式不匹配，请重新上传。";
      }
    } finally {
      await handle.close();
    }
  }
  return null;
}

function requireAdmin(request, response, next) {
  const token = request.get("x-admin-token");

  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    response.status(401).json({ error: "没有审核权限。" });
    return;
  }

  next();
}

app.post("/api/admin/login", asyncRoute(async (request, response) => {
  const username = cleanText(request.body?.username, 80);
  const password = request.body?.password == null ? "" : request.body.password.toString();
  const expectedUsername = process.env.ADMIN_USERNAME || "";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";

  if (!process.env.ADMIN_TOKEN || !expectedUsername || !expectedPassword) {
    response.status(503).json({ error: "后台登录尚未配置。" });
    return;
  }

  if (!safeCompare(username, expectedUsername) || !safeCompare(password, expectedPassword)) {
    response.status(401).json({ error: "账号或密码不正确。" });
    return;
  }

  response.json({ token: process.env.ADMIN_TOKEN });
}));

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

app.post("/api/residents/:id/lights", asyncRoute(async (request, response) => {
  const result = await addResidentLight(request.params.id, getVisitorKey(request));

  if (!result) {
    response.status(404).json({ error: "没有找到这位鼠鼠。" });
    return;
  }

  response.json(result);
}));

app.get("/api/residents/:id/notes", asyncRoute(async (request, response) => {
  const resident = await getPublicResident(request.params.id);

  if (!resident) {
    response.status(404).json({ error: "没有找到这位鼠鼠。" });
    return;
  }

  const notes = await listResidentNotes(request.params.id);
  response.json({ notes });
}));

app.post("/api/residents/:id/notes", asyncRoute(async (request, response) => {
  const { error, payload } = normalizeNotePayload(request.body);

  if (error) {
    response.status(400).json({ error });
    return;
  }

  const note = await createResidentNote(request.params.id, payload);

  if (!note) {
    response.status(404).json({ error: "没有找到这位鼠鼠。" });
    return;
  }

  response.status(201).json({ note });
}));

app.post("/api/residents/:id/time-capsules", asyncRoute(async (request, response) => {
  const { error, payload } = normalizeTimeCapsulePayload(request.body);

  if (error) {
    response.status(400).json({ error });
    return;
  }

  const capsule = await createTimeCapsule(request.params.id, payload);

  if (!capsule) {
    response.status(404).json({ error: "没有找到这位鼠鼠。" });
    return;
  }

  response.status(201).json({ capsule, message: "时间胶囊已寄存在鼠鼠星球。" });
}));

app.post("/api/submissions", upload.array("photos", 3), asyncRoute(async (request, response) => {
  const uploadError = await validateUploadedImages(request.files);
  if (uploadError) {
    response.status(400).json({ error: uploadError });
    return;
  }

  // 处理上传的文件路径
  const photoPaths = (request.files || []).map((f) => `/uploads/${f.filename}`);
  // 合并文本字段和文件路径
  const body = {
    ...request.body,
    photos: photoPaths.length ? photoPaths : (() => {
      try { return JSON.parse(request.body.photos || "[]"); } catch { return []; }
    })(),
  };
  // 处理 checkbox（multipart 中未勾选时字段不存在）
  if (request.body.publicConsent === undefined) {
    body.publicConsent = false;
  }

  const { error, payload } = normalizeSubmissionPayload(body);

  if (error) {
    response.status(400).json({ error });
    return;
  }

  const id = await createSubmission(payload);
  response.status(201).json({
    id,
    status: "pending",
    message: "投稿已进入待审核状态。",
  });
}));

app.get("/api/admin/submissions", requireAdmin, asyncRoute(async (request, response) => {
  const submissions = await listSubmissions(request.query.status || "pending");
  response.json({ submissions });
}));

app.get("/api/admin/notes", requireAdmin, asyncRoute(async (request, response) => {
  const notes = await listAdminResidentNotes(request.query.status || "pending");
  response.json({ notes });
}));

app.post("/api/admin/notes/:id/review", requireAdmin, asyncRoute(async (request, response) => {
  const action = request.body?.action === "approve" ? "approve" : "hide";
  const note = await reviewResidentNote(request.params.id, action);

  if (!note) {
    response.status(404).json({ error: "没有找到这张便签。" });
    return;
  }

  response.json({ note });
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
