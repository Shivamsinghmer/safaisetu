-- =====================================================================
-- Hardening + product gaps
--  1. Proof: a ticket can only be resolved with an after photo
--  2. Only a field worker of the ticket's own municipality can be assigned
--  3. Residents can escalate an internal ticket once its deadline passes;
--     overdue internal tickets escalate automatically (pg_cron, every 15 min)
--  4. Service area: reports and organizations must be within 15 km of a ward
--  5. Guest reports from QR codes (no account), tracked by a private token
--  6. "Me too": supporters on nearby open reports instead of duplicates
--  7. Rate limits (called by the server with the service role)
--  8. Confirmed collection date for pickups
--  9. Email preferences + language on profiles; in-app notifications
-- 10. Dashboard aggregates computed in the database (no row caps)
-- 11. Public ward scorecard (anonymous read, aggregates only)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------
alter table public.profiles
  add column email_updates boolean not null default true,
  add column email_notices boolean not null default true,
  add column locale text not null default 'en' check (locale in ('en', 'hi'));
grant update (full_name, phone, email_updates, email_notices, locale) on public.profiles to authenticated;

alter table public.tickets
  add column scheduled_for date,
  add column guest_contact text check (char_length(guest_contact) <= 80),
  add column public_token uuid not null default gen_random_uuid();
create unique index tickets_public_token_idx on public.tickets (public_token);
alter table public.tickets drop constraint tickets_source_check;
alter table public.tickets add constraint tickets_source_check check (source in ('app', 'qr', 'guest'));

-- ---------------------------------------------------------------------
-- Service area: the nearest ward, but only within 15 km of its centre
-- ---------------------------------------------------------------------
create or replace function private.nearest_ward(p_lat double precision, p_lng double precision)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from (
    select id, 111.32 * sqrt((center_lat - p_lat) ^ 2 + ((center_lng - p_lng) * cos(radians(p_lat))) ^ 2) as km
    from public.wards
  ) w
  where km <= 15
  order by km
  limit 1
$$;

create or replace function private.org_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  if new.ward_id is null then
    new.ward_id := private.nearest_ward(new.lat, new.lng);
  end if;
  if new.ward_id is null then
    raise exception 'This address is outside the area SafaiSetu covers' using errcode = '22023';
  end if;
  new.email_domain := nullif(lower(trim(both '@ ' from coalesce(new.email_domain, ''))), '');
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Ticket insert: routing also applies to guest (QR) reports made by the server
-- ---------------------------------------------------------------------
create or replace function private.ticket_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organizations;
  v_routed boolean := (select auth.uid()) is not null or new.source = 'guest';
begin
  if v_routed then
    new.reporter_id := (select auth.uid());
    new.status := 'submitted';
    new.assigned_to := null;
    new.escalated := false;
    new.after_photo_path := null;
    new.resolved_at := null;
    new.closed_at := null;
    new.rating := null;
    new.scheduled_for := null;
  end if;
  if new.source <> 'guest' then
    new.guest_contact := null;
  end if;

  if new.org_id is not null then
    select * into v_org from public.organizations where id = new.org_id;
    new.ward_id := coalesce(v_org.ward_id, new.ward_id);
  end if;
  if new.ward_id is null then
    new.ward_id := private.nearest_ward(new.lat, new.lng);
  end if;
  if new.ward_id is null then
    raise exception 'This spot is outside the area SafaiSetu covers. Move the pin inside the city.' using errcode = '22023';
  end if;

  -- Routing: inside an organization → its admin, except categories that are
  -- always the municipality's job.
  if v_routed then
    if new.org_id is not null and new.category not in ('missed_collection', 'illegal_dumping') then
      new.scope := 'internal';
    else
      new.scope := 'municipal';
    end if;
  end if;

  new.sla_due_at := coalesce(new.sla_due_at, new.created_at + case new.severity
    when 'high' then interval '24 hours'
    when 'medium' then interval '48 hours'
    else interval '72 hours' end);
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Ticket update: proof, assignee check, resident escalation, schedule
-- ---------------------------------------------------------------------
create or replace function private.ticket_before_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid       uuid := (select auth.uid());
  v_reporter  boolean;
  v_org_admin boolean;
  v_muni      boolean;
  v_assignee  boolean;
  v_ok        boolean := false;
