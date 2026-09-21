/**
 * Create a user account (manager or staff) on a Neon database — e.g. for a
 * brand-new outlet's fresh database, or adding staff to an existing one.
 * Targets whatever DATABASE_URL points at.
 *
 * Usage:
 *   DATABASE_URL="postgresql://...outlet-db..." \
 *     npx tsx scripts/create-manager-neon.ts <username> <password> <pic_name> [role]
 *   role defaults to "manager"; pass "staff" for a staff account.
 */

import { Pool } from "pg";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

async function main() {
  const [username, password, picName, roleArg] = process.argv.slice(2);
  const role = roleArg === "staff" ? "staff" : "manager";
  if (!username || !password || !picName) {
    console.error("Usage: npx tsx scripts/create-manager-neon.ts <username> <password> <pic_name> [role]");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`\n🌐 Connecting to: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}\n`);

  const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
  if (existing.rowCount && existing.rowCount > 0) {
    console.error(`Username "${username}" already exists on this database — aborting.`);
    await pool.end();
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query(
    `INSERT INTO users (username, password_hash, role, pic_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, role, pic_name`,
    [username, hash, role, picName],
  );

  console.log(`✅ ${role} account created:`);
  console.log(result.rows[0]);

  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
