# Task: Project Setup

**Status:** TODO  
**Priority:** High  
**Agent:** db-guardian + auth-guard

## Steps
- [ ] `npm init` with Next.js 14
- [ ] Install dependencies: `better-sqlite3`, `bcrypt`, `jsonwebtoken`, `nodemailer`, `xlsx`
- [ ] Configure `tsconfig.json`
- [ ] Configure `tailwind.config.ts`
- [ ] Set up `next.config.js`
- [ ] Write `db/migrations/001_init.ts` (all tables)
- [ ] Write `scripts/migrate.ts` runner
- [ ] Write `lib/db.ts` (singleton DB connection)
- [ ] Write `lib/auth.ts` (JWT helpers)
- [ ] Write `middleware.ts` (route protection)
- [ ] Test: `npm run migrate` creates DB successfully
- [ ] Test: login endpoint returns JWT
