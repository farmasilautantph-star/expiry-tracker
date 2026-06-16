# Command: /add-module

Scaffold a new dashboard module with all required files.

## What It Creates
Given a module name (e.g. `StockCount`), generates:

```
app/api/stock-count/route.ts         # API route (GET + POST)
app/api/stock-count/[id]/route.ts    # API route (PUT + DELETE)
components/stock-count/              # Component folder
  StockCountTable.tsx                # Table component
  StockCountForm.tsx                 # Add/edit form
  StockCountModule.tsx               # Module wrapper
hooks/useStockCount.ts               # Data fetching hook
db/migrations/00X_add_stock_count.ts # Schema migration
```

## Usage
Tell Claude Code:
> "Add a new module called StockCount. It tracks: date, PIC, item barcode, quantity counted, notes. Manager can edit/delete, staff can add."

Claude will:
1. Generate migration with correct schema
2. Generate typed API routes with auth checks
3. Generate UI components matching existing module style
4. Register module in the dashboard layout

## Rules
- New modules must follow existing patterns (same response shape, same auth check pattern)
- Always add to `history_log` on write operations
- Add module to `CLAUDE.md` Key Modules section after creating
- Run `/check-db` after adding migration
