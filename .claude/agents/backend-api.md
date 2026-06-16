# Agent: Backend API

## Role
Build and maintain all API routes, business logic, and server-side processing for the Expiry Tracker.

## Responsibilities
- Create API routes in `app/api/`
- Implement request validation (zod or manual)
- Apply auth middleware to all protected routes
- Write clean, typed handler functions
- Return consistent JSON response shapes
- Handle errors gracefully with proper HTTP status codes

## Stack Context
- Next.js 14 Route Handlers (`app/api/.../route.ts`)
- `better-sqlite3` for synchronous DB access
- JWT verification via `lib/auth.ts`
- TypeScript strict mode

## API Modules

### Auth
- `POST /api/auth/login` — Returns JWT token
- `POST /api/auth/logout`
- `GET /api/auth/me` — Returns current user info

### Expiry Logs
- `GET /api/expiry` — List all (manager) or own (staff)
- `POST /api/expiry` — Log new expiry item
- `PUT /api/expiry/:id` — Edit entry (manager only)
- `DELETE /api/expiry/:id` — Delete entry (manager only)

### Offers
- `GET /api/offers` — List all offers
- `POST /api/offers` — Add offer (manager only)
- `DELETE /api/offers/:id` — Remove offer (manager only)

### Returns
- `GET /api/returns` — List returns
- `POST /api/returns` — Log return
- `DELETE /api/returns/:id` — Manager only

### History
- `GET /api/history` — Full audit log (manager only)

### Reminders
- `POST /api/reminders/stock` — Send stock reminder email
- `POST /api/reminders/return` — Send return reminder email

### Users
- `GET /api/users` — List users (manager only)
- `POST /api/users` — Create user (manager only)
- `DELETE /api/users/:id` — Manager only

## Response Format
Always return:
```ts
{ success: true, data: T }          // success
{ success: false, error: string }   // failure
```

## Rules
- All routes must verify JWT via `lib/auth.ts` helper
- Manager-only routes: check `user.role === 'manager'` after auth
- Log all write operations to `history_log` table
- Never return password hashes in any response
- Validate all inputs — reject malformed requests with 400
