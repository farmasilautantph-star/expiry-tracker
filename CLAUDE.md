# EXPIRY TRACKER — Claude Code Instructions

## Project Overview
A Next.js + SQLite expiry tracking system for outlet inventory management.
Rebuilt from Google AppScript. Tracks short-expiry items, returns, offers, and history logs.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** SQLite via `better-sqlite3`
- **Auth:** JWT + bcrypt (Manager / Staff roles)
- **Styling:** Tailwind CSS
- **Email:** Nodemailer + Gmail SMTP
- **Language:** TypeScript

## Roles
- **Manager:** Full access — view all staff, delete/edit, send reminders, manage offers, manage users
- **Staff (PIC):** Limited — log expiry, view own entries, view return list

## Project Structure
```
expiry-tracker/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # REST API endpoints
│   ├── dashboard/        # Manager dashboard
│   ├── login/            # Auth pages
│   └── layout.tsx
├── components/           # Reusable UI components
├── lib/                  # Utilities: db, auth, email
├── hooks/                # Custom React hooks
├── db/                   # SQLite DB file + migrations
├── scripts/              # Utility scripts (seeding, checks)
├── migrate/              # CSV → SQLite migration scripts
├── docs/                 # Project documentation
├── tasks/                # Pending tasks / feature backlog
└── rules/                # Business logic rules documentation
```

## Coding Rules
- Always use TypeScript strict mode
- All API routes must check auth middleware
- Manager-only routes must check `role === 'manager'`
- Never expose passwords or JWT secrets in responses
- Use `better-sqlite3` (synchronous) — no async/await for DB calls
- All dates stored as ISO strings in SQLite
- Tailwind only — no custom CSS files unless necessary

## Database
- DB file lives at `db/expiry-tracker.db`
- Migrations in `db/migrations/` — numbered sequentially (001, 002...)
- Run migrations via `npm run migrate`

## Key Modules
1. **Log New Expiry** — Staff logs short-expiry items with barcode, date, PIC
2. **Item Short List** — All logged expiry items, filterable by PIC/category
3. **Offer Ke Outlet** — Manager logs items offered to outlet with barcode/UOM/qty
4. **Return List** — Items returned, tracked by PIC and category
5. **History Log** — Full audit trail, manager-only view
6. **Remote Control** — Manager sends email reminders (stock/return)

## Health Score Formula
`MIN(100, MAX(0, 100 - (expired×3 + critical×2 + warning×0.5) + (safe×2)))`
- Expired: −3 pts per item
- Critical: −2 pts per item
- Warning: −0.5 pts per item
- Safe: +2 pts per item
- Calculated in: `app/api/dashboard/health/route.ts`
- Displayed in: `components/dashboard/SystemHealthCard.tsx` (desktop), `components/mobile/MobileDashboard.tsx` (score only)

## Environment Variables
See `.env.example` for all required variables.

## Commands Reference
- `npm run dev` — Start development server
- `npm run migrate` — Run DB migrations
- `npm run seed` — Seed sample data
- `npm run build` — Production build
- `/check-db` — Verify DB schema integrity
- `/expiry-check` — List items expiring soon
- `/preflight` — Pre-commit checks
