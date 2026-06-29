import pool from "@/lib/db-postgres";
import { getWebPush } from "@/lib/webpush";

export interface SendPushArgs {
  userId: number;
  title: string;
  body: string;
  url?: string;
  type?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Inserts an in-app notification row and dispatches a webpush to each of the
 * user's subscriptions. Expired subscriptions (410 Gone / 404) are removed.
 * Errors are swallowed — push failures must never break the caller.
 */
export async function sendPushNotification(args: SendPushArgs): Promise<void> {
  const { userId, title, body, url, type, tag, requireInteraction } = args;
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO notifications (user_id, title, body, url, type) VALUES ($1, $2, $3, $4, $5)`,
      [userId, title, body, url ?? null, type ?? null],
    );

    const subs = await client.query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
      [userId],
    );

    if (subs.rows.length === 0) return;

    let webpush;
    try {
      webpush = getWebPush();
    } catch (err) {
      console.warn("[push] VAPID not configured, skipping web push:", (err as Error).message);
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url ?? "/dashboard",
      tag,
      requireInteraction: !!requireInteraction,
    });

    const expired: string[] = [];
    await Promise.all(
      subs.rows.map(async (row) => {
        const subscription = {
          endpoint: row.endpoint as string,
          keys: { p256dh: row.p256dh as string, auth: row.auth as string },
        };
        try {
          await webpush.sendNotification(subscription, payload);
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 410 || status === 404) {
            expired.push(row.endpoint as string);
          } else {
            console.warn("[push] send failed:", status, err?.body || err?.message);
          }
        }
      }),
    );

    if (expired.length > 0) {
      await client.query(`DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])`, [
        expired,
      ]);
    }
  } catch (err) {
    console.error("[push] sendPushNotification error:", err);
  } finally {
    client.release();
  }
}

export default sendPushNotification;
