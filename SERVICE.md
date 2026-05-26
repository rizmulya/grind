# Grind — Backend Services

Docker services powering Grind. No application server — just PostgreSQL + PostgREST + GoTrue.

## Services

| Service | Image | Port | Restart | Healthcheck |
|---|---|---|---|---|
| `db` | postgres:16-alpine | `5432` | `always` | `pg_isready` |
| `gotrue` | supabase/gotrue:v2.189.0 | `9999` | `always` | via `depends_on` |
| `postgrest` | postgrest/postgrest:v14.12 | `3000` | `always` | via `depends_on` |
| `trigger-setup` | postgres:16-alpine | — | `no` (one-shot) | — |
| `adminer` | adminer:latest | `8080` | `no` (manual) | — |

All secrets via `.env` — see `.env.example` for required variables.

## Schema

### Tables

| Table | Key columns |
|---|---|
| `users` | `id` (UUID), `username` (random 12-char hex), `name` (from Google), `email`, `avatar_url` |
| `categories` | `id`, `user_id` (null = system), `name`, `sort_order` |
| `habits` | `id`, `user_id`, `category_id`, `name`, `days_of_week[]`, `sort_order`, `is_active` |
| `monthly_targets` | `id`, `habit_id`, `year_month` (1st day), `target_count` — `UNIQUE(habit_id, year_month)` |
| `habit_logs` | `id`, `habit_id`, `user_id` (denormalized), `completed_date` — `UNIQUE(habit_id, user_id, completed_date)` |

### RPC Functions

| Function | Returns | Usage |
|---|---|---|
| `get_daily_progress(date)` | `total_scheduled`, `total_completed`, `progress_pct` | Today page |
| `get_monthly_progress(year_month)` | Per-habit: `habit_id`, `habit_name`, `category_name`, `target`, `completed`, `progress_pct` | Progress page |

### Auth Trigger

`sync_user_from_auth()` — SECURITY DEFINER function. Fires on INSERT into `auth.users` (GoTrue). Copies user to `public.users` with random username and OAuth display name.

Row-level security is enabled on all tables. Every query filtered by `current_user_id()` which reads the `sub` claim from the PostgREST-decoded JWT.

## API

### Auth (GoTrue)

| Endpoint | Method | Purpose |
|---|---|---|
| `/authorize?provider=google` | GET | Start OAuth flow (frontend redirect) |
| `/callback` | GET | OAuth callback (Google → GoTrue) |
| `/user` | GET | Get current user (token validation) |
| `/token?grant_type=refresh_token` | POST | Refresh access token |
| `/logout` | POST | Sign out (revoke refresh token) |

### CRUD (PostgREST — `http://localhost:3000`)

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/categories` | Ordered by `sort_order` |
| `POST` | `/categories` | `user_id` defaults to current user |
| `PATCH` | `/categories?id=eq.<id>` | Own categories only (RLS) |
| `DELETE` | `/categories?id=eq.<id>` | Own categories only |
| `GET` | `/habits` | Ordered by `sort_order`, `created_at` |
| `POST` | `/habits` | `user_id` auto-filled from JWT |
| `PATCH` | `/habits?id=eq.<id>` | Supports `sort_order` for reorder |
| `DELETE` | `/habits?id=eq.<id>` | Cascades to logs + targets |
| `GET` | `/monthly_targets` | Filter by `year_month` |
| `POST` | `/monthly_targets` | Upsert (conflict on `habit_id, year_month`) |
| `GET` | `/habit_logs` | Filter by `completed_date` |
| `POST` | `/habit_logs` | `user_id` auto-filled from JWT |
| `DELETE` | `/habit_logs?id=eq.<id>` | Own logs only |

### RPC

| Method | Endpoint |
|---|---|
| `POST` | `/rpc/get_daily_progress` |
| `POST` | `/rpc/get_monthly_progress` |

## Running

```bash
docker-compose up -d              # start all services
./test.sh                          # 29 integration tests
```

Adminer: `http://localhost:8080` (server: `db`, user: `grind`).  
Reset: `docker-compose down -v && docker-compose up -d`.
