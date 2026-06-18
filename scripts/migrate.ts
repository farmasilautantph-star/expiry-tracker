import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), "db", "expiry-tracker.db");

const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

const migrationsDir = path.join(process.cwd(), "db", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".ts"))
  .sort();

for (const file of files) {
  const migrationPath = path.join(migrationsDir, file);
  console.log(`Running migration: ${file}`);
  const migration = require(migrationPath);
  migration.up(db);
  console.log(`  ✓ ${file} applied`);
}

console.log("\nAll migrations complete.");
db.close();
