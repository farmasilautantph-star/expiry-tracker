import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const APPEND = process.argv.includes("--append");

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), "db", "expiry-tracker.db");

if (!fs.existsSync(DB_PATH)) {
  console.error("DB not found. Run `npm run migrate` first.");
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");

if (!APPEND) {
  console.log("Clearing existing data...");
  db.exec(`
    DELETE FROM history_log;
    DELETE FROM returns;
    DELETE FROM offers;
    DELETE FROM expiry_logs;
    DELETE FROM users;
  `);
}

// ── Users ─────────────────────────────────────────────────────────────────────
const managerHash = bcrypt.hashSync("manager123", 10);
const staffHash = bcrypt.hashSync("staff123", 10);

const insertUser = db.prepare(`
  INSERT INTO users (username, password_hash, role, pic_name, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const users = [
  { username: "manager",  hash: managerHash, role: "manager", pic_name: "MANAGER" },
  { username: "nadiah",   hash: staffHash,   role: "staff",   pic_name: "NADIAH" },
  { username: "najihah",  hash: staffHash,   role: "staff",   pic_name: "NAJIHAH" },
  { username: "anis",     hash: staffHash,   role: "staff",   pic_name: "ANIS" },
  { username: "nuraini",  hash: staffHash,   role: "staff",   pic_name: "NURAINI" },
];

const userIds: Record<string, number> = {};
for (const u of users) {
  const result = insertUser.run(u.username, u.hash, u.role, u.pic_name, new Date().toISOString());
  userIds[u.username] = Number(result.lastInsertRowid);
}
console.log(`✓ ${users.length} users inserted`);

// ── Expiry Logs ───────────────────────────────────────────────────────────────
const insertExpiry = db.prepare(`
  INSERT INTO expiry_logs (barcode, description, category, expiry_date, pic_id, pic_name, logged_at, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const expiryItems = [
  // MOM & BABY
  { barcode: "9556234001", description: "Dumex Mamil Gold Step 3 1.2kg", category: "MOM & BABY", expiry_date: "2026-06-20", pic: "nadiah",  notes: null },
  { barcode: "9556234002", description: "Enfalac A+ Step 1 900g",        category: "MOM & BABY", expiry_date: "2026-07-15", pic: "nadiah",  notes: null },
  { barcode: "9556234003", description: "Friso Gold Step 2 850g",        category: "MOM & BABY", expiry_date: "2026-05-10", pic: "najihah", notes: "already expired" },
  // FS
  { barcode: "9555678001", description: "Milo Active 1kg",               category: "FS",         expiry_date: "2026-06-25", pic: "anis",    notes: null },
  { barcode: "9555678002", description: "Nestlé Bliss Yogurt Peach",     category: "FS",         expiry_date: "2026-06-18", pic: "anis",    notes: null },
  { barcode: "9555678003", description: "Gardenia Wholemeal Bread",      category: "FS",         expiry_date: "2026-06-16", pic: "nuraini", notes: "near expiry" },
  // OTC
  { barcode: "9501234001", description: "Panadol Actifast 500mg 20s",    category: "OTC",        expiry_date: "2027-01-31", pic: "nadiah",  notes: null },
  { barcode: "9501234002", description: "Zyrtec 10mg 10s",               category: "OTC",        expiry_date: "2026-08-30", pic: "najihah", notes: null },
  { barcode: "9501234003", description: "Strepsils Honey Lemon 24s",     category: "OTC",        expiry_date: "2026-06-22", pic: "anis",    notes: null },
  // Poison B
  { barcode: "9502345001", description: "Telfast 180mg 10s",             category: "Poison B",   expiry_date: "2026-09-30", pic: "nadiah",  notes: null },
  { barcode: "9502345002", description: "Arcoxia 90mg 10s",              category: "Poison B",   expiry_date: "2026-06-19", pic: "nuraini", notes: null },
  // Poison C
  { barcode: "9503456001", description: "Voltaren Emulgel 100g",         category: "Poison C",   expiry_date: "2026-07-31", pic: "najihah", notes: null },
  { barcode: "9503456002", description: "Brufen 400mg 10s",              category: "Poison C",   expiry_date: "2026-06-17", pic: "anis",    notes: "almost expired" },
  // PET CARE
  { barcode: "9557890001", description: "Royal Canin Mini Adult 2kg",    category: "PET CARE",   expiry_date: "2026-10-31", pic: "nuraini", notes: null },
  { barcode: "9557890002", description: "Whiskas Ocean Fish 1.2kg",      category: "PET CARE",   expiry_date: "2026-08-31", pic: "nadiah",  notes: null },
  // HS
  { barcode: "9558901001", description: "Pantene Pro-V Shampoo 650ml",   category: "HS",         expiry_date: "2027-03-31", pic: "najihah", notes: null },
  { barcode: "9558901002", description: "Dove Body Lotion 250ml",        category: "HS",         expiry_date: "2026-06-21", pic: "anis",    notes: null },
  { barcode: "9558901003", description: "Colgate Total 175g",            category: "HS",         expiry_date: "2026-11-30", pic: "nuraini", notes: null },
  { barcode: "9558901004", description: "Dettol Hand Sanitiser 50ml",    category: "HS",         expiry_date: "2026-06-14", pic: "nadiah",  notes: "expired yesterday" },
  { barcode: "9558901005", description: "Head & Shoulders 340ml",        category: "HS",         expiry_date: "2026-07-31", pic: "najihah", notes: null },
];

const now = new Date().toISOString();
for (const item of expiryItems) {
  insertExpiry.run(
    item.barcode, item.description, item.category, item.expiry_date,
    userIds[item.pic], item.pic.toUpperCase(), now, item.notes
  );
}
console.log(`✓ ${expiryItems.length} expiry logs inserted`);

// ── Offers ────────────────────────────────────────────────────────────────────
const insertOffer = db.prepare(`
  INSERT INTO offers (description, barcode, uom, quantity, has_alert, created_at, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const offerItems = [
  { description: "Dumex Mamil Gold Step 3 1.2kg", barcode: "9556234001", uom: "BOX",  quantity: 3,  has_alert: 1 },
  { description: "Milo Active 1kg",               barcode: "9555678001", uom: "BOX",  quantity: 5,  has_alert: 0 },
  { description: "Panadol Actifast 500mg 20s",    barcode: "9501234001", uom: "BOX",  quantity: 10, has_alert: 0 },
  { description: "Telfast 180mg 10s",             barcode: "9502345001", uom: "BOX",  quantity: 4,  has_alert: 1 },
  { description: "Royal Canin Mini Adult 2kg",    barcode: "9557890001", uom: "PCKT", quantity: 2,  has_alert: 0 },
  { description: "Pantene Pro-V Shampoo 650ml",   barcode: "9558901001", uom: "BOT",  quantity: 6,  has_alert: 0 },
  { description: "Voltaren Emulgel 100g",         barcode: "9503456001", uom: "ST",   quantity: 8,  has_alert: 1 },
  { description: "Colgate Total 175g",            barcode: "9558901003", uom: "BOX",  quantity: 12, has_alert: 0 },
];

for (const offer of offerItems) {
  insertOffer.run(offer.description, offer.barcode, offer.uom, offer.quantity, offer.has_alert, now, userIds["manager"]);
}
console.log(`✓ ${offerItems.length} offers inserted`);

// ── Returns ───────────────────────────────────────────────────────────────────
const insertReturn = db.prepare(`
  INSERT INTO returns (logged_date, pic_id, pic_name, category, description, barcode, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const returnItems = [
  { logged_date: "2026-04-10", pic: "nadiah",  category: "MOM & BABY", description: "Dumex Mamil Gold Step 3 1.2kg", barcode: "9556234001" },
  { logged_date: "2026-04-15", pic: "najihah", category: "FS",         description: "Milo Active 1kg",               barcode: "9555678001" },
  { logged_date: "2026-04-22", pic: "anis",    category: "OTC",        description: "Zyrtec 10mg 10s",               barcode: "9501234002" },
  { logged_date: "2026-05-03", pic: "nuraini", category: "Poison B",   description: "Arcoxia 90mg 10s",              barcode: "9502345002" },
  { logged_date: "2026-05-10", pic: "nadiah",  category: "HS",         description: "Dettol Hand Sanitiser 50ml",    barcode: "9558901004" },
  { logged_date: "2026-05-18", pic: "najihah", category: "Poison C",   description: "Brufen 400mg 10s",              barcode: "9503456002" },
  { logged_date: "2026-05-25", pic: "anis",    category: "PET CARE",   description: "Whiskas Ocean Fish 1.2kg",      barcode: "9557890002" },
  { logged_date: "2026-06-01", pic: "nuraini", category: "FS",         description: "Nestlé Bliss Yogurt Peach",    barcode: "9555678002" },
  { logged_date: "2026-06-08", pic: "nadiah",  category: "MOM & BABY", description: "Enfalac A+ Step 1 900g",        barcode: "9556234002" },
  { logged_date: "2026-06-12", pic: "najihah", category: "HS",         description: "Dove Body Lotion 250ml",        barcode: "9558901002" },
];

for (const r of returnItems) {
  insertReturn.run(r.logged_date, userIds[r.pic], r.pic.toUpperCase(), r.category, r.description, r.barcode, now);
}
console.log(`✓ ${returnItems.length} returns inserted`);

// ── History Log ───────────────────────────────────────────────────────────────
const insertHistory = db.prepare(`
  INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const historyEntries = [
  { action: "CREATE", module: "expiry",   record_id: 1,  pic: "nadiah",   description: "Logged expiry: Dumex Mamil Gold Step 3 1.2kg (2026-06-20)" },
  { action: "CREATE", module: "expiry",   record_id: 2,  pic: "nadiah",   description: "Logged expiry: Enfalac A+ Step 1 900g (2026-07-15)" },
  { action: "CREATE", module: "expiry",   record_id: 3,  pic: "najihah",  description: "Logged expiry: Friso Gold Step 2 850g (2026-05-10)" },
  { action: "CREATE", module: "expiry",   record_id: 4,  pic: "anis",     description: "Logged expiry: Milo Active 1kg (2026-06-25)" },
  { action: "CREATE", module: "expiry",   record_id: 5,  pic: "anis",     description: "Logged expiry: Nestlé Bliss Yogurt Peach (2026-06-18)" },
  { action: "CREATE", module: "expiry",   record_id: 6,  pic: "nuraini",  description: "Logged expiry: Gardenia Wholemeal Bread (2026-06-16)" },
  { action: "CREATE", module: "expiry",   record_id: 7,  pic: "nadiah",   description: "Logged expiry: Panadol Actifast 500mg 20s (2027-01-31)" },
  { action: "CREATE", module: "expiry",   record_id: 8,  pic: "najihah",  description: "Logged expiry: Zyrtec 10mg 10s (2026-08-30)" },
  { action: "CREATE", module: "expiry",   record_id: 9,  pic: "anis",     description: "Logged expiry: Strepsils Honey Lemon 24s (2026-06-22)" },
  { action: "CREATE", module: "expiry",   record_id: 10, pic: "nadiah",   description: "Logged expiry: Telfast 180mg 10s (2026-09-30)" },
  { action: "CREATE", module: "offers",   record_id: 1,  pic: "manager",  description: "Offer created: Dumex Mamil Gold Step 3 1.2kg x3 BOX" },
  { action: "CREATE", module: "offers",   record_id: 2,  pic: "manager",  description: "Offer created: Milo Active 1kg x5 BOX" },
  { action: "CREATE", module: "offers",   record_id: 3,  pic: "manager",  description: "Offer created: Panadol Actifast 500mg 20s x10 BOX" },
  { action: "CREATE", module: "offers",   record_id: 4,  pic: "manager",  description: "Offer created: Telfast 180mg 10s x4 BOX" },
  { action: "CREATE", module: "returns",  record_id: 1,  pic: "nadiah",   description: "Return logged: Dumex Mamil Gold Step 3 1.2kg (MOM & BABY)" },
  { action: "CREATE", module: "returns",  record_id: 2,  pic: "najihah",  description: "Return logged: Milo Active 1kg (FS)" },
  { action: "CREATE", module: "returns",  record_id: 3,  pic: "anis",     description: "Return logged: Zyrtec 10mg 10s (OTC)" },
  { action: "CREATE", module: "returns",  record_id: 4,  pic: "nuraini",  description: "Return logged: Arcoxia 90mg 10s (Poison B)" },
  { action: "UPDATE", module: "expiry",   record_id: 3,  pic: "manager",  description: "Updated notes on expiry log #3: already expired" },
  { action: "UPDATE", module: "offers",   record_id: 1,  pic: "manager",  description: "Updated has_alert on offer #1: enabled" },
  { action: "DELETE", module: "expiry",   record_id: 3,  pic: "manager",  description: "Deleted expired entry: Friso Gold Step 2 850g" },
  { action: "CREATE", module: "users",    record_id: 2,  pic: "manager",  description: "User created: nadiah (staff)" },
  { action: "CREATE", module: "users",    record_id: 3,  pic: "manager",  description: "User created: najihah (staff)" },
  { action: "CREATE", module: "users",    record_id: 4,  pic: "manager",  description: "User created: anis (staff)" },
  { action: "CREATE", module: "users",    record_id: 5,  pic: "manager",  description: "User created: nuraini (staff)" },
  { action: "CREATE", module: "expiry",   record_id: 11, pic: "nuraini",  description: "Logged expiry: Arcoxia 90mg 10s (2026-06-19)" },
  { action: "CREATE", module: "expiry",   record_id: 12, pic: "najihah",  description: "Logged expiry: Voltaren Emulgel 100g (2026-07-31)" },
  { action: "CREATE", module: "expiry",   record_id: 13, pic: "anis",     description: "Logged expiry: Brufen 400mg 10s (2026-06-17)" },
  { action: "CREATE", module: "expiry",   record_id: 14, pic: "nuraini",  description: "Logged expiry: Royal Canin Mini Adult 2kg (2026-10-31)" },
  { action: "CREATE", module: "expiry",   record_id: 15, pic: "nadiah",   description: "Logged expiry: Whiskas Ocean Fish 1.2kg (2026-08-31)" },
];

const timestamps = [
  "2026-04-01T08:00:00.000Z", "2026-04-02T09:15:00.000Z", "2026-04-05T10:30:00.000Z",
  "2026-04-08T11:00:00.000Z", "2026-04-10T08:45:00.000Z", "2026-04-12T14:20:00.000Z",
  "2026-04-15T09:00:00.000Z", "2026-04-18T10:00:00.000Z", "2026-04-22T11:30:00.000Z",
  "2026-04-25T13:00:00.000Z", "2026-05-01T08:30:00.000Z", "2026-05-03T09:00:00.000Z",
  "2026-05-05T10:15:00.000Z", "2026-05-08T11:00:00.000Z", "2026-05-10T08:00:00.000Z",
  "2026-05-12T09:30:00.000Z", "2026-05-15T10:00:00.000Z", "2026-05-18T11:15:00.000Z",
  "2026-05-20T14:00:00.000Z", "2026-05-22T15:30:00.000Z", "2026-05-25T08:00:00.000Z",
  "2026-05-28T09:00:00.000Z", "2026-05-30T10:30:00.000Z", "2026-06-01T08:15:00.000Z",
  "2026-06-03T09:45:00.000Z", "2026-06-05T10:00:00.000Z", "2026-06-08T11:30:00.000Z",
  "2026-06-10T08:00:00.000Z", "2026-06-12T09:00:00.000Z", "2026-06-14T10:30:00.000Z",
];

for (let i = 0; i < historyEntries.length; i++) {
  const h = historyEntries[i];
  insertHistory.run(
    h.action, h.module, h.record_id,
    userIds[h.pic], h.pic.toUpperCase(),
    h.description,
    timestamps[i] ?? now
  );
}
console.log(`✓ ${historyEntries.length} history entries inserted`);

db.close();
console.log("\nSeed complete.");
