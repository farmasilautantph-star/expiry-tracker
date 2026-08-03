import pool from "@/lib/db-postgres";
import { sendPushNotification } from "@/lib/sendPushNotification";

/**
 * Auto-lock rules for near-expiry stock.
 *
 * An active, in-stock item whose expiry is within LOCK_WINDOW_DAYS days is
 * physically removed from the sellable pool and its "Mark as Sold" action is
 * blocked (enforced server-side in the sell route). Locking is persisted (not
 * computed live on read) because it records `locked_at`, fires a one-time PIC
 * notification, and must survive a manager's manual unlock — none of which a
 * pure read-time computation could do.
 *
 * Items a manager has manually unlocked (`unlocked_by IS NOT NULL`) are skipped
 * so the daily sweep never re-locks something a manager deliberately released.
 * The lock is auto-cleared when the item leaves the active sellable pool
 * (fully sold / returned / transferred to zero qty) — mirrors the Push Item
 * auto-clear pattern.
 */
export const LOCK_WINDOW_DAYS = 30;

interface LockCandidate {
  id: number;
  pic_id: number | null;
  description: string;
}

/**
 * Locks every active, in-stock item now within the lock window and notifies the
 * owning PIC. Idempotent: rows already locked (or manually unlocked) are ignored.
 * Returns the number of items newly locked.
 */
export async function runLockSweep(): Promise<{ locked: number; ids: number[] }> {
  const now = new Date().toISOString();

  // Select first, then update per-row, so we can log history + notify the PIC
  // for each newly-locked item.
  const candidates = (
    await pool.query(
      `SELECT id, pic_id, description
         FROM expiry_logs
        WHERE item_status = 'active'
          AND quantity > 0
          AND is_locked = FALSE
          AND unlocked_by IS NULL
          AND ((expiry_date)::date - CURRENT_DATE) <= $1`,
      [LOCK_WINDOW_DAYS],
    )
  ).rows as unknown as LockCandidate[];

  const lockedIds: number[] = [];

  for (const item of candidates) {
    // Guard against a concurrent unlock/sale between SELECT and UPDATE by
    // re-asserting the lock preconditions in the WHERE clause.
    const updated = await pool.query(
      `UPDATE expiry_logs
          SET is_locked = TRUE,
              locked_at = $1::timestamptz,
              last_updated_at = $1
        WHERE id = $2
          AND item_status = 'active'
          AND quantity > 0
          AND is_locked = FALSE
          AND unlocked_by IS NULL`,
      [now, item.id],
    );

    if (updated.rowCount === 0) continue;
    lockedIds.push(item.id);

    await pool.query(
      `INSERT INTO history_log
         (action, module, record_id, pic_id, pic_name, description, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "UPDATE",
        "expiry",
        item.id,
        item.pic_id,
        "System",
        `Item auto-locked (within ${LOCK_WINDOW_DAYS} days of expiry): ${item.description}`,
        now,
      ],
    );

    if (item.pic_id) {
      try {
        await sendPushNotification({
          userId: item.pic_id,
          title: "Item Locked — Action Required",
          body: `${item.description} is now locked (${LOCK_WINDOW_DAYS} days to expiry). Please remove it from the shelf and place it in the designated locked-item area.`,
          url: "/dashboard/locked-items",
          type: "item_locked",
          tag: `item-locked-${item.id}`,
          requireInteraction: true,
        });
      } catch (notifyErr) {
        console.warn("[auto-lock] notification dispatch failed:", notifyErr);
      }
    }
  }

  return { locked: lockedIds.length, ids: lockedIds };
}
