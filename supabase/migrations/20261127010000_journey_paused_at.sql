-- When a Journey was paused, so one left paused can be ended at day rollover.
alter table public.journeys add column paused_at timestamptz;

alter table public.journeys
  add constraint journeys_paused_has_time
  check ((status = 'paused') = (paused_at is not null));
