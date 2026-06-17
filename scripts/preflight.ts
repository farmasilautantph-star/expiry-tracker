import { execSync } from "child_process";
import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;

function run(label: string, cmd: string): boolean {
  process.stdout.write(`${label}`);
  try {
    execSync(cmd, { stdio: "pipe", cwd: path.join(__dirname, "..") });
    console.log("✅ Pass");
    passed++;
    return true;
  } catch (err: unknown) {
    console.log("❌ Fail");
    const e = err as { stdout?: Buffer; stderr?: Buffer };
    if (e.stdout?.length) console.error(e.stdout.toString().trim());
    if (e.stderr?.length) console.error(e.stderr.toString().trim());
    failed++;
    return false;
  }
}

function checkEnvFiles(): boolean {
  const label = "[5/5] Env file check...     ";
  process.stdout.write(label);

  // Check staged files for .env.local
  let stagedFiles: string[] = [];
  try {
    const out = execSync("git diff --cached --name-only", {
      stdio: "pipe",
    }).toString();
    stagedFiles = out.split("\n").filter(Boolean);
  } catch {
    // Not a git repo or no staged files — treat as safe
  }

  const dangerous = stagedFiles.filter((f) =>
    /\.env(\.local|\.production|\.staging)?$/.test(f),
  );

  // Also check if .env.local exists and is accidentally tracked
  const envLocalPath = path.join(__dirname, "..", ".env.local");
  const envLocalExists = fs.existsSync(envLocalPath);

  if (dangerous.length > 0) {
    console.log("❌ Fail");
    console.error(`   Staged env files detected: ${dangerous.join(", ")}`);
    console.error("   Remove them from staging: git reset HEAD <file>");
    failed++;
    return false;
  }

  if (envLocalExists && stagedFiles.includes(".env.local")) {
    console.log("❌ Fail");
    console.error("   .env.local is staged — do not commit secrets.");
    failed++;
    return false;
  }

  console.log("✅ Pass");
  passed++;
  return true;
}

console.log("\n── Preflight Checks ──────────────────────────────────\n");

run("[1/5] TypeScript check...   ", "npx tsc --noEmit");
run("[2/5] ESLint...             ", "npx next lint");
run("[3/5] Build check...        ", "npx next build");
run(
  "[4/5] DB integrity...       ",
  "npx ts-node --project tsconfig.scripts.json scripts/check-db.ts",
);
checkEnvFiles();

console.log("\n──────────────────────────────────────────────────────");
if (failed === 0) {
  console.log(`\n✅ All ${passed} checks passed. Safe to commit.\n`);
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} check(s) failed. Fix before committing.\n`);
  process.exit(1);
}
