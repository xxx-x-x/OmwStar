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
    region: row.region,
    arrivedAt: row.arrived_at,
    food: row.food,
    color: row.color,
    traits: parseJsonField(row.traits, []),
    memory: row.memory,
    photos: parseJsonField(row.photos, []),
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
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
    region: row.region,
    arrivedAt: row.arrived_at,
    food: row.food,
    color: row.color,
    traits: parseJsonField(row.traits, []),
    memory: row.memory,
    photos: parseJsonField(row.photos, []),
    publicConsent: Boolean(row.public_consent),
    reviewerNote: row.reviewer_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

async function listPublicResidents() {
  const cached = await getJson(publicResidentsCacheKey);
  if (cached) return cached;

  const [rows] = await getPool().execute(
    `SELECT *
       FROM residents
      WHERE visibility = 'public'
      ORDER BY published_at DESC, created_at DESC
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
    `SELECT *
       FROM residents
      WHERE public_id = :publicId AND visibility = 'public'
      LIMIT 1`,
    { publicId },
  );
  const resident = rows[0] ? toResident(rows[0]) : null;
  if (resident) await setJson(cacheKey, resident);
  return resident;
}

async function createSubmission(payload) {
  const publicId = createPublicId();
  await getPool().execute(
    `INSERT INTO submissions
      (public_id, status, player_name, name, nickname, region, arrived_at, food, color, traits, memory, photos, public_consent)
     VALUES
      (:publicId, 'pending', :playerName, :name, :nickname, :region, :arrivedAt, :food, :color, CAST(:traits AS JSON), :memory, CAST(:photos AS JSON), :publicConsent)`,
    {
      publicId,
      playerName: payload.playerName,
      name: payload.name,
      nickname: payload.nickname,
      region: payload.region,
      arrivedAt: payload.arrivedAt,
      food: payload.food,
      color: payload.color,
      traits: JSON.stringify(payload.traits),
      memory: payload.memory,
      photos: JSON.stringify(payload.photos || []),
      publicConsent: payload.publicConsent ? 1 : 0,
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
        (public_id, name, nickname, player_name, region, arrived_at, food, color, traits, memory, photos, visibility, source, published_at)
       VALUES
        (:residentPublicId, :name, :nickname, :playerName, :region, :arrivedAt, :food, :color, CAST(:traits AS JSON), :memory, CAST(:photos AS JSON), 'public', 'submission', NOW())`,
      {
        residentPublicId,
        name: submission.name,
        nickname: submission.nickname,
        playerName: submission.player_name,
        region: submission.region,
        arrivedAt: submission.arrived_at,
        food: submission.food,
        color: submission.color,
        traits: JSON.stringify(parseJsonField(submission.traits, [])),
        memory: submission.memory,
        photos: JSON.stringify(parseJsonField(submission.photos, [])),
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
  getPublicResident,
  listPublicResidents,
  listSubmissions,
  reviewSubmission,
};
