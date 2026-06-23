/**
 * Phase 15 — Copy all rows from local SQLite → Neon PostgreSQL.
 *
 * Order respects FKs: users → products → expiry_logs → offers → returns → history_log.
 * Conversions:
 *   - offers.has_alert: INTEGER (0/1) → BOOLEAN
 * Each table is truncated (RESTART IDENTITY CASCADE) before insert.
 * SERIAL sequence is bumped to MAX(id) after insert so subsequent app inserts don't collide.
 *
 * Usage:
 *   npm run migrate:neon              # live run
 *   npm run migrate:neon -- --dry-run # row counts only, no writes
 */

import "./_env";
import { DatabaseSync, SQLOutputValue } from "node:sqlite";
import path from "path";
import pool from "../lib/db-postgres";
import type { PoolClient } from "pg";

const DRY_RUN = process.argv.includes("--dry-run");
const SQLITE_PATH = path.join(process.cwd(), "db", "expiry-tracker.db");

type Row = Record<string, SQLOutputValue>;

interface TableSpec {
  name: string;
  columns: string[];
  // optional per-column transform from SQLite value → PG value
  transform?: Record<string, (v: SQLOutputValue) => unknown>;
}

const TABLES: TableSpec[] = [
  {
    name: "users",
    columns: ["id", "username", "password_hash", "role", "pic_name", "created_at"],
  },
  {
    name: "products",
    columns: ["id", "stock_id", "barcode", "description", "uom", "category_id"],
  },
  {
    name: "expiry_logs",
    columns: [
      "id", "barcode", "description", "category", "expiry_date",
      "pic_id", "pic_name", "logged_at", "notes",
      "stock_id", "uom", "return_status", "return_by_date",
      "quantity", "last_reviewed_at", "last_reviewed_by", "last_updated_at",
      "review_status", "item_status",
      "sold_at", "sold_by", "completed_via", "completed_at", "completed_notes",
      "return_notes", "original_qty",
    ],
  },
  {
    name: "offers",
    columns: [
      "id", "description", "barcode", "uom", "quantity", "has_alert",
      "created_at", "created_by",
      "stock_id", "category", "notes", "expiry_log_id",
      "outlet_name", "offer_status", "updated_at", "received_at",
      "rejection_notes", "expiry_date",
    ],
    transform: {
      has_alert: (v) => Number(v) === 1,
    },
  },
  {
    name: "returns",
    columns: [
      "id", "logged_date", "pic_id", "pic_name", "category",
      "description", "barcode", "created_at",
      "stock_id", "uom", "return_by_date", "notes", "status",
    ],
  },
  {
    name: "history_log",
    columns: [
      "id", "action", "module", "record_id", "pic_id",
      "pic_name", "description", "timestamp",
    ],
  },
];

const BATCH_SIZE = 500;

function buildInsertSQL(table: string, columns: string[], batchSize: number): string {
  const placeholders: string[] = [];
  let idx = 1;
  for (let r = 0; r < batchSize; r++) {
    const rowPlaceholders = columns.map(() => `$${idx++}`).join(", ");
    placeholders.push(`(${rowPlaceholders})`);
  }
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(", ")}`;
}

async function migrateTable(
  pg: PoolClient,
  sqlite: DatabaseSync,
  spec: TableSpec,
): Promise<{ table: string; rows: number }> {
  const { name, columns, transform } = spec;
  const sqliteRows = sqlite.prepare(`SELECT ${columns.join(", ")} FROM ${name}`).all() as unknown as Row[];

  process.stdout.write(`  ${name.padEnd(15)} ${String(sqliteRows.length).padStart(6)} rows  `);

  if (DRY_RUN) {
    console.log("⏭️  (dry-run)");
    return { table: name, rows: sqliteRows.length };
  }

  await pg.query(`TRUNCATE TABLE ${name} RESTART IDENTITY CASCADE`);

  if (sqliteRows.length === 0) {
    console.log("✅ (empty)");
    return { table: name, rows: 0 };
  }

  let inserted = 0;
  for (let i = 0; i < sqliteRows.length; i += BATCH_SIZE) {
    const batch = sqliteRows.slice(i, i + BATCH_SIZE);
    const sql = buildInsertSQL(name, columns, batch.length);
    const values: unknown[] = [];
    for (const row of batch) {
      for (const col of columns) {
        const raw = row[col];
        const t = transform?.[col];
        values.push(t ? t(raw) : raw);
      }
    }
    await pg.query(sql, values);
    inserted += batch.length;
  }

  // Bump the SERIAL sequence so next INSERT does not collide with copied IDs.
  await pg.query(
    `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${name}), 1), true)`,
    [name],
  );

  console.log(`✅ inserted ${inserted}`);
  return { table: name, rows: inserted };
}

async function main() {
  console.log(`\n── SQLite → Neon Migration ${DRY_RUN ? "(DRY RUN) " : ""}──────────────────\n`);
  console.log(`📂 Source: ${SQLITE_PATH}`);
  console.log(`🌐 Target: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}\n`);

  const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });
  sqlite.exec("PRAGMA foreign_keys = ON");

  const pg = await pool.connect();
  const results: { table: string; rows: number }[] = [];
  try {
    for (const spec of TABLES) {
      results.push(await migrateTable(pg, sqlite, spec));
    }

    console.log("\n──────────────────────────────────────────────────────\n");
    console.log("Summary:");
    let total = 0;
    for (const r of results) {
      console.log(`  ${r.table.padEnd(15)} ${String(r.rows).padStart(6)} rows`);
      total += r.rows;
    }
    console.log(`  ${"TOTAL".padEnd(15)} ${String(total).padStart(6)} rows`);
    console.log(`\n${DRY_RUN ? "🟡 Dry run complete." : "✅ Migration complete."}\n`);
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exitCode = 1;
  } finally {
    pg.release();
    sqlite.close();
    await pool.end();
  }
}

main();
