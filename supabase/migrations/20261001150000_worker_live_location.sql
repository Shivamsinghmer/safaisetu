-- Live location of a field worker while they are working on a ticket ("Uber-style" tracking).
-- One row per ticket, written only by the assigned worker and only while the ticket is in progress.
-- The row is deleted as soon as the ticket leaves "in progress", so no location history is kept.

create table public.worker_locations (
  ticket_id uuid primary key references public.tickets (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy real check (accuracy >= 0),
  heading real check (heading >= 0 and heading < 360),
  speed real check (speed >= 0),
  updated_at timestamptz not null default now()
);
create index worker_locations_worker_id_idx on public.worker_locations (worker_id);
alter table public.worker_locations enable row level security;

-- Who may watch the worker approach: the worker, the reporter, people who said "me too",
-- the organization's staff and the ward's municipality. Plain members of an organization do not.
create or replace function private.can_track(p_ticket uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tickets t
    where t.id = p_ticket
      and (
        t.reporter_id = (select auth.uid())
        or t.assigned_to = (select auth.uid())
        or (t.org_id is not null and private.is_org_staff(t.org_id))
        or private.is_muni_for_ward(t.ward_id)
        or private.is_supporter(t.id)
      )
  );
$$;
revoke execute on function private.can_track(uuid) from public, anon;
grant execute on function private.can_track(uuid) to authenticated;

create policy "participants see the worker's live location" on public.worker_locations
  for select to authenticated
  using ((select private.can_track(ticket_id)));

grant select on public.worker_locations to authenticated;
grant all on public.worker_locations to service_role;
alter publication supabase_realtime add table public.worker_locations;

-- The only way to write a location: the assigned worker, on a ticket that is in progress.
create or replace function public.share_worker_location(
  p_ticket uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy real default null,
  p_heading real default null,
  p_speed real default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.tickets t
    where t.id = p_ticket and t.assigned_to = uid and t.status = 'in_progress'
  ) then
    raise exception 'Location can only be shared for your own task while it is in progress' using errcode = '42501';
  end if;

  insert into public.worker_locations as w (ticket_id, worker_id, lat, lng, accuracy, heading, speed, updated_at)
  values (
    p_ticket, uid, p_lat, p_lng,
    greatest(p_accuracy, 0),
    case when p_heading >= 0 and p_heading < 360 then p_heading end,
    greatest(p_speed, 0),
    now()
  )
  on conflict (ticket_id) do update
    set worker_id = excluded.worker_id,
        lat = excluded.lat,
        lng = excluded.lng,
        accuracy = excluded.accuracy,
        heading = excluded.heading,
        speed = excluded.speed,
        updated_at = excluded.updated_at;
end;
$$;
revoke execute on function public.share_worker_location from public, anon;
grant execute on function public.share_worker_location to authenticated;

-- Stop sharing the moment the task is no longer in progress (resolved, reassigned, reopened...)
create or replace function private.clear_worker_location()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from 'in_progress' or new.assigned_to is distinct from old.assigned_to then
    delete from public.worker_locations where ticket_id = new.id;
  end if;
  return null;
end;
$$;

create trigger ticket_clear_worker_location
  after update of status, assigned_to on public.tickets
  for each row
  when (old.status = 'in_progress')
  execute function private.clear_worker_location();
