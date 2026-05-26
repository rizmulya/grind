# Grind

Habit tracking app.

Built with React + PostgREST + GoTrue + PostgreSQL.

<p align="center">
  <img src="./frontend/public/grind-overview.png" alt="Grind Screenshot" width="1024">
</p>

---

## Architecture

```mermaid
graph TB
    subgraph Frontend :5173
        Auth["Auth Page<br/>Sign in with Google"]
        Today["Today<br/>Daily checklist"]
        Progress["Progress<br/>Monthly view"]
        Habits["Habits<br/>Manage + reorder"]
        Profile["Profile & Legal"]
    end

    subgraph Docker
        GT["GoTrue :9999<br/>OAuth + JWT"]
        PR["PostgREST :3000<br/>REST API"]
        DB[("PostgreSQL 16<br/>:5432")]
    end

    Auth-->|redirect|GT
    GT-->|JWT|Auth
    Today & Progress & Habits-->|Bearer JWT|PR
    PR-->|SQL + RLS|DB
    GT-->|auth users|DB
```

## User Flow

```mermaid
flowchart LR
    A["1. Sign in<br/>with Google"]-->B["2. Add habit<br/>(name + category + days)"]
    B-->C["3. Set target<br/>(per month)"]
    C-->D["4. Daily checklist<br/>(tap to toggle)"]
    D-->E["5. View progress<br/>(monthly %)"]
    E-->|adjust target|C
    D-->|new habits|B
```

1. **Sign in** — Google OAuth via GoTrue. `sync_user_from_auth()` trigger copies user to `public.users`. JWT stored by GoTrueClient (auto-refresh, persist session).

2. **Add habit** — `POST /habits` with `name`, `category_id`, `days_of_week[]`. `user_id` auto-filled from JWT. Sortable later via drag & drop.

3. **Set target** — Tap a habit on Progress page → `UPSERT monthly_targets` on conflict `(habit_id, year_month)`. Establishes a baseline for percentage calculation.

4. **Checklist** — Tap a habit on Today page → `habitLogService.toggle()` creates or deletes a `habit_log` row. Idempotent. Progress ring updates via server refetch.

5. **Progress** — `RPC get_monthly_progress()` LEFT JOINs habits → categories → targets → logs. Returns per-habit: `target`, `completed`, `progress_pct`. Average calculated client-side.

## Security

| Layer | Mechanism |
|---|---|
| Auth | Google OAuth only. JWT signed with secret from `.env` |
| Multi-user | RLS on every table via `current_user_id()` from JWT sub |
| Token | GoTrueClient auto-refresh (`persistSession`, `detectSessionInUrl`) |
| Data isolation | `anon` = SELECT only. `authenticated` cannot INSERT `users` (trigger only) |
| Credentials | All secrets via `.env` (DB, JWT, Google OAuth) |

## Quick Start

```bash
cp .env.example .env                 # fill Google OAuth credentials
docker-compose up -d                 # start backend services
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173` → Sign in with Google.

```bash
# optional: seed demo data
./demo.sh
```

---

See [SERVICE.md](./SERVICE.md) for backend services & API reference.  
See [frontend/README.md](./frontend/README.md) for frontend details.
