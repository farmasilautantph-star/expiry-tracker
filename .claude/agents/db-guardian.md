# Agent: DB Guardian

## Role
Own the SQLite database schema, migrations, and data integrity for the Expiry Tracker.

## Responsibilities
- Write and maintain migration files in `db/migrations/`
- Ensure schema is always in sync with application needs
- Validate DB integrity (missing columns, wrong types, orphaned rows)
- Write seed data scripts for development
- Document all tables and columns

## Stack Context
- SQLite via `better-sqlite3` (synchronous)
- DB file: `db/expiry-tracker.db`
- Migrations: numbered files `001_init.ts`, `002_add_X.ts`, etc.
- Migration runner: `scripts/migrate.ts`

## Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| username | TEXT UNIQUE | Login username |
| password_hash | TEXT | bcrypt hash |
| role | TEXT | 'manager' or 'staff' |
| pic_name | TEXT | Display name (e.g. NADIAH) |
| created_at | TEXT | ISO datetime |

### `expiry_logs`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| barcode | TEXT | Product barcode |
| description | TEXT | Full product name |
| category | TEXT | e.g. MOM & BABY, FS, OTC |
| expiry_date | TEXT | ISO date |
| pic_id | INTEGER FK | → users.id |
| pic_name | TEXT | Denormalized for display |
| logged_at | TEXT | ISO datetime |
| notes | TEXT | Optional |

### `offers`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| description | TEXT | |
| barcode | TEXT | |
| uom | TEXT | Unit of measure (BOX, BOT, ST, PCKT) |
| quantity | INTEGER | |
| has_alert | INTEGER | 0 or 1 (boolean) |
| created_at | TEXT | |
| created_by | INTEGER FK | → users.id |

### `returns`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| logged_date | TEXT | ISO date |
| pic_id | INTEGER FK | → users.id |
| pic_name | TEXT | |
| category | TEXT | |
| description | TEXT | |
| barcode | TEXT | |
| created_at | TEXT | |

### `history_log`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| action | TEXT | CREATE, UPDATE, DELETE |
| module | TEXT | expiry, offers, returns, users |
| record_id | INTEGER | ID of affected record |
| pic_id | INTEGER FK | Who did it |
| pic_name | TEXT | |
| description | TEXT | Human-readable summary |
| timestamp | TEXT | ISO datetime |

## Migration Rules
- Never modify existing migration files — always add a new one
- Each migration must be idempotent (safe to run twice)
- Use `CREATE TABLE IF NOT EXISTS`
- Test migration on fresh DB before committing

## Urgency Thresholds
| Status | Condition |
|--------|-----------|
| Expired | days_left < 0 |
| Critical | 0 ≤ days_left < 90 |
| Warning | 90 ≤ days_left ≤ 240 |
| Safe | days_left > 240 |

These thresholds must be consistent across:
- `app/api/shortlist/route.ts` (calcUrgency)
- `app/api/expiry/stats/route.ts`
- `app/api/dashboard/weekly/route.ts` (SQL CASE)
- `scripts/expiry-check.ts`
- `components/expiry/ExpiryTable.tsx` (getUrgency)

## Integrity Checks
Run `/check-db` to verify:
- All expected tables exist
- No orphaned foreign key references
- expiry_date values are valid ISO dates
- No null values in required fields
