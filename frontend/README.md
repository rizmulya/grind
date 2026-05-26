# Grind Frontend

Mobile-first React UI for Grind.

## Stack

- React 19 + TypeScript (strict)
- Tailwind CSS v4 + Poppins
- Headless UI + Heroicons
- PostgREST via `@supabase/postgrest-js`
- GoTrue via `@supabase/supabase-js` (GoTrueClient)

## Architecture

```
UI → Service → Repository → Infrastructure (PostgREST / GoTrue)
```

| Layer | Role |
|---|---|
| **UI** | Pages & components — calls services only |
| **Service** | Validation, orchestration, business logic |
| **Repository** | Interface + PostgREST store implementation |
| **Infrastructure** | Singleton HTTP clients |

## Pages

| Page | Tab | What it does |
|---|---|---|
| **Auth** | — | Google OAuth sign-in, gradient background |
| **Today** | Today | Date navigator, progress ring, habit checklist (tap to toggle) |
| **Progress** | Progress | Month navigator, average %, per-habit bars, tap to set target |
| **Add** | + | Modal: create or edit habit (name, category, days) |
| **Habits** | Habits | List all habits, tap to edit, drag & drop reorder |
| **Profile** | Profile | Avatar, name, sign out, app info, link to Terms & Privacy |
| **Legal** | — | Full TOS + Privacy Policy |

## Setup

```bash
cp .env.example .env
npm install
npm run dev              # → http://localhost:5173
```

Backend must be running: `docker-compose up -d` in project root.

## Build

```bash
npm run build            # → dist/
```

See [AGENTS.md](./AGENTS.md) for architecture rules & agent guidance.  
See [backend docs](../SERVICE.md) for API reference.
