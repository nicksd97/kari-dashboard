@AGENTS.md

# Kari Dashboard — Project Rules

*Last updated: 2026-04-13*

## Auto Plan-and-Execute Workflow

Every task follows this sequence. No exceptions.

### 1. Plan (show before doing)
- Read relevant files before proposing changes
- Present a short numbered plan (what files change, what each step does)
- Wait for user confirmation — or proceed if the task is trivial (< 3 file edits, no new patterns)

### 2. Execute incrementally
- One logical change at a time
- Test or verify after each step when possible (`npm run build`, browser check)
- Commit at natural checkpoints if the user asks for commits

### 3. After every task
- Update `soul.md` if project state, architecture, or known issues changed
- Append a one-liner to `SESSION_LOG.md` with date and what was done

## Code Rules

- **Next.js 16 + React 19** — read `node_modules/next/dist/docs/` before using unfamiliar APIs
- **Norwegian UI** — all user-facing text in Norwegian (nb-NO)
- **Tailwind 4** — use CSS variables defined in `globals.css` for theming
- **Supabase** — all data queries go through `lib/data.ts`; demo fallback must keep working
- **shadcn/ui components** live in `components/ui/` — reuse before creating new ones
- **No global state library** — local useState is the pattern here
- **Server components** for data fetching, **client components** ("use client") for interactivity

## File Conventions

| Path | Purpose |
|---|---|
| `app/page.tsx` | Home — server-side fetch, passes data to Dashboard |
| `app/components/` | All dashboard UI components (client) |
| `app/project/[number]/` | Project detail route |
| `app/api/graph/` | Microsoft Graph proxy routes (OneDrive) |
| `lib/` | Data fetching, types, Supabase client, MS Graph helpers |
| `components/ui/` | Reusable shadcn-style primitives |

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, client-safe
- `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` — server-only (OneDrive)

## What NOT to do

- Don't remove the demo data fallback in `lib/data.ts`
- Don't add a global state manager (Redux, Zustand, etc.)
- Don't refactor working components without being asked
- Don't change the Norwegian locale or date formatting patterns
