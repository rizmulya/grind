# AGENTS.md — Grind Frontend

## Architecture

`UI → Service → Repository → Infrastructure`

### Rules

- **UI** imports Service only
- **Service** imports Repository (interface)
- **Repository store** imports Infrastructure clients
- **Entity** imports nothing (no React, no browser APIs)

### Folder pattern

```
<domain>/
  <domain>.entity.ts            — types (zero deps)
  <domain>.repository.ts        — interface
  <domain>.service.ts           — business logic
  store/<domain>.store.postgrest.ts — PostgREST impl
```

## Domains

| Domain | Entity | Repository | Service | Store |
|---|---|---|---|---|
| `auth` | AuthUser, AuthState | — | `createAuthService()` (singleton state machine) | — |
| `habit` | Habit, CreateHabitInput, UpdateHabitInput | `HabitRepository` | `habitService` | `habitPostgrestStore` |
| `habit-log` | HabitLog, CreateHabitLogInput | `HabitLogRepository` | `habitLogService` (incl `toggle()`) | `habitLogPostgrestStore` |
| `monthly-target` | MonthlyTarget | `MonthlyTargetRepository` | `monthlyTargetService` | `monthlyTargetPostgrestStore` |
| `category` | Category | `CategoryRepository` | `categoryService` | `categoryPostgrestStore` |
| `progress` | DailyProgress, HabitMonthlyProgress | — | `progressService` (RPC + client calc) | — |

## Auth

GoTrueClient (singleton) in `infrastructure/auth/`:

```ts
new GoTrueClient({
  url: gotrueUrl,           // http://localhost:9999
  autoRefreshToken: true,   // ~60s interval
  persistSession: true,     // localStorage key 'supabase.auth.token'
  detectSessionInUrl: true, // auto-parse OAuth redirect hash
})
```

`onAuthStateChange` listener syncs token to PostgREST client automatically.

### Auth state machine

```
loading ──init()──→ getSession()
  ├─ session found ──→ authenticated
  └─ none ──→ unauthenticated
authenticated ──signOut()──→ unauthenticated
unauthenticated ──signInWithGoogle()──→ redirect to GoTrue
```

## Components

| Component | Props | Use |
|---|---|---|
| `BottomNav` | activeTab, onTabChange | 5 tabs, `+` is floating circle |
| `DateNavigator` | date, onChange | ← →, "Back to today" |
| `MonthNavigator` | yearMonth, onChange | Month 'YY ← → |
| `ProgressRing` | progress, size | SVG ring with gradient |
| `HabitCheckItem` | name, completed, onToggle | Tap to toggle, strikethrough |
| `HabitFormModal` | open, categories, editHabit?, onClose, onSubmit | Create or edit (pre-filled) |
| `SetTargetModal` | open, habitName, currentTarget, monthLabel, onClose, onSubmit | Number input for target |

## DO / DON'T

**DO:**
- `@supabase/postgrest-js` for data access
- `@supabase/supabase-js` (GoTrueClient) for auth only
- TypeScript strict, async/await, function components
- Singleton infrastructure clients
- `.env` via `import.meta.env.VITE_*`
- `onAuthStateChange` to sync PostgREST token

**DON'T:**
- No direct PostgREST in UI
- No auth client in UI
- No business logic in repositories
- No `any`
- No backend code or ORM
- No manual hash parsing (use `detectSessionInUrl`)
