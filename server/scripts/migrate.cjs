const dotenv = require("dotenv");
const { getPool } = require("../db.cjs");

dotenv.config();

const databaseName = process.env.DB_NAME || "omwstar";

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

const tableMigrations = [
    `CREATE TABLE IF NOT EXISTS resident_lights (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            resident_id BIGINT UNSIGNED NOT NULL,
            visitor_key CHAR(64) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_resident_lights_visitor (resident_id, visitor_key),
            KEY idx_resident_lights_created (created_at),
            CONSTRAINT fk_resident_lights_resident
                FOREIGN KEY (resident_id) REFERENCES residents(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS resident_notes (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            public_id VARCHAR(32) NOT NULL,
            resident_id BIGINT UNSIGNED NOT NULL,
            author VARCHAR(32) NOT NULL DEFAULT '匿名旅鼠',
            message VARCHAR(280) NOT NULL,
            status ENUM('pending', 'approved', 'hidden') NOT NULL DEFAULT 'pending',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_resident_notes_public_id (public_id),
            KEY idx_resident_notes_resident_status (resident_id, status, created_at),
            CONSTRAINT fk_resident_notes_resident
                FOREIGN KEY (resident_id) REFERENCES residents(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS time_capsules (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            public_id VARCHAR(32) NOT NULL,
            resident_id BIGINT UNSIGNED NOT NULL,
            email VARCHAR(160) NOT NULL,
            message TEXT NOT NULL,
            deliver_at DATE NOT NULL,
            status ENUM('pending', 'sent', 'canceled') NOT NULL DEFAULT 'pending',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            sent_at DATETIME NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_time_capsules_public_id (public_id),
            KEY idx_time_capsules_due (status, deliver_at),
            CONSTRAINT fk_time_capsules_resident
                FOREIGN KEY (resident_id) REFERENCES residents(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function columnExists(pool, migration) {
    const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [databaseName, migration.table, migration.col],
    );

    return columns.length > 0;
}

async function main() {
    const pool = getPool();

    try {
        for (const statement of tableMigrations) {
            await pool.execute(statement);
        }

        const [cleanupResult] = await pool.execute(
            `DELETE FROM residents WHERE source = 'seed' AND public_id LIKE 'seed-%'`,
        );
        if (cleanupResult.affectedRows) {
            console.log(`清理: 已移除 ${cleanupResult.affectedRows} 条示例居民。`);
        }

        await pool.execute(
            `ALTER TABLE resident_notes MODIFY status ENUM('pending', 'approved', 'hidden') NOT NULL DEFAULT 'pending'`,
        );

        for (const migration of migrations) {
            if (await columnExists(pool, migration)) {
                console.log(`跳过: ${migration.table}.${migration.col} 已存在。`);
                continue;
            }

            await pool.execute(
                `ALTER TABLE ${migration.table} ADD COLUMN ${migration.col} ${migration.type} AFTER ${migration.after}`,
            );
            console.log(`迁移: ${migration.table} 表已添加 ${migration.col} 列。`);
        }
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});