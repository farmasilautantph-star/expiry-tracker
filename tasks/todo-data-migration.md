# Task: Data Migration from Google Sheets

**Status:** TODO  
**Priority:** Medium  
**Agent:** data-migrator

## Steps
- [ ] Export all Google Sheets tabs as CSV
- [ ] Place in `migrate/csv/`
- [ ] Write `migrate/parse-csv.ts`
- [ ] Write `migrate/import-expiry-logs.ts`
- [ ] Write `migrate/import-returns.ts`
- [ ] Write `migrate/import-history.ts`
- [ ] Write `migrate/import-offers.ts`
- [ ] Write migration report generator
- [ ] Test with dry-run mode
- [ ] Run full migration
- [ ] Run `/check-db` to verify
