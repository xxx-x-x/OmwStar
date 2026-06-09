const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

async function runStatements(connection, sql) {
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await connection.query(statement);
  }
}

async function main() {
  const schemaPath = path.resolve(__dirname, "..", "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: false,
  });

  try {
    await runStatements(connection, schema);
    console.log(`数据库 ${process.env.DB_NAME || "omwstar"} 已准备好。`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