begin
  new.updated_at := now();
  if v_uid is null then
    return new; -- service role (seed, scheduled jobs)
  end if;

  -- Immutable fields
  new.code := old.code;           new.kind := old.kind;
  new.reporter_id := old.reporter_id;
  new.org_id := old.org_id;       new.ward_id := old.ward_id;
  new.lat := old.lat;             new.lng := old.lng;
  new.photo_path := old.photo_path;
  new.created_at := old.created_at;
  new.source := old.source;       new.qr_point_id := old.qr_point_id;
  new.guest_contact := old.guest_contact;
  new.public_token := old.public_token;

  v_reporter  := old.reporter_id = v_uid;
  v_org_admin := old.org_id is not null and private.is_org_staff(old.org_id);
  v_muni      := private.is_muni_for_ward(old.ward_id);
  v_assignee  := old.assigned_to = v_uid;

  -- Escalation: the org hands an internal ticket to the city, or the resident
  -- does it themselves once the deadline has passed without a fix
  if new.scope is distinct from old.scope then
    if not (
      old.scope = 'internal' and new.scope = 'municipal' and (
        v_org_admin
        or (v_reporter and old.sla_due_at < now() and old.status in ('submitted', 'reopened', 'in_progress'))
      )
    ) then
      raise exception 'Not allowed to change ticket scope' using errcode = '42501';
    end if;
    new.escalated := true;
    new.escalated_at := now();
    new.status := 'submitted';
    new.assigned_to := null;
    new.sla_due_at := now() + interval '48 hours';
    return new;
  end if;
  new.escalated := old.escalated;
  new.escalated_at := old.escalated_at;

  -- Assignment is the municipality's call, and only to its own field workers
  if new.assigned_to is distinct from old.assigned_to then
    if not (v_muni and old.scope = 'municipal') then
      raise exception 'Only the municipality can assign workers' using errcode = '42501';
    end if;
    if new.assigned_to is not null and not exists (
      select 1 from public.profiles p
      join public.wards w on w.municipality_id = p.municipality_id
      where p.id = new.assigned_to and p.platform_role = 'worker' and w.id = old.ward_id
    ) then
      raise exception 'Assign a field worker from this municipality' using errcode = '23514';
    end if;
  end if;

  -- Collection date: set by whoever handles the ticket
  if new.scheduled_for is distinct from old.scheduled_for
     and not ((v_muni and old.scope = 'municipal') or (v_org_admin and old.scope = 'internal')) then
    new.scheduled_for := old.scheduled_for;
  end if;

  if new.status is distinct from old.status then
    -- reporter: confirm or reopen a resolved ticket
    if v_reporter and old.status = 'resolved' and new.status in ('closed', 'reopened') then
      v_ok := true;
    end if;
    -- organization admin/staff: manage internal tickets
    if v_org_admin and old.scope = 'internal'
       and new.status in ('in_progress', 'resolved', 'rejected')
       and old.status in ('submitted', 'reopened', 'in_progress') then
      v_ok := true;
    end if;
    -- municipality: manage municipal tickets
    if v_muni and old.scope = 'municipal'
       and new.status in ('assigned', 'in_progress', 'resolved', 'rejected')
       and old.status in ('submitted', 'reopened', 'assigned', 'in_progress') then
      v_ok := true;
    end if;
    -- field worker: work the assigned task
    if v_assignee and (
         (old.status = 'assigned' and new.status = 'in_progress') or
         (old.status in ('assigned', 'in_progress') and new.status = 'resolved')) then
      v_ok := true;
    end if;
    if not v_ok then
      raise exception 'Transition % → % not allowed', old.status, new.status using errcode = '42501';
    end if;

    if new.status = 'assigned' and new.assigned_to is null then
      raise exception 'Pick a worker to assign' using errcode = '23514';
    end if;
    -- Nothing is called clean without proof
    if new.status = 'resolved' and coalesce(new.after_photo_path, '') = '' then
      raise exception 'Upload an after photo as proof of cleanup' using errcode = '23514';
    end if;
    if new.status = 'resolved' then new.resolved_at := now(); end if;
    if new.status = 'closed' then new.closed_at := now(); end if;
    if new.status = 'reopened' then new.resolved_at := null; new.sla_due_at := now() + interval '24 hours'; end if;
  end if;

  -- Only the reporter can rate, and only when closing
  if new.rating is distinct from old.rating and not (v_reporter and new.status = 'closed') then
    new.rating := old.rating;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- RPC: status change + note + optional collection date in one call
