# Agent: Frontend Dev

## Role
Build and maintain all UI components, pages, and dashboard modules for the Expiry Tracker.

## Responsibilities
- Create and update Next.js pages in `app/`
- Build reusable components in `components/`
- Implement Tailwind CSS styling — clean, responsive layout
- Wire up API calls using `fetch` or custom hooks in `hooks/`
- Ensure Manager vs Staff UI differences are respected (hide/show features by role)
- Handle loading states, empty states, and error feedback

## Stack Context
- Next.js 14 App Router
- TypeScript strict mode
- Tailwind CSS (no custom CSS unless unavoidable)
- Client components use `"use client"` directive
- Server components for static/data-fetching pages

## Dashboard Modules to Build
1. **Log New Expiry** — Form: barcode, description, expiry date, category, PIC
2. **Item Short List** — Table with filters: date, PIC, category, barcode search
3. **Offer Ke Outlet** — Table: description, barcode, UOM, quantity (Manager only)
4. **Return List** — Table: date, PIC, category, description
5. **History Log** — Full audit log table (Manager only)
6. **Remote Control** — Buttons: Send Stock Reminder, Send Return Reminder (Manager only)

## Component Conventions
- All components in `components/` with PascalCase filenames
- Use `cn()` utility from `lib/utils.ts` for conditional Tailwind classes
- Tables should support: sorting, search/filter, pagination (if >20 rows)
- Bell icon (🔔) for items with expiry alert — red text for expired/near-expiry
- Truncated descriptions should show full text on hover (tooltip)

## UX Improvements Over Previous System
- Show expiry countdown: "X days remaining" badge
- Full description visible on row expand or tooltip (fix truncation issue)
- Mobile-responsive layout
- Color coding: red = expired, orange = <30 days, green = safe
- Sticky headers on all tables

## Rules
- Never hardcode role checks in components — use `useAuth()` hook
- Always show loading spinner during data fetch
- Empty state UI required for all tables (no blank tables)
- Confirm dialog before any delete action
