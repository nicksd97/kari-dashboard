# Kari Dashboard — Soul

## Overview

Internal project management dashboard for **R. Samdal Snekkeri**, a Norwegian construction/carpentry company. Tracks construction projects, employee check-ins, quality checklists, deviations, and a sales lead pipeline. Built by Nick Davidson (PM, not a developer) using AI coding tools.

**Live at:** Vercel (deployed via GitHub)
**Database:** Supabase (PostgreSQL)
**File storage:** Microsoft OneDrive via Graph API

## Architecture

```
Next.js 16 (App Router) + React 19 + TypeScript
├── Server components   → data fetching (Supabase queries in lib/data.ts)
├── Client components   → all UI interactivity ("use client")
├── API routes          → Microsoft Graph proxy (OneDrive file access)
├── Styling             → Tailwind 4 + CSS variables (light/dark mode)
└── UI primitives       → shadcn-style components in /components/ui/
```

**Data flow:** `page.tsx` fetches server-side → passes props to `<Dashboard>` → child components render. Client-side toggle switches between live Supabase data and hardcoded demo data.

**Key integrations:**
- Supabase: projects, leads, checklists, deviations, checkins, employees, scores
- Microsoft Graph: OneDrive folder browsing, file preview/download per project
- DnD Kit: drag-drop lead pipeline (updates Supabase on drop)
- pdfjs-dist: client-side PDF rendering in project detail view

## Key Decisions

1. **No global state** — all state is local useState. Simple and sufficient for this app's complexity.
2. **Demo data fallback** — if Supabase is unreachable, the app works with hardcoded sample data. Critical for demos and offline dev.
3. **Norwegian throughout** — all UI text, date formatting (nb-NO), status labels are in Norwegian.
4. **Server/client split** — pages fetch data server-side; components are "use client" for interactivity.
5. **OneDrive via proxy** — API routes in `/api/graph/` proxy Microsoft Graph calls to keep credentials server-side.
6. **Employee-centric views** — timeline groups by employee, leaderboard scores monthly performance, sidebar shows check-in status per person.
7. **Scoring system** — monthly points: check-ins (+5), checklists (+10 on-time), deviations (variable), penalties for misses. Top scorer gets crown + confetti.

## Current State

- **Core features working:** Dashboard with timeline/leads tabs, sidebar (team, checklists, leaderboard), project detail with OneDrive/checklists/deviations, command palette search
- **Recent work:** Scoring overhaul, deviation points, scoreboard interactions (hover/tap), timeline improvements
- **Unstaged changes:** Multiple component updates + new shadcn UI components (badge, card, command, dialog, input, progress, sheet, skeleton, sonner, textarea)
- **Employees in system:** Roar, Andrii, Marci
- **Lead pipeline stages:** Ny → Kontaktet → Befaring → Oppfølging → Kvalifisert → Konvertert → Tapt

## Known Issues

- `fix-classname.js` and `replace.js` are loose utility scripts in project root (likely one-time migration tools, could be cleaned up)
- No automated tests exist
- No CI/CD pipeline configured (just Vercel auto-deploy)
- No polling or real-time subscriptions — data refreshes only on page load or manual refresh button
- PDF rendering capped at 30 pages (intentional performance limit)
