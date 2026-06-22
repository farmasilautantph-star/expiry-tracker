import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryLogRow {
  id: number;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  pic_id: number;
  pic_name: string;
  logged_at: string;
  notes: string | null;
  stock_id: string | null;
  uom: string | null;
  quantity: number;
  original_qty: number | null;
  return_status: string | null;
  return_by_date: string | null;
  last_updated_at: string | null;
  item_status: string;
  completed_via: string | null;
  completed_at: string | null;
  return_notes: string | null;
}

interface HistoryRow {
  id: number;
  action: string;
  module: string;
  record_id: number;
  pic_id: number;
  pic_name: string;
  description: string;
  timestamp: string;
}

interface OfferRow {
  id: number;
  quantity: number;
  outlet_name: string | null;
  offer_status: string;
  created_at: string;
  updated_at: string;
  received_at: string | null;
  rejection_notes: string | null;
}

interface TimelineEvent {
  id: string;
  date: string;
  event_type: string;
  title: string;
  description: string;
  pic_name: string;
  color: string;
  icon: string;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function calcUrgency(expiryDate: string): { daysLeft: number; urgency: string } {
  const daysLeft = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const urgency =
    daysLeft < 0
      ? "expired"
      : daysLeft < 90
        ? "critical"
        : daysLeft <= 240
          ? "warning"
          : "safe";
  return { daysLeft, urgency };
}

function buildTimeline(
  entry: ExpiryLogRow,
  history: HistoryRow[],
  offers: OfferRow[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let idx = 0;

  // ── History log events ──────────────────────────────────────────────────────
  for (const h of history) {
    const desc = h.description;

    if (h.action === "CREATE") {
      const qtyMatch = desc.match(/qty=(\d+)/);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : (entry.original_qty ?? entry.quantity);
      events.push({
        id: `ev-${idx++}`,
        date: h.timestamp,
        event_type: "logged",
        title: "Item Logged",
        description: `${qty} unit${qty !== 1 ? "s" : ""} logged by ${h.pic_name}. Expiry: ${fmtDate(entry.expiry_date)}`,
        pic_name: h.pic_name,
        color: "#2563eb",
        icon: "document-plus",
      });
      continue;
    }

    if (h.action === "UPDATE") {
      // Stock addition event
      const stockAddedM = desc.match(/^\+(\d+) unit\(s\) added to .+\. Reason: (.+)\. New total: (\d+) units$/);
      if (stockAddedM) {
        const added = parseInt(stockAddedM[1]);
        const reason = stockAddedM[2];
        const total = parseInt(stockAddedM[3]);
        events.push({
          id: `ev-${idx++}`,
          date: h.timestamp,
          event_type: "stock_added",
          title: "Stock Added",
          description: `+${added} unit${added !== 1 ? "s" : ""} added by ${h.pic_name}\nReason: ${reason}\nNew total: ${total} unit${total !== 1 ? "s" : ""}`,
          pic_name: h.pic_name,
          color: "#2563eb",
          icon: "plus-circle",
        });
        continue;
      }

      if (desc.includes("Marked as reviewed by")) {
        const m = desc.match(/Marked as reviewed by (.+)/);
        events.push({
          id: `ev-${idx++}`,
          date: h.timestamp,
          event_type: "reviewed",
          title: "Weekly Review",
          description: `Reviewed by ${m ? m[1] : h.pic_name}. ${entry.quantity} unit${entry.quantity !== 1 ? "s" : ""} active`,
          pic_name: h.pic_name,
          color: "#16a34a",
          icon: "clipboard-check",
        });
        continue;
      }

      const partialM = desc.match(/(\d+) unit\(s\) sold by (.+)\. Remaining: (\d+)/);
      if (partialM) {
        const sold = parseInt(partialM[1]);
        const rem  = parseInt(partialM[3]);
        events.push({
          id: `ev-${idx++}`,
          date: h.timestamp,
          event_type: "partial_sold",
          title: "Partial Sale",
          description: `${sold} unit${sold !== 1 ? "s" : ""} sold by ${partialM[2]}. ${rem} unit${rem !== 1 ? "s" : ""} remaining`,
          pic_name: h.pic_name,
          color: "#ea580c",
          icon: "shopping-bag",
        });
        continue;
      }

      const fullM = desc.match(/All (\d+) unit\(s\) fully sold by (.+)/);
      if (fullM) {
        const n = parseInt(fullM[1]);
        events.push({
          id: `ev-${idx++}`,
          date: h.timestamp,
          event_type: "fully_sold",
          title: "Fully Sold",
          description: `All ${n} unit${n !== 1 ? "s" : ""} sold by ${fullM[2]}`,
          pic_name: h.pic_name,
          color: "#16a34a",
          icon: "check-circle",
        });
        continue;
      }

      const markedSoldM = desc.match(/Item marked as sold by (.+)/);
      if (markedSoldM) {
        events.push({
          id: `ev-${idx++}`,
          date: h.timestamp,
          event_type: "fully_sold",
          title: "Fully Sold",
          description: `All units sold by ${markedSoldM[1]}`,
          pic_name: h.pic_name,
          color: "#16a34a",
          icon: "check-circle",
        });
        continue;
      }

      if (/Updated (?:notes on )?expiry log #\d+/.test(desc)) {
        events.push({
          id: `ev-${idx++}`,
          date: h.timestamp,
          event_type: "qty_updated",
          title: "Entry Updated",
          description: `Updated by ${h.pic_name}`,
          pic_name: h.pic_name,
          color: "#d97706",
          icon: "pencil-square",
        });
        continue;
      }

      // Return status transitions — new format
      if (desc.startsWith("Return completed for")) {
        events.push({
          id: `ev-${idx++}`,
          date: h.timestamp,
          event_type: "return_completed",
          title: "Returned to Warehouse",
          description: `Successfully returned by ${h.pic_name}`,
          pic_name: h.pic_name,
          color: "#16a34a",
          icon: "check",
        });
        continue;
      }
      if (desc.startsWith("Return not approved for")) {
        const notesM = desc.match(/\. Notes: (.+)$/);
        events.push({
          id: `ev-${idx++}`,
          date: h.timestamp,
          event_type: "return_not_approved",
          title: "Return Not Approved",
          description: `Return rejected by ${h.pic_name}${notesM ? ". " + notesM[1] : ""}`,
          pic_name: h.pic_name,
          color: "#dc2626",
          icon: "x-circle",
        });
        continue;
      }

      // Return status transitions — old format (pre-simplification)
      const oldReturnM = desc.match(/Return status updated to (\w+) by (.+)/);
      if (oldReturnM) {
        const status = oldReturnM[1];
        if (status === "returned") {
          events.push({
            id: `ev-${idx++}`,
            date: h.timestamp,
            event_type: "return_completed",
            title: "Returned to Warehouse",
            description: `Successfully returned by ${h.pic_name}`,
            pic_name: h.pic_name,
            color: "#16a34a",
            icon: "check",
          });
        } else if (status === "not_approved") {
          events.push({
            id: `ev-${idx++}`,
            date: h.timestamp,
            event_type: "return_not_approved",
            title: "Return Not Approved",
            description: `Return rejected by ${h.pic_name}`,
            pic_name: h.pic_name,
            color: "#dc2626",
            icon: "x-circle",
          });
        }
        continue;
      }
    }
  }

  // ── Return events from entry fields (field-based, for items without history_log return events) ──
  // Only emit these if history_log didn't already produce return events
  const hasReturnHistoryEvents = events.some((e) =>
    ["returning", "return_completed", "return_not_approved"].includes(e.event_type),
  );

  if (entry.return_by_date) {
    events.push({
      id: `ev-${idx++}`,
      date: entry.last_updated_at ?? entry.logged_at,
      event_type: "marked_returnable",
      title: "Marked as Returnable",
      description: `Return by: ${fmtDate(entry.return_by_date)}. Set by ${entry.pic_name}`,
      pic_name: entry.pic_name,
      color: "#2563eb",
      icon: "arrow-uturn-left",
    });
  }

  if (!hasReturnHistoryEvents) {
    const returnDate = entry.completed_at ?? entry.last_updated_at ?? entry.logged_at;
    if (entry.return_status === "returned" || entry.completed_via === "returned") {
      events.push({
        id: `ev-${idx++}`,
        date: returnDate,
        event_type: "return_completed",
        title: "Returned to Warehouse",
        description: `Successfully returned by ${entry.pic_name}`,
        pic_name: entry.pic_name,
        color: "#16a34a",
        icon: "check",
      });
    } else if (entry.completed_via === "return_not_approved") {
      events.push({
        id: `ev-${idx++}`,
        date: returnDate,
        event_type: "return_not_approved",
        title: "Return Not Approved",
        description: `Return rejected.${entry.return_notes ? " " + entry.return_notes : ""}`,
        pic_name: entry.pic_name,
        color: "#dc2626",
        icon: "x-circle",
      });
    }
  }

  // ── Offer events ────────────────────────────────────────────────────────────
  for (const offer of offers) {
    events.push({
      id: `ev-offer-created-${offer.id}`,
      date: offer.created_at,
      event_type: "offer_created",
      title: "Offered to Outlet",
      description: `${offer.quantity} unit${offer.quantity !== 1 ? "s" : ""} offered${offer.outlet_name ? " to " + offer.outlet_name : ""} by MANAGER`,
      pic_name: "MANAGER",
      color: "#2563eb",
      icon: "megaphone",
    });

    if (offer.offer_status === "received") {
      events.push({
        id: `ev-offer-accepted-${offer.id}`,
        date: offer.received_at ?? offer.updated_at,
        event_type: "offer_accepted",
        title: "Offer Accepted",
        description: `${offer.outlet_name ?? "Outlet"} confirmed receipt${offer.received_at ? " on " + fmtDate(offer.received_at) : ""}`,
        pic_name: "MANAGER",
        color: "#16a34a",
        icon: "check-circle",
      });
    } else if (offer.offer_status === "rejected") {
      events.push({
        id: `ev-offer-rejected-${offer.id}`,
        date: offer.updated_at,
        event_type: "offer_rejected",
        title: "Offer Rejected",
        description: `${offer.outlet_name ?? "Outlet"} rejected offer${offer.rejection_notes ? ". " + offer.rejection_notes : ""}`,
        pic_name: "MANAGER",
        color: "#dc2626",
        icon: "x-mark",
      });
    }
  }

  const EVENT_PRIORITY: Record<string, number> = {
    logged:               1,
    marked_returnable:    2,
    return_pending:       3,
    qty_updated:          3,
    stock_added:          3,
    reviewed:             3,
    returning:            4,
    partial_sold:         4,
    offer_created:        4,
    fully_sold:           5,
    offer_accepted:       5,
    offer_rejected:       5,
    return_completed:     6,
    return_not_approved:  6,
  };

  events.sort((a, b) => {
    const tA = new Date(a.date).getTime();
    const tB = new Date(b.date).getTime();
    if (tA !== tB) return tA - tB;
    return (EVENT_PRIORITY[a.event_type] ?? 3) - (EVENT_PRIORITY[b.event_type] ?? 3);
  });

  return events;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get("barcode")?.trim() ?? "";

  if (!barcode) {
    return NextResponse.json(
      { success: false, error: "Barcode required" },
      { status: 400 },
    );
  }

  const db = getDb();

  const rows =
    user.role === "manager"
      ? (db
          .prepare(
            "SELECT * FROM expiry_logs WHERE barcode = ? ORDER BY logged_at ASC",
          )
          .all(barcode) as unknown as ExpiryLogRow[])
      : (db
          .prepare(
            "SELECT * FROM expiry_logs WHERE barcode = ? AND pic_id = ? ORDER BY logged_at ASC",
          )
          .all(barcode, user.userId) as unknown as ExpiryLogRow[]);

  if (rows.length === 0) {
    // Check if barcode belongs to another PIC (staff only)
    if (user.role !== "manager") {
      const anyRow = db
        .prepare("SELECT id FROM expiry_logs WHERE barcode = ? LIMIT 1")
        .get(barcode);
      if (anyRow) {
        return NextResponse.json({
          success: true,
          found: false,
          access_denied: true,
          entries: [],
          multiple: false,
          message: "This item belongs to another PIC.",
        });
      }
    }
    return NextResponse.json({
      success: true,
      found: false,
      access_denied: false,
      entries: [],
      multiple: false,
      message: "No item found for this barcode",
    });
  }

  const entries = rows.map((entry) => {
    const history = db
      .prepare(
        "SELECT * FROM history_log WHERE record_id = ? AND module = 'expiry' ORDER BY timestamp ASC",
      )
      .all(entry.id) as unknown as HistoryRow[];

    const offers = db
      .prepare(
        "SELECT * FROM offers WHERE barcode = ? ORDER BY created_at ASC",
      )
      .all(entry.barcode) as unknown as OfferRow[];

    const { daysLeft, urgency } = calcUrgency(entry.expiry_date);
    const timeline = buildTimeline(entry, history, offers);

    return {
      entry_id:     entry.id,
      barcode:      entry.barcode,
      description:  entry.description,
      stock_id:     entry.stock_id,
      category:     entry.category,
      uom:          entry.uom,
      pic_name:     entry.pic_name,
      logged_at:    entry.logged_at,
      current_qty:  entry.quantity,
      original_qty: entry.original_qty,
      expiry_date:  entry.expiry_date,
      days_left:    daysLeft,
      urgency,
      item_status:  entry.item_status,
      timeline,
    };
  });

  return NextResponse.json({
    success: true,
    found: true,
    entries,
    multiple: entries.length > 1,
  });
}
