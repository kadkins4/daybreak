-- Milestone one tables: Habit, Habit entry, Settings.
-- Every row belongs to one user and is locked to them with row level security.

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  short_name text,
  type text not null check (type in ('complete', 'increment')),
  daily_number integer not null default 1 check (daily_number >= 1),
  position integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index habits_user_position on public.habits (user_id, position);

-- One row per Habit per day. The day is Today's day (4:00 am rollover),
-- worked out on the screen that made the tap.
create table public.habit_entries (
  habit_id uuid not null references public.habits (id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (habit_id, day)
);

create index habit_entries_user_day on public.habit_entries (user_id, day);

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  fallback_place text not null default 'San Diego',
  fallback_latitude double precision not null default 32.7157,
  fallback_longitude double precision not null default -117.1611,
  rollover_minutes integer not null default 240 check (rollover_minutes between 0 and 1439)
);

alter table public.habits enable row level security;
alter table public.habit_entries enable row level security;
alter table public.settings enable row level security;

create policy "Owner can do everything with their habits"
  on public.habits for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Owner can do everything with their habit entries"
  on public.habit_entries for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Owner can do everything with their settings"
  on public.settings for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Signed-out requests get nothing, even before row level security applies.
revoke all on public.habits, public.habit_entries, public.settings from anon;

-- Live sync between screens.
alter table public.habit_entries replica identity full;
alter publication supabase_realtime add table public.habits, public.habit_entries;
