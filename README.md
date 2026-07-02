# UniTools

Student productivity suite built with Angular 19, Tailwind CSS 4, and Supabase.

## Features

### Timetable
- Weekly calendar grid (Mon–Fri, 7:00–21:00)
- Add, edit, delete classes with color coding
- Neptun `.ics` file import
- `.ics` export (weekly recurring events — works with Google Calendar, Apple Calendar, etc.)
- Responsive — shortened day names and horizontal scroll on mobile

### Grade Calculator
- Hungarian 1–5 grading scale
- Credit-weighted average calculation (subjects without a grade are ignored)
- Neptun `.xlsx` subject import with preview — subjects come in with credits,
  semester and completed status, you just fill in the grades later
- "Completed, grade pending" state for subjects
- Semester filtering
- Card layout on mobile, table on desktop

### Pomodoro Timer
- Full pomodoro cycle: focus → short break, long break after every N sessions
- Configurable durations, auto-start breaks/focus, sound and notification toggles
- Timer runs app-wide and survives page navigation and reloads (timestamp-based,
  so it stays accurate in background tabs)
- Browser notifications and audio chime on completion
- Tab title countdown, skip phase, cycle progress dots
- Session history with daily stats logged to Supabase

### Todos
- Two list types: checklists (tickable tasks) and notes (free-form,
  multiline text — for general stuff that isn't a task)
- Quick add, check off, delete, clear completed
- Click any task, note or list title to edit it inline
- Done counters and inline error feedback

### PWA
- Installable on phone/desktop ("Add to Home Screen") with app icon and
  standalone window
- App shell cached by a service worker for fast loads

## Tech Stack

- **Frontend:** Angular 19 (standalone components, Signals)
- **Styling:** Tailwind CSS 4 with custom dark/light theme
- **Backend:** Supabase (Auth, PostgreSQL, Row Level Security)
- **Deployment:** Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 18+
- Angular CLI (`npm install -g @angular/cli`)
- A Supabase project

### Setup

```bash
git clone https://github.com/LksLvnt/uni-tools.git
cd uni-tools
npm install
```

Create `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
};
```

### Database

Run these SQL statements in your Supabase SQL Editor:

```sql
-- Timetable
create table timetable_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  subject_name text not null,
  neptun_code text,
  day_of_week smallint not null check (day_of_week between 1 and 5),
  start_time time not null,
  end_time time not null,
  room text,
  instructor text,
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- Grades (grade is nullable: imported subjects may not have one yet)
create table grade_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  subject_name text not null,
  credit smallint not null check (credit > 0),
  grade smallint check (grade between 1 and 5),
  semester text,
  completed boolean,
  created_at timestamptz default now()
);

-- If you created grade_entries before the xlsx-import feature, migrate it:
-- alter table grade_entries alter column grade drop not null;
-- alter table grade_entries add column if not exists completed boolean;

-- Todos (kind: 'checklist' = tickable tasks, 'notes' = free-form notes)
create table todo_lists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  title text not null,
  kind text not null default 'checklist' check (kind in ('checklist', 'notes')),
  created_at timestamptz default now()
);

-- If you created todo_lists before the notes feature, migrate it:
-- alter table todo_lists add column if not exists kind text not null default 'checklist'
--   check (kind in ('checklist', 'notes'));

create table todo_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  list_id uuid references todo_lists(id) on delete cascade not null,
  content text not null,
  done boolean not null default false,
  created_at timestamptz default now()
);

-- Pomodoro
create table pomodoro_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  duration_minutes smallint not null,
  label text,
  completed_at timestamptz default now()
);

-- Enable RLS on all tables
alter table timetable_entries enable row level security;
alter table grade_entries enable row level security;
alter table pomodoro_sessions enable row level security;
alter table todo_lists enable row level security;
alter table todo_items enable row level security;

-- RLS policies (repeat pattern for each table)
-- Users can only read/write their own rows
create policy "Users see own entries" on timetable_entries for select using (auth.uid() = user_id);
create policy "Users insert own entries" on timetable_entries for insert with check (auth.uid() = user_id);
create policy "Users update own entries" on timetable_entries for update using (auth.uid() = user_id);
create policy "Users delete own entries" on timetable_entries for delete using (auth.uid() = user_id);

create policy "Users see own grades" on grade_entries for select using (auth.uid() = user_id);
create policy "Users insert own grades" on grade_entries for insert with check (auth.uid() = user_id);
create policy "Users update own grades" on grade_entries for update using (auth.uid() = user_id);
create policy "Users delete own grades" on grade_entries for delete using (auth.uid() = user_id);

create policy "Users see own sessions" on pomodoro_sessions for select using (auth.uid() = user_id);
create policy "Users insert own sessions" on pomodoro_sessions for insert with check (auth.uid() = user_id);
create policy "Users delete own sessions" on pomodoro_sessions for delete using (auth.uid() = user_id);

create policy "Users see own lists" on todo_lists for select using (auth.uid() = user_id);
create policy "Users insert own lists" on todo_lists for insert with check (auth.uid() = user_id);
create policy "Users update own lists" on todo_lists for update using (auth.uid() = user_id);
create policy "Users delete own lists" on todo_lists for delete using (auth.uid() = user_id);

create policy "Users see own items" on todo_items for select using (auth.uid() = user_id);
create policy "Users insert own items" on todo_items for insert with check (auth.uid() = user_id);
create policy "Users update own items" on todo_items for update using (auth.uid() = user_id);
create policy "Users delete own items" on todo_items for delete using (auth.uid() = user_id);
```

### Run

```bash
ng serve
```

Open `http://localhost:4200`.

### Build & Deploy

```bash
ng build
wrangler pages deploy dist/uni-tools/browser --project-name=uni-tools
```

## Project Structure

```
src/app/
├── core/
│   ├── services/        # Supabase, auth, timetable, grades, pomodoro, theme
│   └── guards/          # auth.guard, no-auth.guard
├── features/
│   ├── timetable/       # Weekly grid component
│   ├── grades/          # Grade calculator component
│   ├── pomodoro/        # Timer component
│   └── todos/           # Todo lists component
├── layout/shell/        # Sidebar + router outlet
├── auth/login/          # Login/signup/password reset
├── app.routes.ts
└── app.config.ts
```

## License

MIT