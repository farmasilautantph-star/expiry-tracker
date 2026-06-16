# 🔔 Expiry Tracker

Outlet inventory expiry tracking system. Built with Next.js + SQLite.
Rebuilt from Google AppScript for better performance and structure.

## Features
- Log short-expiry items with barcode, category, and PIC
- Manager and Staff role system
- Offer Ke Outlet tracking
- Return list management
- Full history audit log
- Email reminders (stock + return)
- Excel export
- Expiry countdown badges

## Stack
- **Next.js 14** (App Router)
- **SQLite** via `better-sqlite3`
- **JWT Auth** (httpOnly cookies)
- **Tailwind CSS**
- **Nodemailer** (Gmail SMTP)
- **TypeScript**

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Run migrations (creates DB)
npm run migrate

# 4. Seed sample data (dev only)
npm run seed

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default login (after seed):**
- Manager: `manager` / `manager123`
- Staff: `nadiah` / `staff123`

> ⚠️ Change passwords before going live!

## Data Migration (from Google Sheets)
See `migrate/` folder and `/migrate` command docs.

## Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run migrate` | Run DB migrations |
| `npm run seed` | Seed sample data |
| `npm run preflight` | Pre-commit checks |

## Claude Code Agents
See `.claude/agents/AGENTS.md`

## Claude Code Commands
See `.claude/commands/`
