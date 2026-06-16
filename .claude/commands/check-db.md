# Command: /check-db

Verify the SQLite database schema and data integrity.

## What It Does
1. Opens `db/expiry-tracker.db`
2. Checks all required tables exist
3. Validates column presence on each table
4. Checks for null violations in required fields
5. Validates date format in `expiry_date` and `logged_at` columns
6. Reports row counts per table
7. Flags any orphaned foreign key references

## Expected Output
```
✅ Table: users          (4 rows)
✅ Table: expiry_logs    (128 rows)
✅ Table: offers         (12 rows)
✅ Table: returns        (45 rows)
✅ Table: history_log    (310 rows)

✅ Date format check: expiry_logs.expiry_date — OK
✅ Date format check: expiry_logs.logged_at — OK
⚠️  Null check: expiry_logs.barcode — 3 null values found (IDs: 12, 45, 67)

Summary: 1 warning, 0 errors
```

## Run
```bash
npx ts-node scripts/check-db.ts
```
