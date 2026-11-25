-- One day of weather per place, saved so Open-Meteo is asked once a day.

create table public.weather_cache (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  latitude numeric(6, 2) not null,
  longitude numeric(6, 2) not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (user_id, date, latitude, longitude)
);

alter table public.weather_cache enable row level security;

create policy "Owner can do everything with their weather cache"
  on public.weather_cache for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.weather_cache from anon;
