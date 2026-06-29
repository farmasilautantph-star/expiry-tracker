/**
 * Generates VAPID keypair and appends to .env.local.
 *
 * Run:
 *   npx ts-node --project tsconfig.scripts.json scripts/generate-vapid.ts
 */

import fs from "fs";
import path from "path";
import webpush from "web-push";

const SUBJECT = "mailto:aizat@farmasilautantph.com";

function appendIfMissing(envPath: string, lines: Record<string, string>) {
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const out: string[] = [];
  for (const [key, value] of Object.entries(lines)) {
    if (new RegExp(`^${key}\\s*=`, "m").test(existing)) {
      console.log(`  ${key.padEnd(28)} already present — skipping`);
      continue;
    }
    out.push(`${key}=${value}`);
    console.log(`  ${key.padEnd(28)} ✅ added`);
  }
  if (out.length === 0) return;
  const sep = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  fs.appendFileSync(envPath, `${sep}\n# VAPID push notification keys\n${out.join("\n")}\n`);
}

function main() {
  console.log("\n── Generating VAPID keypair ──────────────────────────\n");
  const keys = webpush.generateVAPIDKeys();
  console.log("  Public:  ", keys.publicKey);
  console.log("  Private: ", keys.privateKey);
  console.log("  Subject: ", SUBJECT);
  console.log();

  const envPath = path.join(process.cwd(), ".env.local");
  appendIfMissing(envPath, {
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    VAPID_SUBJECT: SUBJECT,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: keys.publicKey,
  });

  console.log("\n──────────────────────────────────────────────────────");
  console.log(`✅ .env.local updated at ${envPath}\n`);
  console.log("⚠️  Remember to also set these in Vercel project env vars.\n");
}

main();