-- ---------------------------------------------------------------------
drop function public.update_ticket(uuid, public.ticket_status, text, uuid, text, boolean, smallint);
create function public.update_ticket(
  p_ticket uuid,
  p_status public.ticket_status default null,
  p_note text default null,
  p_assigned_to uuid default null,
  p_after_photo text default null,
  p_escalate boolean default false,
  p_rating smallint default null,
  p_scheduled_for date default null
) returns public.tickets
language plpgsql security invoker set search_path = '' as $$
declare
  v_row public.tickets;
begin
  perform set_config('safaisetu.note', coalesce(p_note, ''), true);
  update public.tickets t set
    status = case when p_escalate then t.status else coalesce(p_status, t.status) end,
    scope = case when p_escalate then 'municipal'::public.ticket_scope else t.scope end,
    assigned_to = coalesce(p_assigned_to, t.assigned_to),
    after_photo_path = coalesce(p_after_photo, t.after_photo_path),
    rating = coalesce(p_rating, t.rating),
    scheduled_for = coalesce(p_scheduled_for, t.scheduled_for)
  where t.id = p_ticket
  returning * into v_row;
  if v_row.id is null then
    raise exception 'Ticket not found or not permitted' using errcode = '42501';
  end if;
  return v_row;
end $$;
revoke execute on function public.update_ticket from public, anon;
grant execute on function public.update_ticket to authenticated;

-- ---------------------------------------------------------------------
-- Automatic escalation of overdue internal tickets
-- ---------------------------------------------------------------------
create or replace function private.escalate_overdue_internal()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  perform set_config('safaisetu.note', 'Deadline passed without a fix: sent to the municipality automatically', true);
  with moved as (
    update public.tickets t set
      scope = 'municipal',
      escalated = true,
      escalated_at = now(),
      status = 'submitted',
      assigned_to = null,
      sla_due_at = now() + interval '48 hours'
    where t.scope = 'internal'
      and t.status in ('submitted', 'reopened', 'in_progress')
      and t.sla_due_at < now()
    returning 1
  )
  select count(*) into v_count from moved;
  return v_count;
end $$;
revoke execute on function private.escalate_overdue_internal from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('escalate-overdue-internal', '*/15 * * * *', 'select private.escalate_overdue_internal()');

-- ---------------------------------------------------------------------
-- "Me too" supporters
-- ---------------------------------------------------------------------
create table public.ticket_supporters (
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (ticket_id, user_id)
);
create index ticket_supporters_user_idx on public.ticket_supporters (user_id);
alter table public.ticket_supporters enable row level security;
create policy "see own support" on public.ticket_supporters for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.ticket_supporters to authenticated;

create or replace function private.is_supporter(p_ticket uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ticket_supporters s where s.ticket_id = p_ticket and s.user_id = (select auth.uid()))
$$;
create policy "supporters see supported tickets" on public.tickets for select to authenticated
  using (private.is_supporter(id));

-- Which open reports near a spot can this person see and support?
-- Public (municipal) reports, plus internal ones of organizations they belong to.
create or replace function private.can_support(t public.tickets)
returns boolean language sql stable security definer set search_path = '' as $$
  select t.status in ('submitted', 'assigned', 'in_progress', 'reopened')
    and (t.scope = 'municipal' or (t.org_id is not null and private.is_org_member(t.org_id)))
