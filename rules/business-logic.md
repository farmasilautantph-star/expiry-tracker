# Business Logic Rules

Core rules that govern how the Expiry Tracker behaves.

## Expiry Urgency Levels
| Status | Condition | Colour |
|--------|-----------|--------|
| Expired | expiry_date < today | 🔴 Red |
| Critical | 0–89 days from today | 🟠 Orange |
| Warning | 90–240 days from today | 🟡 Yellow |
| Safe | > 240 days from today | 🟢 Green |

Days-left badge display:
- Expired → "Expired"
- 0 days → "Today"
- 1–30 days → "Xd left"
- > 30 days → "Xm left" (rounded months)

## Reminder Rules
- Stock reminder: includes all items with status Expired or Critical
- Return reminder: includes all pending return items
- Reminders only sent by Manager role
- Dev environment: log to console, never send real email

## Review Deadline Rules
- Deadline: Every Sunday 11:59 PM Malaysia Time (GMT+8)
- Up to date (`pending`): reviewed after last Sunday 23:59:59 MYT
- Needs Review (`needs_review`): not reviewed since last Sunday (missed by 1 week)
- Critical (`critical_stale`): not reviewed since 2 Sundays ago (missed 2+ weeks)
- Manager reviews dashboard every Monday morning
- Staff must update all active items before Sunday midnight MYT
- Timezone: Asia/Kuala_Lumpur (UTC+8, no DST)

## History Log Rules
- Every CREATE, UPDATE, DELETE must write to `history_log`
- Log the PIC who performed the action
- Include human-readable description of what changed

## Categories
Standard categories in the system:
- MOM & BABY
- FS (Food Supplement)
- OTC (Over The Counter)
- Poison B
- Poison C
- PET CARE
- HS (Health Supplement)

## UOM (Unit of Measure)
Standard values for Offer Ke Outlet:
- BOX
- BOT (Bottle)
- ST (Strip)
- PCKT (Packet)

## Date Format
- Storage: ISO 8601 (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`)
- Display: Malaysian format `DD/MM/YYYY`
- Export (Excel): `DD/MM/YYYY`
