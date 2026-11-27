-- Journey tables: one row per Journey, and where the next one takes off.
-- Every row belongs to one user and is locked to them with row level security.

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode text not null default 'airplane' check (mode in ('airplane')),
  -- Airport codes. A Round Trip has no destination and an outbound heading.
  origin text not null,
  destination text,
  outbound_heading double precision check (outbound_heading >= 0 and outbound_heading < 360),
  planned_seconds integer not null check (planned_seconds > 0),
  planned_miles double precision not null check (planned_miles >= 0),
  focus text,
  status text not null default 'flying'
    check (status in ('flying', 'paused', 'landed', 'diverted')),
  took_off_at timestamptz not null default now(),
  -- Flying time banked up to the last pause. While flying, the time since
  -- resumed_at is added on top by the screen, so nothing ticks in here.
  flown_seconds integer not null default 0 check (flown_seconds >= 0),
  resumed_at timestamptz default now(),
  ended_at timestamptz,
  landed_at text,
  miles_earned double precision check (miles_earned >= 0),
  -- Where the user really was at takeoff, for the "have you moved?" check.
  takeoff_latitude double precision,
  takeoff_longitude double precision,
  check ((destination is null) = (outbound_heading is not null)),
  check ((status = 'flying') = (resumed_at is not null)),
  check ((status in ('landed', 'diverted')) = (ended_at is not null))
);

create index journeys_user_took_off on public.journeys (user_id, took_off_at desc);

-- One Journey at a time.
create unique index journeys_one_in_progress
  on public.journeys (user_id)
  where status in ('flying', 'paused');

-- The Current Airport. Empty until the first Journey is set up.
alter table public.settings add column current_airport text;

alter table public.journeys enable row level security;

create policy "Owner can do everything with their journeys"
  on public.journeys for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Signed-out requests get nothing, even before row level security applies.
revoke all on public.journeys from anon;
grant select, insert, update, delete on public.journeys to authenticated;

-- Live sync between screens.
alter table public.journeys replica identity full;
alter publication supabase_realtime add table public.journeys;