$$;

create or replace function public.nearby_open_tickets(
  p_lat double precision,
  p_lng double precision,
  p_kind public.ticket_kind default 'issue'
) returns table (
  id uuid, code text, category text, status public.ticket_status, created_at timestamptz,
  distance_m integer, supporters integer, mine boolean
)
language sql stable security definer set search_path = '' as $$
  select n.id, n.code, n.category, n.status, n.created_at, n.distance_m, n.supporters, n.mine
  from (
    select t.id, t.code, t.category, t.status, t.created_at,
      round(111320 * sqrt((t.lat - p_lat) ^ 2 + ((t.lng - p_lng) * cos(radians(p_lat))) ^ 2))::integer as distance_m,
      (select count(*) from public.ticket_supporters s where s.ticket_id = t.id)::integer as supporters,
      (t.reporter_id = (select auth.uid()) or private.is_supporter(t.id)) as mine
    from public.tickets t
    where t.kind = p_kind
      and t.created_at > now() - interval '14 days'
      and abs(t.lat - p_lat) < 0.0012
      and abs(t.lng - p_lng) < 0.0012
      and private.can_support(t)
  ) n
  where n.distance_m <= 80
  order by n.distance_m
  limit 5
$$;
revoke execute on function public.nearby_open_tickets from public, anon;
grant execute on function public.nearby_open_tickets to authenticated;

