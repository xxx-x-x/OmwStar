const crypto = require("crypto");
const { getPool } = require("./db.cjs");
const { deleteKeys, getJson, setJson } = require("./cache.cjs");

const publicResidentsCacheKey = "residents:public:v1";

function createPublicId() {
  return crypto.randomBytes(10).toString("hex");
}

function parseJsonField(value, fallback) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toResident(row) {
  return {
    id: row.public_id,
    databaseId: row.id,
    playerName: row.player_name,
    name: row.name,
    nickname: row.nickname,
    breed: row.breed || "",
    region: row.region,
    arrivedAt: row.arrived_at,
    food: row.food,
    color: row.color,
    traits: parseJsonField(row.traits, []),
    memory: row.memory,
    photos: parseJsonField(row.photos, []),
    spreadImage: row.spread_image || "",
    visibility: row.visibility,
    lightCount: Number(row.light_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    douyin: row.douyin || "",
    xiaohongshu: row.xiaohongshu || "",
    bilibili: row.bilibili || "",
  };
}

function toResidentNote(row) {
  return {
    id: row.public_id,
    author: row.author || "匿名旅鼠",
    message: row.message,
    status: row.status,
    residentId: row.resident_public_id || "",
    residentName: row.resident_name || "",
    createdAt: row.created_at,
  };
}

function toSubmission(row) {
  return {
    id: row.public_id,
    databaseId: row.id,
    residentId: row.resident_id,
    status: row.status,
    playerName: row.player_name,
    name: row.name,
    nickname: row.nickname,
    breed: row.breed || "",
    region: row.region,
    arrivedAt: row.arrived_at,
    food: row.food,
    color: row.color,
    traits: parseJsonField(row.traits, []),
    memory: row.memory,
    photos: parseJsonField(row.photos, []),
    spreadImage: row.spread_image || "",
    publicConsent: Boolean(row.public_consent),
    reviewerNote: row.reviewer_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    douyin: row.douyin || "",
    xiaohongshu: row.xiaohongshu || "",
    bilibili: row.bilibili || "",
  };
}

async function listPublicResidents() {
  const cached = await getJson(publicResidentsCacheKey);
  if (cached) return cached;

  const [rows] = await getPool().execute(
    `SELECT r.*, COALESCE(l.light_count, 0) AS light_count
       FROM residents r
       LEFT JOIN (
         SELECT resident_id, COUNT(*) AS light_count
           FROM resident_lights
          GROUP BY resident_id
       ) l ON l.resident_id = r.id
      WHERE r.visibility = 'public'
      ORDER BY r.published_at DESC, r.created_at DESC
      LIMIT 200`,
  );
  const residents = rows.map(toResident);
  await setJson(publicResidentsCacheKey, residents);
  return residents;
}

async function getPublicResident(publicId) {
  const cacheKey = `resident:public:${publicId}`;
  const cached = await getJson(cacheKey);
  if (cached) return cached;

  const [rows] = await getPool().execute(
    `SELECT r.*, COALESCE(l.light_count, 0) AS light_count
       FROM residents r
       LEFT JOIN (
         SELECT resident_id, COUNT(*) AS light_count
           FROM resident_lights
          GROUP BY resident_id
       ) l ON l.resident_id = r.id
      WHERE r.public_id = :publicId AND r.visibility = 'public'
      LIMIT 1`,
    { publicId },
  );
  const resident = rows[0] ? toResident(rows[0]) : null;
  if (resident) await setJson(cacheKey, resident);
  return resident;
}

async function addResidentLight(publicId, visitorKey) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [residentRows] = await connection.execute(
      `SELECT id, public_id
         FROM residents
        WHERE public_id = :publicId AND visibility = 'public'
        LIMIT 1`,
      { publicId },
    );
    const resident = residentRows[0];

    if (!resident) {
      await connection.rollback();
      return null;
    }

    const [result] = await connection.execute(
      `INSERT IGNORE INTO resident_lights (resident_id, visitor_key)
       VALUES (:residentId, :visitorKey)`,
      { residentId: resident.id, visitorKey },
    );
    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS light_count
         FROM resident_lights
        WHERE resident_id = :residentId`,
      { residentId: resident.id },
    );

    await connection.commit();
    await deleteKeys([publicResidentsCacheKey, `resident:public:${publicId}`]);
    return {
      lightCount: Number(countRows[0]?.light_count || 0),
      alreadyLit: result.affectedRows === 0,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listResidentNotes(publicId) {
  const [rows] = await getPool().execute(
    `SELECT n.*
       FROM resident_notes n
       INNER JOIN residents r ON r.id = n.resident_id
      WHERE r.public_id = :publicId
        AND r.visibility = 'public'
        AND n.status = 'approved'
      ORDER BY n.created_at DESC
      LIMIT 50`,
    { publicId },
  );
  return rows.map(toResidentNote);
}

async function listAdminResidentNotes(status = "pending") {
  const validStatuses = new Set(["pending", "approved", "hidden"]);
  const normalizedStatus = validStatuses.has(status) ? status : "pending";
  const [rows] = await getPool().execute(
    `SELECT n.*, r.public_id AS resident_public_id, r.name AS resident_name
       FROM resident_notes n
       INNER JOIN residents r ON r.id = n.resident_id
      WHERE n.status = :status
      ORDER BY n.created_at ASC
      LIMIT 200`,
    { status: normalizedStatus },
  );
  return rows.map(toResidentNote);
}

async function createResidentNote(publicId, payload) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [residentRows] = await connection.execute(
      `SELECT id
         FROM residents
        WHERE public_id = :publicId AND visibility = 'public'
        LIMIT 1`,
      { publicId },
    );
    const resident = residentRows[0];

    if (!resident) {
      await connection.rollback();
      return null;
    }

    const notePublicId = createPublicId();
    await connection.execute(
      `INSERT INTO resident_notes (public_id, resident_id, author, message)
       VALUES (:notePublicId, :residentId, :author, :message)`,
      {
        notePublicId,
        residentId: resident.id,
        author: payload.author,
        message: payload.message,
      },
    );
    const [noteRows] = await connection.execute(
      `SELECT * FROM resident_notes WHERE public_id = :notePublicId LIMIT 1`,
      { notePublicId },
    );

    await connection.commit();
    return toResidentNote(noteRows[0]);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function reviewResidentNote(publicId, action) {
  const status = action === "approve" ? "approved" : "hidden";
  const [result] = await getPool().execute(
    `UPDATE resident_notes
        SET status = :status
      WHERE public_id = :publicId`,
    { publicId, status },
  );

  if (!result.affectedRows) return null;
  const [rows] = await getPool().execute(
    `SELECT n.*, r.public_id AS resident_public_id, r.name AS resident_name
       FROM resident_notes n
       INNER JOIN residents r ON r.id = n.resident_id
      WHERE n.public_id = :publicId
      LIMIT 1`,
    { publicId },
  );
  return rows[0] ? toResidentNote(rows[0]) : null;
}

async function createTimeCapsule(publicId, payload) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [residentRows] = await connection.execute(
      `SELECT id
         FROM residents
        WHERE public_id = :publicId AND visibility = 'public'
        LIMIT 1`,
      { publicId },
    );
    const resident = residentRows[0];

    if (!resident) {
      await connection.rollback();
      return null;
    }

    const capsulePublicId = createPublicId();
    await connection.execute(
      `INSERT INTO time_capsules (public_id, resident_id, email, message, deliver_at)
       VALUES (:capsulePublicId, :residentId, :email, :message, :deliverAt)`,
      {
        capsulePublicId,
        residentId: resident.id,
        email: payload.email,
        message: payload.message,
        deliverAt: payload.deliverAt,
      },
    );

    await connection.commit();
    return { id: capsulePublicId, deliverAt: payload.deliverAt };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listDueTimeCapsules(limit = 50) {
  const [rows] = await getPool().execute(
    `SELECT c.*, r.public_id AS resident_public_id, r.name AS resident_name, r.nickname, r.arrived_at, r.memory
       FROM time_capsules c
       INNER JOIN residents r ON r.id = c.resident_id
      WHERE c.status = 'pending'
        AND c.deliver_at <= CURDATE()
        AND r.visibility = 'public'
      ORDER BY c.deliver_at ASC, c.created_at ASC
      LIMIT :limit`,
    { limit: Number(limit) || 50 },
  );

  return rows.map((row) => ({
    id: row.public_id,
    databaseId: row.id,
    email: row.email,
    message: row.message,
    deliverAt: row.deliver_at,
    residentId: row.resident_public_id,
    residentName: row.resident_name,
    residentNickname: row.nickname,
    residentArrivedAt: row.arrived_at,
    residentMemory: row.memory,
  }));
}

async function markTimeCapsuleSent(publicId) {
  await getPool().execute(
    `UPDATE time_capsules
        SET status = 'sent', sent_at = NOW()
      WHERE public_id = :publicId AND status = 'pending'`,
    { publicId },
  );
}

async function createSubmission(payload) {
  const publicId = createPublicId();
  await getPool().execute(
    `INSERT INTO submissions
      (public_id, status, player_name, name, nickname, breed, region, arrived_at, food, color, traits, memory, photos, spread_image, public_consent, douyin, xiaohongshu, bilibili)
     VALUES
      (:publicId, 'pending', :playerName, :name, :nickname, :breed, :region, :arrivedAt, :food, :color, CAST(:traits AS JSON), :memory, CAST(:photos AS JSON), :spreadImage, :publicConsent, :douyin, :xiaohongshu, :bilibili)`,
    {
      publicId,
      playerName: payload.playerName,
      name: payload.name,
      nickname: payload.nickname,
      breed: payload.breed || "",
      region: payload.region,
      arrivedAt: payload.arrivedAt,
      food: payload.food,
      color: payload.color,
      traits: JSON.stringify(payload.traits),
      memory: payload.memory,
      photos: JSON.stringify(payload.photos || []),
      spreadImage: payload.spreadImage || "",
      publicConsent: payload.publicConsent ? 1 : 0,
      douyin: payload.douyin || "",
      xiaohongshu: payload.xiaohongshu || "",
      bilibili: payload.bilibili || "",
    },
  );
  return publicId;
}

async function listSubmissions(status = "pending") {
  const [rows] = await getPool().execute(
    `SELECT *
       FROM submissions
      WHERE status = :status
      ORDER BY created_at ASC
      LIMIT 200`,
    { status },
  );
  return rows.map(toSubmission);
}

async function reviewSubmission(publicId, action, reviewerNote = "") {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [submissionRows] = await connection.execute(
      `SELECT *
         FROM submissions
        WHERE public_id = :publicId
        FOR UPDATE`,
      { publicId },
    );
    const submission = submissionRows[0];

    if (!submission) {
      await connection.rollback();
      return null;
    }

    if (submission.status !== "pending") {
      await connection.rollback();
      return toSubmission(submission);
    }

    if (action === "reject") {
      await connection.execute(
        `UPDATE submissions
            SET status = 'rejected',
                reviewer_note = :reviewerNote,
                reviewed_at = NOW()
          WHERE public_id = :publicId`,
        { publicId, reviewerNote },
      );
      await connection.commit();
      return { ...toSubmission(submission), status: "rejected", reviewerNote };
    }

    if (!submission.public_consent) {
      await connection.execute(
        `UPDATE submissions
            SET status = 'rejected',
                reviewer_note = :reviewerNote,
                reviewed_at = NOW()
          WHERE public_id = :publicId`,
        {
          publicId,
          reviewerNote: reviewerNote || "未勾选公开收录意愿，不能公开。",
        },
      );
      await connection.commit();
      return { ...toSubmission(submission), status: "rejected" };
    }

    const residentPublicId = createPublicId();
    const [residentResult] = await connection.execute(
      `INSERT INTO residents
        (public_id, name, nickname, breed, player_name, region, arrived_at, food, color, traits, memory, photos, spread_image, visibility, source, published_at, douyin, xiaohongshu, bilibili)
       VALUES
        (:residentPublicId, :name, :nickname, :breed, :playerName, :region, :arrivedAt, :food, :color, CAST(:traits AS JSON), :memory, CAST(:photos AS JSON), :spreadImage, 'public', 'submission', NOW(), :douyin, :xiaohongshu, :bilibili)`,
      {
        residentPublicId,
        name: submission.name,
        nickname: submission.nickname,
        breed: submission.breed || "",
        playerName: submission.player_name,
        region: submission.region,
        arrivedAt: submission.arrived_at,
        food: submission.food,
        color: submission.color,
        traits: JSON.stringify(parseJsonField(submission.traits, [])),
        memory: submission.memory,
        photos: JSON.stringify(parseJsonField(submission.photos, [])),
        spreadImage: submission.spread_image || "",
        douyin: submission.douyin || "",
        xiaohongshu: submission.xiaohongshu || "",
        bilibili: submission.bilibili || "",
      },
    );

    await connection.execute(
      `UPDATE submissions
          SET status = 'approved',
              resident_id = :residentId,
              reviewer_note = :reviewerNote,
              reviewed_at = NOW()
        WHERE public_id = :publicId`,
      {
        publicId,
        residentId: residentResult.insertId,
        reviewerNote,
      },
    );

    await connection.commit();
    await deleteKeys([publicResidentsCacheKey, `resident:public:${residentPublicId}`]);
    return {
      ...toSubmission(submission),
      status: "approved",
      residentId: residentResult.insertId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createSubmission,
  addResidentLight,
  createResidentNote,
  createTimeCapsule,
  getPublicResident,
  listAdminResidentNotes,
  listDueTimeCapsules,
  listResidentNotes,
  listPublicResidents,
  listSubmissions,
  markTimeCapsuleSent,
  reviewResidentNote,
  reviewSubmission,
};
