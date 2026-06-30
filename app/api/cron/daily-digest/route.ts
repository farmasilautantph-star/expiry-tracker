import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { sendPushNotification } from "@/lib/sendPushNotification";

interface DigestRow {
  id: number;
  description: string;
  expiry_date: string;
  pic_name: string;
  days_left: number;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  console.log('Received header:', authHeader)
  console.log('Expected:', `Bearer ${process.env.CRON_SECRET}`)
  console.log('CRON_SECRET exists:', !!process.env.CRON_SECRET)
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rows = (
    await pool.query(
      `SELECT id, description, expiry_date, pic_name,
              ((expiry_date)::date - CURRENT_DATE) AS days_left
       FROM expiry_logs
       WHERE quantity > 0
         AND item_status = 'active'
         AND (expiry_date)::date <= (CURRENT_DATE + INTERVAL '90 days')`,
    )
  ).rows as DigestRow[];

  const expiredCount = rows.filter((r) => r.days_left < 0).length;
  const criticalCount = rows.length - expiredCount;

  if (rows.length === 0) {
    return NextResponse.json({
      sent: false,
      expiredCount: 0,
      criticalCount: 0,
      message: "No items to report",
    });
  }

  const managers = (
    await pool.query(`SELECT id FROM users WHERE role = 'manager'`)
  ).rows as { id: number }[];

  await Promise.all(
    managers.map((m) =>
      sendPushNotification({
        userId: m.id,
        title: "Daily Review Digest",
        body: `${expiredCount} expired, ${criticalCount} critical items need review`,
        url: "/dashboard",
        type: "daily_digest",
        tag: "daily-digest",
        requireInteraction: true,
      }),
    ),
  );

  return NextResponse.json({
    sent: true,
    expiredCount,
    criticalCount,
    managers: managers.length,
  });
}
