# Command: /migrate

Run database migrations or CSV data import.

## Two Sub-Modes

### 1. Schema Migration (DB setup / updates)
Runs numbered migration files in `db/migrations/` in order.
```bash
npm run migrate
```
Use this when: setting up fresh DB, or applying schema changes.

### 2. CSV Data Migration (Google Sheets import)
Imports historical data from CSV exports placed in `migrate/csv/`.
```bash
npm run migrate:csv
# Dry run (no DB writes):
npm run migrate:csv -- --dry-run
```
Use this when: importing old AppScript data into the new system.

## Before Running
- Backup DB: `cp db/expiry-tracker.db db/expiry-tracker.backup.db`
- Place CSVs in `migrate/csv/` (see data-migrator agent for filenames)
- Confirm `.env.local` is set up

## After Running
- Run `/check-db` to verify data integrity
- Check `migrate/reports/migration-report.txt` for import summary
