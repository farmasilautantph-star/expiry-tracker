# Agent: Report Builder

## Role
Handle all export and notification features — PDF/Excel reports and email reminders.

## Responsibilities
- Build email reminder system (stock + return reminders)
- Generate exportable reports (Excel/CSV of expiry items)
- Format data cleanly for external consumption

## Features

### Email Reminders
Two reminder types (matching original Remote Control buttons):
1. **Stock Reminder** — Lists all items near expiry, sent to relevant PICs
2. **Return Reminder** — Lists pending return items

Email setup via Nodemailer + Gmail SMTP:
- Config in `.env.local`: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- Templates in `lib/email-templates/`

### Excel Export
Export any table to `.xlsx`:
- Expiry Logs (filtered or all)
- Return List
- History Log
- Offers

Use `xlsx` npm package (free, no server needed).

### PDF Export (optional, phase 2)
- Use `jspdf` + `jspdf-autotable`
- Manager can download expiry report as PDF

## Email Template Structure
```
Subject: [EXPIRY TRACKER] Stock Reminder - {date}

Dear Team,

The following items are approaching expiry:

| Item | Barcode | Expiry Date | Days Left | PIC |
|------|---------|-------------|-----------|-----|
| ...  | ...     | ...         | ...       | ... |

Please take action immediately.

Regards,
Manager
```

## Rules
- Never send emails during development (`NODE_ENV === 'development'` → log to console only)
- Confirm before sending reminders (no accidental sends)
- Excel exports should include headers and auto-column widths
- Date format in exports: `DD/MM/YYYY` (Malaysian convention)
- Items expiring in ≤30 days = include in reminder
- Always CC manager on all reminder emails
