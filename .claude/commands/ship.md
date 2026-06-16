# Command: /ship

Prepare and build the project for production deployment.

## Steps
1. Run `/verify` — must fully pass
2. Run `/cleanup` — tidy code
3. Run `next build` — production build
4. Output build summary and file sizes
5. Remind to backup DB before deploying

## Run
```bash
npm run ship
```

## Pre-Ship Checklist (manual)
- [ ] `.env.local` has production values (JWT_SECRET, GMAIL_APP_PASSWORD)
- [ ] DB is backed up: `cp db/expiry-tracker.db db/expiry-tracker.backup.db`
- [ ] All CSV migrations have been run (if first deploy)
- [ ] Manager account password changed from default
- [ ] Test login as both manager and staff

## Deployment
This app runs locally (no cloud deployment required).
Start production server with:
```bash
npm run build && npm start
```
Runs on `http://localhost:3000` by default.

## Rules
- Never ship if `/verify` has errors
- Always backup DB before shipping to production
- Change default seed passwords before going live
