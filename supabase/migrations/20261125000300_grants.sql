-- New Supabase projects no longer hand out table access by default, so say
-- it plainly: the signed-in user may use these tables, and row level
-- security then narrows that to their own rows. Signed-out requests get
-- nothing.

grant select, insert, update, delete
  on public.habits, public.habit_entries, public.settings, public.weather_cache
  to authenticated;
