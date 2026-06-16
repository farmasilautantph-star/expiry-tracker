# Command: /expiry-check

List all items approaching or past expiry date. Domain-specific diagnostic.

## What It Does
Queries `expiry_logs` and outputs a summary grouped by urgency:

```
🔴 EXPIRED (past expiry date)
  - ACCU-CHEK ACTIVE 25 TEST STRIPS | 4015630064151 | Expired: 27/03/2026 | PIC: ANIS

🟠 CRITICAL (≤7 days remaining)
  - GKB EURYCOZIN 500 MG 60 VCAPS | 9555733100806 | Expires: 12/06/2026 (2 days) | PIC: NAJIHAH

🟡 WARNING (8–30 days remaining)
  - B BRAUN 0.9% NACL INJECTION | APX10610 | Expires: 30/06/2026 (20 days) | PIC: ANIS

✅ SAFE (>30 days remaining): 84 items

Summary: 1 expired | 3 critical | 12 warning | 84 safe
```

## Filters (optional)
```bash
npx ts-node scripts/expiry-check.ts --pic=NADIAH
npx ts-node scripts/expiry-check.ts --category="MOM & BABY"
npx ts-node scripts/expiry-check.ts --days=14
```

## Run
```bash
npx ts-node scripts/expiry-check.ts
```

## Use Cases
- Daily check during morning standup
- Before sending stock reminders
- Manager review
