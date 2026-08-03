import "./_env";
import { runLockSweep } from "@/lib/autoLock";

/**
 * Manually trigger the auto-lock sweep (same logic the daily cron runs).
 * Locks active, in-stock items within the lock window and notifies each PIC.
 */
(async () => {
  const result = await runLockSweep();
  console.log(`Locked ${result.locked} item(s):`, result.ids.join(", "));
  process.exit(0);
})().catch((err) => {
  console.error("Lock sweep failed:", err);
  process.exit(1);
});
