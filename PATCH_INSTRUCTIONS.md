# PATCH INSTRUCTIONS

Guidelines for applying patches and updates to the Expiry Tracker.

## Before Any Patch
1. Run `/verify` — confirm clean state
2. Backup DB: `cp db/expiry-tracker.db db/expiry-tracker.backup.db`
3. Note current version in git: `git log --oneline -5`

## DB Schema Changes
- NEVER edit existing migration files
- Create new migration: `db/migrations/00X_description.ts`
- Test on a copy of DB first
- Run `/check-db` after applying

## API Changes
- If changing response shape → update all consumers (frontend hooks)
- If adding required fields → update DB migration + frontend forms
- Test both manager and staff roles after API changes

## Frontend Changes
- Run full build (`next build`) before committing
- Check both mobile and desktop layouts
- Verify manager-only UI is hidden for staff

## Rollback
```bash
# Restore DB backup
cp db/expiry-tracker.backup.db db/expiry-tracker.db

# Revert code
git revert HEAD
```

## Versioning
No formal versioning yet. Use git commits with clear messages:
- `feat: add Excel export to expiry logs`
- `fix: truncated description in offers table`
- `chore: run cleanup + format`
- `db: add notes column to expiry_logs`
