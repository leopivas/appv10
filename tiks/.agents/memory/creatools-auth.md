---
name: Creatools auth system
description: Custom self-hostable JWT auth — no Replit Auth, no Clerk, designed for own-server deployment
---

## Design
- bcryptjs (SALT_ROUNDS=10) for password hashing
- jsonwebtoken (30d expiry) for sessions
- Token stored in localStorage under key `creatools_token`
- Users persisted to `artifacts/api-server/data/users.json`
- No external DB, no Replit services

## Key rules
- First user to register automatically becomes `isAdmin: true`
- JWT_SECRET reads from `process.env.JWT_SECRET` (falls back to dev default — must be set in production)
- `authFetch(path, token, opts)` exported from auth-context for use in pages

## Backend routes (all under /api)
- POST /auth/register — creates user; first = admin
- POST /auth/login — returns JWT + user
- GET  /auth/me — verify token, return user
- PATCH /auth/profile — update name/email
- PATCH /auth/password — change password (requires currentPassword)
- POST /auth/logout — stateless (no-op)
- GET  /auth/users — admin only: list all users
- PATCH /auth/users/:id — admin only: update plan/isAdmin/name/email
- DELETE /auth/users/:id — admin only: remove user (cannot self-delete)

## Frontend pages
- /login — login + register form (GuestRoute — redirects to / if logged in)
- /profile — edit name/email, change password
- /admin — user management table with plan selector and role toggle (AdminRoute)
- /pricing — tik.tools tier comparison cards

## Restart note
After any change to api-server code, restart workflow `artifacts/api-server: API Server` to rebuild.

**Why custom:** User explicitly wants 100% self-hostable system, no Replit vendor lock-in.
