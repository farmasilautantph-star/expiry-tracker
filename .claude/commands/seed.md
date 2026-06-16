# Command: /seed

Seed the database with realistic sample data for development and testing.

## What It Creates
- 2 users: 1 manager + 3 staff PICs (NADIAH, NAJIHAH, ANIS, NURAINI)
- 20 expiry log entries across multiple categories
- 8 offer items with various UOMs
- 10 return entries
- 30 history log entries

## Sample Data Includes
- Items in categories: MOM & BABY, FS, OTC, Poison B, Poison C, PET CARE, HS
- Mix of expired, near-expiry (<30 days), and safe items
- Entries spread across April–June 2026

## Default Credentials (dev only)
```
Manager:  username: manager  / password: manager123
Staff 1:  username: nadiah   / password: staff123
Staff 2:  username: najihah  / password: staff123
Staff 3:  username: anis     / password: staff123
```

## Run
```bash
npm run seed
# WARNING: This clears existing data first
# To append without clearing:
npm run seed -- --append
```

## Rules
- Never run seed on production
- Seed script is at `scripts/seed.ts`
