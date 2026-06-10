const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
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

// 确保上传目录存在
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// 文件上传配置
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname) || ".jpg";
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("只允许上传图片文件。"));
      return;
    }
    cb(null, true);
  },
});

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

app.post("/api/submissions", upload.array("photos", 3), asyncRoute(async (request, response) => {
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

// 数据库兼容迁移：给已有数据库补充 breed 和社交账号列
async function runMigrations() {
  try {
    const { getPool } = require("./db.cjs");
    const pool = getPool();

    const migrations = [
      { table: "submissions", col: "breed", after: "nickname", type: "VARCHAR(40) NOT NULL DEFAULT ''" },
      { table: "residents", col: "breed", after: "nickname", type: "VARCHAR(40) NOT NULL DEFAULT ''" },
      { table: "submissions", col: "douyin", after: "public_consent", type: "VARCHAR(40) NOT NULL DEFAULT ''" },
      { table: "submissions", col: "xiaohongshu", after: "douyin", type: "VARCHAR(40) NOT NULL DEFAULT ''" },
      { table: "submissions", col: "bilibili", after: "xiaohongshu", type: "VARCHAR(40) NOT NULL DEFAULT ''" },
      { table: "residents", col: "douyin", after: "published_at", type: "VARCHAR(40) NOT NULL DEFAULT ''" },
      { table: "residents", col: "xiaohongshu", after: "douyin", type: "VARCHAR(40) NOT NULL DEFAULT ''" },
      { table: "residents", col: "bilibili", after: "xiaohongshu", type: "VARCHAR(40) NOT NULL DEFAULT ''" },
    ];

    for (const m of migrations) {
      const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [process.env.DB_NAME || "omwstar", m.table, m.col],
      );
      if (!columns.length) {
        await pool.execute(`ALTER TABLE ${m.table} ADD COLUMN ${m.col} ${m.type} AFTER ${m.after}`);
        console.log(`迁移: ${m.table} 表已添加 ${m.col} 列。`);
      }
    }
  } catch (error) {
    console.warn("数据库迁移跳过:", error.message);
  }
}

app.listen(port, host, () => {
  console.log(`鼠鼠星球网站已启动: http://${host}:${port}/`);
  runMigrations();
});
