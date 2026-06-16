# Command: /verify

Full project verification — runs all checks end to end.

## What It Runs
1. `/check-db` — DB schema and integrity
2. TypeScript compile
3. ESLint
4. Next.js build
5. `/expiry-check` — Domain logic smoke test
6. Manual API smoke test (if dev server is running)

## Run
```bash
npm run verify
```

## When to Use
- After a major refactor
- Before marking a task as done
- After pulling latest changes from git
- Before running `/ship`

## Expected Output
```
[DB]        ✅ Schema valid | 5 tables | 0 errors
[TypeScript] ✅ No type errors
[ESLint]    ✅ No errors
[Build]     ✅ Build successful
[Domain]    ✅ Expiry check ran — 2 warnings, 0 errors

✅ Project verified. Ready to ship.
```
