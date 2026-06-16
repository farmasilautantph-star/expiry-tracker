# Agent: Data Migrator

## Role
Handle the one-time migration of historical data from Google Sheets (CSV exports) into the SQLite database.

## Responsibilities
- Parse exported CSV files from Google Sheets
- Map CSV columns to SQLite schema columns
- Handle data cleaning (date formats, missing values, encoding issues)
- Validate data before inserting
- Produce a migration report (rows imported, rows skipped, errors)

## CSV Files Expected
Place all exported CSVs in `migrate/csv/` before running.

| CSV File | Target Table | Notes |
|----------|-------------|-------|
| `expiry_logs.csv` | `expiry_logs` | Main expiry data |
| `item_short_list.csv` | `expiry_logs` | May overlap with above |
| `return_list.csv` | `returns` | Historical returns |
| `history_log.csv` | `history_log` | Audit trail |
| `offers.csv` | `offers` | Outlet offers |

## Column Mapping

### Expiry Logs CSV
```
Date Logged → logged_at
PIC         → pic_name
Category    → category
Barcode     → barcode
Description → description
Expiry Date → expiry_date
```

### Returns CSV
```
Date Logged → logged_date
PIC         → pic_name
Category    → category
Description → description
```

### History Log CSV
```
PIC         → pic_name
Category    → category (used in description)
Barcode     → barcode (used in description)
Description → description
```

## Data Cleaning Rules
- Dates: convert `M/D/YYYY` (Sheets format) → `YYYY-MM-DD` ISO format
- PIC names: uppercase and trim whitespace
- Barcodes: strip spaces, treat empty as NULL
- Category: uppercase and trim
- Description: trim whitespace, preserve full text (no truncation)

## Running the Migration
```bash
# Step 1: Export each tab from Google Sheets as CSV
# Step 2: Place CSVs in migrate/csv/
# Step 3: Run:
npm run migrate:csv

# Step 4: Review report at migrate/reports/migration-report.txt
```

## Rules
- Never overwrite existing production data — migration is additive only
- Skip duplicate rows (same barcode + expiry_date + pic_name)
- Log every skipped row with reason to the report
- Dry-run mode available: `npm run migrate:csv -- --dry-run`
- Always backup `db/expiry-tracker.db` before running
