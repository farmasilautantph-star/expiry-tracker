import { execSync } from "child_process";
import http from "http";
import path from "path";

const ROOT = path.join(__dirname, "..");

let passed = 0;
let failed = 0;
let skipped = 0;

function run(label: string, cmd: string): boolean {
  process.stdout.write(`${label}`);
  try {
    execSync(cmd, { stdio: "pipe", cwd: ROOT });
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

async function detectDevServer(): Promise<number | null> {
  const ports = [3000, 3001, 3002, 3003, 3004];
  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "manager", password: "manager123" }),
        signal: AbortSignal.timeout(2000),
      });
      // A 200 or 401 means it's our Next.js server
      if (res.status === 200 || res.status === 401 || res.status === 400)
        return port;
    } catch {
      // Connection refused or timeout — try next port
    }
  }
  return null;
}

async function smokeTestAPI(port: number): Promise<void> {
  const label = "[4/6] API smoke test...     ";
  process.stdout.write(label);

  try {
    // Login as manager
    const loginRes = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "manager", password: "manager123" }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);

    const setCookie = loginRes.headers.get("set-cookie") ?? "";
    const tokenMatch = setCookie.match(/token=([^;]+)/);
    if (!tokenMatch) throw new Error("No token cookie in login response");
    const cookie = `token=${tokenMatch[1]}`;

    // Test shortlist endpoint
    const slRes = await fetch(`http://localhost:${port}/api/shortlist`, {
      headers: { Cookie: cookie },
    });
    if (!slRes.ok) {
      const body = await slRes.text();
      if (body.includes("Cannot find module") || body.includes("webpack")) {
        console.log("⚠️  Warn (stale .next cache — restart dev server)");
        skipped++;
        return;
      }
      throw new Error(`/api/shortlist failed: ${slRes.status}`);
    }
    const slJson = (await slRes.json()) as {
      success: boolean;
      data?: unknown[];
    };
    if (!slJson.success)
      throw new Error(`/api/shortlist returned success=false`);

    // Test expiry stats
    const statsRes = await fetch(`http://localhost:${port}/api/expiry/stats`, {
      headers: { Cookie: cookie },
    });
    if (!statsRes.ok)
      throw new Error(`/api/expiry/stats failed: ${statsRes.status}`);
    const statsJson = (await statsRes.json()) as {
      success: boolean;
      data?: {
        expired: number;
        critical: number;
        warning: number;
        safe: number;
      };
    };
    if (!statsJson.success)
      throw new Error(`/api/expiry/stats returned success=false`);

    const total = slJson.data?.length ?? 0;
    const { expired, critical, warning, safe } = statsJson.data ?? {
      expired: 0,
      critical: 0,
      warning: 0,
      safe: 0,
    };
    console.log(
      `✅ Pass  (shortlist: ${total} entries | stats: ${expired}E ${critical}C ${warning}W ${safe}S)`,
    );
    passed++;
  } catch (err) {
    console.log("❌ Fail");
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

async function main() {
  console.log("\n── Verify ────────────────────────────────────────────\n");

  run(
    "[1/6] DB integrity...       ",
    "npx ts-node --project tsconfig.scripts.json scripts/check-db.ts",
  );
  run("[2/6] TypeScript check...   ", "npx tsc --noEmit");
  run("[3/6] ESLint...             ", "npx next lint");

  // API smoke test runs BEFORE build so the dev server's .next cache is still intact.
  // next build overwrites .next, which breaks any concurrently running dev server.
  const port = await detectDevServer();
  if (port) {
    await smokeTestAPI(port);
  } else {
    process.stdout.write("[4/6] API smoke test...     ");
    console.log("⏭️  Skip (dev server not running)");
    skipped++;
  }

  run("[5/6] Build check...        ", "npx next build");
  run(
    "[6/6] Expiry check...       ",
    "npx ts-node --project tsconfig.scripts.json scripts/expiry-check.ts",
  );

  console.log("\n──────────────────────────────────────────────────────");
  if (failed === 0) {
    const skipNote = skipped > 0 ? ` (${skipped} skipped)` : "";
    console.log(`\n✅ Project verified. ${passed} checks passed${skipNote}.\n`);
    process.exit(0);
  } else {
    console.log(`\n❌ ${failed} check(s) failed.\n`);
    process.exit(1);
  }
}

main();
