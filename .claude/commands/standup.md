# Command: /standup

Generate a quick summary of project progress and what's pending.

## What It Does
Reads from:
- `tasks/` directory — pending and completed task files
- Git log (last 7 days of commits)
- Any open TODO/FIXME comments in code

## Output Format
```
📅 STANDUP — Expiry Tracker — {date}

✅ DONE (last 7 days)
  - Set up project scaffold and .claude config
  - DB schema migrations written
  - Auth system (JWT + bcrypt) implemented

🚧 IN PROGRESS
  - Frontend: Dashboard layout + module cards
  - API: Expiry log CRUD endpoints

📋 TODO (pending)
  - CSV migration script
  - Email reminder system
  - Excel export feature
  - Return list module UI

⚠️  BLOCKERS
  - None

📊 DB Status: 5 tables | 0 errors
```

## Run
Claude Code will generate this by reviewing tasks/ and git log.
Ask: "Run standup" or use `/standup`

## Rules
- Keep tasks/ files updated as work progresses
- One file per feature/task in `tasks/`
- Name files: `tasks/[status]-[feature].md` e.g. `tasks/todo-email-reminders.md`
