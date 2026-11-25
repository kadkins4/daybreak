-- Give every user a Settings row and the four day-one Habits from the spec.

create function public.set_up_new_user(new_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.settings (user_id) values (new_user_id)
  on conflict (user_id) do nothing;

  if not exists (select 1 from public.habits where user_id = new_user_id) then
    insert into public.habits (user_id, name, short_name, type, daily_number, position)
    values
      (new_user_id, 'Work out 20+ minutes', 'Work out', 'complete', 1, 0),
      (new_user_id, 'Water', null, 'increment', 4, 1),
      (new_user_id, 'Morning walk, 5+ minutes', 'Walk', 'complete', 1, 2),
      (new_user_id, 'Face and teeth', 'Face', 'increment', 2, 3);
  end if;
end;
$$;

revoke all on function public.set_up_new_user(uuid) from public, anon, authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.set_up_new_user(new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who already exist when this runs.
select public.set_up_new_user(id) from auth.users;
