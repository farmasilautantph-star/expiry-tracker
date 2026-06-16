# Architecture Overview

## System Design

```
Browser (Next.js Frontend)
        ↕ HTTP (same origin)
Next.js API Routes (app/api/)
        ↕
better-sqlite3 (synchronous)
        ↕
SQLite DB file (db/expiry-tracker.db)
```

## Auth Flow
```
Login form → POST /api/auth/login
           → bcrypt verify password
           → sign JWT
           → set httpOnly cookie
           → redirect to /dashboard
```

## Data Flow (example: log expiry)
```
Staff fills form
→ POST /api/expiry
→ middleware verifies JWT
→ insert into expiry_logs
→ insert into history_log
→ return { success: true, data: newEntry }
→ frontend updates table
```

## Module Layout
Each dashboard module is self-contained:
```
components/[module]/
  [Module]Module.tsx    ← orchestrator
  [Module]Table.tsx     ← display
  [Module]Form.tsx      ← add/edit
hooks/use[Module].ts    ← data + mutations
app/api/[module]/
  route.ts              ← GET, POST
  [id]/route.ts         ← PUT, DELETE
```

## Key Libraries
| Library | Purpose |
|---------|---------|
| `better-sqlite3` | Synchronous SQLite access |
| `bcryptjs` | Password hashing |
| `jsonwebtoken` | JWT sign/verify |
| `nodemailer` | Email sending |
| `xlsx` | Excel export |
| `date-fns` | Date formatting/math |
