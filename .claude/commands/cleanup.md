# Command: /cleanup

Remove dead code, fix formatting, and tidy the project.

## What It Does
1. Runs Prettier on all `.ts` / `.tsx` files
2. Removes unused imports (via ESLint auto-fix)
3. Deletes empty files
4. Checks for TODO/FIXME comments and lists them
5. Identifies components that are imported but never used

## Run
```bash
npm run cleanup
```

## Output Example
```
🧹 Formatted 12 files
🗑️  Removed 3 unused imports
📋 TODOs found:
   - components/ExpiryTable.tsx:45 — TODO: add pagination
   - lib/auth.ts:12 — FIXME: handle token refresh

✅ Cleanup complete
```

## Rules
- Run cleanup before raising a PR
- Never delete files that are referenced elsewhere
- After cleanup, always run `/preflight` to confirm nothing broke
