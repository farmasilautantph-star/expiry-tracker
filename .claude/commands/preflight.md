# Command: /preflight

Run all pre-commit checks. Must pass before pushing code.

## Checks Performed (in order)
1. TypeScript compile check — `tsc --noEmit`
2. ESLint — `eslint . --ext .ts,.tsx`
3. Build check — `next build` (catches runtime errors)
4. DB integrity — runs `check-db` script
5. No `.env.local` committed — scans staged files

## Run
```bash
npm run preflight
```

## Expected Output
```
[1/5] TypeScript check...   ✅ Pass
[2/5] ESLint...             ✅ Pass
[3/5] Build check...        ✅ Pass
[4/5] DB integrity...       ✅ Pass
[5/5] Env file check...     ✅ Pass

✅ All checks passed. Safe to commit.
```

## If Any Check Fails
Fix the issue before committing. Do not skip preflight.

## Script Location
`scripts/preflight.ts`

## Rules
- Run before every `git commit`
- If build fails, do not commit
- ESLint warnings are OK, errors are not