create or replace function public.support_ticket(p_ticket uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_t   public.tickets;
begin
  if v_uid is null then
    raise exception 'Sign in to support a report' using errcode = '42501';
  end if;
  select * into v_t from public.tickets where id = p_ticket;
  if v_t.id is null or not private.can_support(v_t) or v_t.reporter_id = v_uid then
    raise exception 'You can''t support this report' using errcode = '42501';
  end if;
  insert into public.ticket_supporters (ticket_id, user_id) values (p_ticket, v_uid) on conflict do nothing;
  return (select count(*) from public.ticket_supporters where ticket_id = p_ticket);
end $$;
revoke execute on function public.support_ticket from public, anon;
grant execute on function public.support_ticket to authenticated;

create or replace function public.ticket_support_count(p_ticket uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.ticket_supporters where ticket_id = p_ticket
$$;
revoke execute on function public.ticket_support_count from public, anon;
grant execute on function public.ticket_support_count to authenticated;

-- ---------------------------------------------------------------------
-- Rate limits (fixed windows). Only the server (service role) calls this.
-- ---------------------------------------------------------------------
create table private.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (key, window_start)
);

create or replace function public.take_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits   integer;
begin
  insert into private.rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into v_hits;
  -- occasional cleanup of old windows
  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_max;
end $$;
revoke execute on function public.take_rate_limit from public, anon, authenticated;
grant execute on function public.take_rate_limit to service_role;

-- ---------------------------------------------------------------------
-- In-app notifications (written by the server alongside emails)
-- ---------------------------------------------------------------------
create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  body        text not null default '',
  url         text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "mark own notifications read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
alter publication supabase_realtime add table public.notifications;

grant all on public.notifications, public.ticket_supporters to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------
-- Dashboard aggregates (SECURITY INVOKER: RLS limits them to the caller's wards)
-- ---------------------------------------------------------------------
create or replace function public.muni_ward_stats(p_days integer default 30)
returns table (
  ward_id uuid, total integer, open integer, unassigned integer, overdue integer,
  resolved integer, resolved_7d integer, avg_hours double precision
)
language sql stable security invoker set search_path = '' as $$
  select t.ward_id,
    count(*) filter (where t.created_at > now() - make_interval(days => p_days))::integer,
    count(*) filter (where t.scope = 'municipal' and t.status in ('submitted', 'assigned', 'in_progress', 'reopened'))::integer,
    count(*) filter (where t.scope = 'municipal' and t.status in ('submitted', 'reopened'))::integer,
    count(*) filter (where t.scope = 'municipal' and t.status in ('submitted', 'assigned', 'in_progress', 'reopened') and t.sla_due_at < now())::integer,
    count(*) filter (where t.resolved_at > now() - make_interval(days => p_days))::integer,
    count(*) filter (where t.resolved_at > now() - interval '7 days')::integer,
    avg(extract(epoch from t.resolved_at - t.created_at) / 3600) filter (where t.resolved_at > now() - make_interval(days => p_days))
  from public.tickets t
  group by t.ward_id
$$;

create or replace function public.muni_daily_counts(p_days integer default 30)
returns table (day date, reported integer, resolved integer)
language sql stable security invoker set search_path = '' as $$
  with days as (
    select generate_series(current_date - (p_days - 1), current_date, interval '1 day')::date as day
  )
  select d.day,
    (select count(*) from public.tickets t where t.created_at::date = d.day)::integer,
    (select count(*) from public.tickets t where t.resolved_at::date = d.day)::integer
  from days d
  order by d.day
$$;

create or replace function public.muni_breakdowns(p_days integer default 30)
returns table (kind text, key text, n integer)
language sql stable security invoker set search_path = '' as $$
  select 'category', t.category, count(*)::integer
  from public.tickets t
  where t.kind = 'issue' and t.created_at > now() - make_interval(days => p_days)
  group by t.category
  union all
  select 'org', t.org_id::text, count(*)::integer
  from public.tickets t
  where t.org_id is not null and t.created_at > now() - make_interval(days => p_days)
  group by t.org_id
$$;
grant execute on function public.muni_ward_stats, public.muni_daily_counts, public.muni_breakdowns to authenticated;

-- ---------------------------------------------------------------------
-- Public ward scorecard: aggregates only, readable without signing in
-- ---------------------------------------------------------------------
create or replace function public.public_ward_scorecard()
returns table (
  municipality text, city text, ward_id uuid, ward text, code text,
  open integer, overdue integer, resolved_30d integer, avg_hours_30d double precision, avg_rating double precision
)
language sql stable security definer set search_path = '' as $$
  select m.name, m.city, w.id, w.name, w.code,
    count(t.*) filter (where t.status in ('submitted', 'assigned', 'in_progress', 'reopened'))::integer,
    count(t.*) filter (where t.status in ('submitted', 'assigned', 'in_progress', 'reopened') and t.sla_due_at < now())::integer,
    count(t.*) filter (where t.resolved_at > now() - interval '30 days')::integer,
    avg(extract(epoch from t.resolved_at - t.created_at) / 3600) filter (where t.resolved_at > now() - interval '30 days'),
    avg(t.rating) filter (where t.rating is not null)
  from public.wards w
  join public.municipalities m on m.id = w.municipality_id
  left join public.tickets t on t.ward_id = w.id
  group by m.name, m.city, w.id, w.name, w.code
  order by m.name, w.code
$$;
grant execute on function public.public_ward_scorecard to anon, authenticated;

-- ---------------------------------------------------------------------
-- 12. Privileges: explicit grants only
-- Supabase's default privileges gave `anon` and `authenticated` ALL on every
-- public table, which overrode the column-level grant on profiles: any user
-- could set their own platform_role. Strip everything and re-grant exactly
-- what the app uses; row-level security still decides which rows.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.municipalities, public.wards, public.ticket_events to authenticated;
grant select, insert on public.profiles to authenticated;
grant update (full_name, phone, email_updates, email_notices, locale) on public.profiles to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, update, delete on public.memberships to authenticated;
grant select, insert, update on public.invitations to authenticated;
grant select, insert, delete on public.qr_points to authenticated;
grant select, insert, update on public.tickets to authenticated;
grant select, insert, delete on public.notices to authenticated;
grant select on public.ticket_supporters to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Belt and braces: role, municipality and email never change through the API
create or replace function private.profile_before_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    new.id := old.id;
    new.platform_role := old.platform_role;
    new.municipality_id := old.municipality_id;
    new.email := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function private.profile_before_update();
