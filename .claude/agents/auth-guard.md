# Agent: Auth Guard

## Role
Own all authentication and role-based access control (RBAC) logic for the Expiry Tracker.

## Responsibilities
- JWT token generation and verification
- Password hashing and comparison (bcrypt)
- Middleware for protecting API routes
- Role enforcement: Manager vs Staff
- Session/token management on frontend

## Auth Flow
```
1. User submits username + password to POST /api/auth/login
2. Server verifies password against bcrypt hash in DB
3. Server returns signed JWT (24hr expiry)
4. Client stores JWT in httpOnly cookie (not localStorage)
5. All subsequent API requests include cookie
6. Middleware verifies JWT on every protected route
```

## Role Definitions

### Staff (PIC)
- Can: log expiry, log returns, view own entries
- Cannot: view other PIC entries, delete, edit, send reminders, manage offers, manage users

### Manager
- Can: everything
- Full dashboard access, all PICs' data, admin features

## Files Owned
- `lib/auth.ts` — JWT helpers (sign, verify, extract user)
- `lib/password.ts` — bcrypt hash/compare
- `middleware.ts` — Next.js middleware for route protection
- `app/api/auth/` — Login/logout/me routes

## JWT Payload Shape
```ts
{
  userId: number
  username: string
  role: 'manager' | 'staff'
  picName: string
  iat: number
  exp: number
}
```

## Middleware Route Rules
```ts
// Protected routes (require any valid JWT)
/dashboard/*
/api/expiry/*
/api/returns/*
/api/history/*
/api/offers/*
/api/reminders/*

// Manager-only routes (require role === 'manager')
/api/users/*
/api/offers (POST, DELETE)
/api/expiry (PUT, DELETE)
/api/history
/api/reminders/*
/dashboard/admin/*
```

## Rules
- JWT secret must be in `.env.local` as `JWT_SECRET` — never hardcode
- Tokens stored in httpOnly cookies only — never localStorage
- bcrypt rounds: minimum 10
- On failed auth: always return 401 with `{ success: false, error: 'Unauthorized' }`
- On failed role check: return 403 with `{ success: false, error: 'Forbidden' }`
- Never leak whether a username exists during login (same error for wrong user/pass)
