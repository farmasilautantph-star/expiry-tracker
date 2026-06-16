# AGENTS — Expiry Tracker

This file lists all available Claude Code agents for this project.
Each agent has a focused role. Invoke by referencing the agent file or asking Claude to act as that agent.

---

## Available Agents

| Agent | File | Responsibility |
|-------|------|----------------|
| Frontend Dev | `agents/frontend-dev.md` | UI components, pages, Tailwind, dashboard modules |
| Backend API | `agents/backend-api.md` | API routes, business logic, middleware |
| DB Guardian | `agents/db-guardian.md` | SQLite schema, migrations, data integrity |
| Data Migrator | `agents/data-migrator.md` | Google Sheets CSV → SQLite import |
| Report Builder | `agents/report-builder.md` | PDF/Excel export, email reminders |
| Safe Refactor | `agents/safe-refactor.md` | Refactoring without breaking existing features |
| Auth Guard | `agents/auth-guard.md` | JWT auth, role-based access (Manager vs Staff) |

---

## When to Use Which Agent

- **Building a new UI module?** → `frontend-dev`
- **Adding a new API endpoint?** → `backend-api`
- **Changing DB schema?** → `db-guardian`
- **Importing old data from Sheets?** → `data-migrator`
- **Adding email / export feature?** → `report-builder`
- **Cleaning up messy code?** → `safe-refactor`
- **Auth bug or new role feature?** → `auth-guard`
