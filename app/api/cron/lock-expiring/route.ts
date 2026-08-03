import { NextRequest, NextResponse } from "next/server";
import { runLockSweep, LOCK_WINDOW_DAYS } from "@/lib/autoLock";

/**
 * Daily sweep that auto-locks active, in-stock items now within
 * LOCK_WINDOW_DAYS of expiry and notifies each owning PIC. Same auth/shape as
 * the daily-digest cron. Scheduled in vercel.json.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { locked, ids } = await runLockSweep();

  return NextResponse.json({
    success: true,
    window_days: LOCK_WINDOW_DAYS,
    locked,
    ids,
  });
}
