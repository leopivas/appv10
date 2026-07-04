---
name: Creatools visual design
description: tikscan.live-inspired dark design system — split login, sidebar sections, top bar with clock/badge/bell
---

## Design pattern
All colors use raw CSS (not Tailwind tokens) for the deep purple theme: background `#0a0814`, sidebar `rgba(255,255,255,0.02)`.

## Login page (login.tsx)
- Split 2-column: left = auth form (glass panel, `rgba(10,8,28,0.85)`), right = marketing with animated counters + top streamers grid + feature chips.
- Background: `linear-gradient(135deg, #0d0d1a, #12082a, #0a0a1f)` with radial glow orbs.
- Gradient submit button: `linear-gradient(90deg, #ec4899, #8b5cf6)`.
- Tabs for Entrar/Criar conta are custom buttons (no shadcn Tabs), active = purple bg.

## App layout (app-layout.tsx)
- Sidebar width: `w-60` expanded, `w-14` collapsed. Toggle stored in `localStorage.sidebar_collapsed`.
- Section headers: `text-[9px] font-bold uppercase tracking-[0.15em]` in `rgba(255,255,255,0.25)`.
- Active nav item: left border `2px solid #7c3aed`, bg `rgba(124,58,237,0.15)`, color `#a78bfa`.
- Top bar: live clock (`toLocaleTimeString pt-BR, hour12:false`), plan badge, bell icon with liveCount badge, logout shortcut.
- Plan badge colors: free=gray, basic=cyan `#22d3ee`, pro=orange `#f97316`.

## Setup wizard (/setup route)
- Accessible at `/setup` without auth. Auto-redirects to `/` if needsSetup=false.
- Steps: Welcome → Account (if no users) → tik.tools API → Alt API → Stripe → Done.
- Calls `/api/setup/status`, `/api/setup/test-api`, `/api/setup/complete`.

**Why:** User wants tikscan.live visual identity throughout the app, so do NOT revert to the old card-based login or the old sidebar style.
