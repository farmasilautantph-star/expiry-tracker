import "./_env";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const USERS: { username: string; password: string }[] = [
  { username: "aizat",   password: "Mgr70B02931!" },
  { username: "nadiah",  password: "NdhBB2E5A23!" },
  { username: "najihah", password: "NjhOF090CB8!" },
  { username: "anis",    password: "Ans463F4AE1!" },
  { username: "nuraini", password: "Nri5E891E3F!" },
];

const SALT_ROUNDS = 10;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Step 1: show current state
  console.log("\n── Current users ──────────────────────────────────────");
  const before = await pool.query(
    "SELECT id, username, role, LEFT(password_hash, 20) AS hash_preview FROM users ORDER BY id",
  );
  console.table(before.rows);

  // Step 2: hash and update
  console.log("\n── Updating passwords ─────────────────────────────────");
  for (const { username, password } of USERS) {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username",
      [hash, username],
    );
    if (result.rowCount === 0) {
      console.warn(`  ⚠  username "${username}" not found — skipped`);
    } else {
      console.log(`  ✓  ${username} updated (hash: ${hash.slice(0, 20)}…)`);
    }
  }

  // Step 3: verify
  console.log("\n── Verification ───────────────────────────────────────");
  const after = await pool.query(
    "SELECT id, username, role, LEFT(password_hash, 7) AS prefix FROM users ORDER BY id",
  );
  for (const row of after.rows) {
    const ok = row.prefix === "$2b$10$" || row.prefix === "$2a$10$";
    console.log(`  ${ok ? "✓" : "✗"}  ${row.username.padEnd(12)} ${row.prefix}… ${ok ? "valid bcrypt" : "INVALID"}`);
  }

  await pool.end();
  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
