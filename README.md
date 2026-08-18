# KINGPINS BATTLEGROUND

NBA 2K Pro-Am community league platform — automated statistics, screenshot AI
parsing, tournament brackets, game scheduling, and **admin-controlled awards**.
Built for a $0 hosting footprint: **Next.js (App Router) + TypeScript + Tailwind
on Vercel, Supabase (Postgres + Auth + Storage) on the free tier**.

## Design direction

Different from typical Pro-Am stat sites (e.g. ProAmLab's blue/orange look):
Kingpins Battleground uses a near-black **arena** background, **kingpin gold**
(`#D4AF37`) as the primary accent, and **battleground crimson** (`#C81E3A`) for
alerts/live states and calls to action. Display type is a condensed all-caps
face (Bebas Neue) for an arena-scoreboard feel; body copy is Inter; stats use
JetBrains Mono for tabular alignment. See `tailwind.config.ts` for the full
token set and `app/globals.css` for the applied theme.

## Core rule the whole system is built around

**Statistics can rank award candidates. Statistics never decide a winner.**
Admins always make the final call and must explicitly publish before anything
is public. This is enforced in three layers:

1. UI — the finalize/publish actions are separate, each with a confirmation modal.
2. Server actions (`lib/actions/awards.ts`) — require an authenticated admin session.
3. **Database trigger** (`supabase/schema.sql` → `enforce_award_status_flow`) —
   an award row can only move to `PUBLISHED` if it's already `FINALIZED`, and
   can only become `FINALIZED` if a `winner_player_id` was manually set.

The same "verify, don't auto-decide" pattern applies to bracket advancement
(`lib/actions/bracket.ts`) — winners only advance after an admin confirms a
series result, and every manual override writes an `audit_logs` row.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + AI provider keys
```

1. Create a free project at supabase.com.
2. Open the SQL editor and run `supabase/schema.sql` — this creates every
   table, index, and RLS policy in one pass.
3. Create your first admin: sign up a user via Supabase Auth, then insert a row
   into `profiles` with `role = 'ADMIN'`.
4. Fill `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — same page, **server-only, never commit this**.
   - `AI_PROVIDER_API_KEY` / `AI_PROVIDER_MODEL` — optional; screenshot parsing
     degrades gracefully to manual stat entry if unset.
5. In Supabase Storage, create a `game-screenshots` bucket (private).
6. `npm run dev`.

## Deploying

Push to GitHub → import into Vercel → set the same environment variables in
the Vercel project settings → deploy. No Docker, no VPS, no persistent server.

## Project structure

```
app/                      Next.js App Router pages
  admin/                  Admin-only routes (gated by middleware.ts + RLS)
    awards/[award]/       Candidate ranking + manual finalize/publish flow
    bracket/               Bracket management + override tool
    schedule/              Game scheduler
    tournaments/create/    Tournament + bracket generator
  awards/                 Public awards page (published only)
  bracket/                Public bracket
  schedule/               Public schedule with filters
  tournaments/[id]/       Tournament dashboard (bracket, seeds, results)
components/               Shared + admin UI
lib/
  actions/                Server actions (awards, bracket, schedule, tournaments)
  services/screenshot-parser.ts   The ONLY file that calls an AI/vision provider
  stats.ts                Deterministic statistics engine (no AI)
  supabase/               client.ts / server.ts / admin.ts
supabase/schema.sql       Full schema + RLS + the award status-flow trigger
```

## What's scaffolded vs. what to extend next

This zip is a working, deployable skeleton with the core admin-controlled
award flow, bracket generation/override, scheduling, and theming fully wired
end-to-end. A few areas are intentionally left as clear extension points for
your team to build out with real data:

- Screenshot upload UI + the `AWAITING_STATS → VERIFIED` review screen.
- Double-elimination bracket generation (single-elim is fully implemented).
- Standard tournament seeding order (1v8/4v5/etc — current seeding is sequential).
- Player profile pages with regular season vs. playoff stat splits.
- Notifications.

Everything in `supabase/schema.sql` already has the tables and RLS policies
these features need.
