-- =====================================================================
-- SafaiSetu — initial schema
-- Hierarchy: municipality → ward → organization → members
-- Tickets (issues + pickup requests) are routed by scope:
--   internal  → organization admin
--   municipal → municipality admin → field worker
-- =====================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.platform_role as enum ('citizen', 'worker', 'municipal_admin', 'super_admin');
create type public.org_type      as enum ('society', 'college', 'public_place');
create type public.org_status    as enum ('pending', 'approved', 'rejected');
create type public.member_role   as enum ('admin', 'member', 'staff');
create type public.member_status as enum ('pending', 'active', 'removed');
create type public.ticket_kind   as enum ('issue', 'pickup');
create type public.ticket_scope  as enum ('internal', 'municipal');
create type public.ticket_status as enum ('submitted', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened', 'rejected');
create type public.severity      as enum ('low', 'medium', 'high');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.municipalities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text not null,
  state       text not null,
  created_at  timestamptz not null default now()
);

create table public.wards (
  id               uuid primary key default gen_random_uuid(),
  municipality_id  uuid not null references public.municipalities (id) on delete cascade,
  name             text not null,
  code             text not null,
  center_lat       double precision not null,
  center_lng       double precision not null,
  unique (municipality_id, code)
);
create index wards_municipality_idx on public.wards (municipality_id);

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null default '',
  email            text,
  phone            text,
  platform_role    public.platform_role not null default 'citizen',
  municipality_id  uuid references public.municipalities (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index profiles_municipality_idx on public.profiles (municipality_id);

create table public.organizations (
  id                uuid primary key default gen_random_uuid(),
  type              public.org_type not null,
  name              text not null check (char_length(name) between 2 and 120),
  address           text not null,
  lat               double precision not null,
  lng               double precision not null,
  ward_id           uuid references public.wards (id) on delete set null,
  status            public.org_status not null default 'pending',
  reg_number        text,
  proof_path        text,
  email_domain      text,           -- colleges: auto-join for @domain emails
  unit_count        int,
  invite_code       text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_by        uuid references public.profiles (id) on delete set null,
  reviewed_by       uuid references public.profiles (id) on delete set null,
  reviewed_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now()
);
create index organizations_ward_idx on public.organizations (ward_id);
create index organizations_created_by_idx on public.organizations (created_by);
create index organizations_reviewed_by_idx on public.organizations (reviewed_by);
create index organizations_email_domain_idx on public.organizations (email_domain) where email_domain is not null;

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.member_role not null default 'member',
  status      public.member_status not null default 'active',
  unit_label  text,               -- "B-204", "Hostel 3", "Gate 2"
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  email       text not null,
  unit_label  text,
  token       text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by  uuid references public.profiles (id) on delete set null,
  expires_at  timestamptz not null default now() + interval '14 days',
  created_at  timestamptz not null default now()
);
create index invitations_org_idx on public.invitations (org_id);
create index invitations_invited_by_idx on public.invitations (invited_by);

-- QR points: printable codes placed on bins / zones of public places & campuses
create table public.qr_points (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  label       text not null,
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz not null default now()
);
create index qr_points_org_idx on public.qr_points (org_id);

create sequence public.ticket_code_seq start 1001;

create table public.tickets (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique default 'SS-' || nextval('public.ticket_code_seq'),
  kind              public.ticket_kind not null default 'issue',
  category          text not null,       -- issue category or pickup waste type
  description       text not null default '',
  severity          public.severity not null default 'medium',
  scope             public.ticket_scope not null default 'municipal',
  status            public.ticket_status not null default 'submitted',
  source            text not null default 'app' check (source in ('app', 'qr')),
  lat               double precision not null,
  lng               double precision not null,
  address           text,
  ward_id           uuid references public.wards (id) on delete set null,
  org_id            uuid references public.organizations (id) on delete set null,
  qr_point_id       uuid references public.qr_points (id) on delete set null,
  unit_label        text,
  reporter_id       uuid references public.profiles (id) on delete set null,
  assigned_to       uuid references public.profiles (id) on delete set null,
  photo_path        text,
  after_photo_path  text,
  ai                jsonb,               -- Groq analysis result
  preferred_date    date,                -- pickups
  escalated         boolean not null default false,
  escalated_at      timestamptz,
  sla_due_at        timestamptz,
  resolved_at       timestamptz,
  closed_at         timestamptz,
  rating            smallint check (rating between 1 and 5),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index tickets_ward_status_idx on public.tickets (ward_id, status);
create index tickets_org_status_idx on public.tickets (org_id, status);
create index tickets_reporter_idx on public.tickets (reporter_id);
create index tickets_assigned_idx on public.tickets (assigned_to);
create index tickets_qr_point_idx on public.tickets (qr_point_id);
create index tickets_created_idx on public.tickets (created_at desc);

create table public.ticket_events (
  id           bigint generated always as identity primary key,
  ticket_id    uuid not null references public.tickets (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  from_status  public.ticket_status,
  to_status    public.ticket_status not null,
  note         text,
  created_at   timestamptz not null default now()
);
create index ticket_events_ticket_idx on public.ticket_events (ticket_id, created_at);
create index ticket_events_actor_idx on public.ticket_events (actor_id);

create table public.notices (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references public.organizations (id) on delete cascade,
  municipality_id  uuid references public.municipalities (id) on delete cascade,
  title            text not null,
  body             text not null,
  author_id        uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  check (org_id is not null or municipality_id is not null)
);
create index notices_org_idx on public.notices (org_id);
create index notices_municipality_idx on public.notices (municipality_id);
create index notices_author_idx on public.notices (author_id);

-- ---------------------------------------------------------------------
-- Authorization helpers (private schema: not exposed through the Data API).
-- SECURITY DEFINER so policies can look up memberships without recursion;
-- every helper is scoped to auth.uid().
-- ---------------------------------------------------------------------
create or replace function private.my_role()
returns public.platform_role language sql stable security definer set search_path = '' as $$
  select platform_role from public.profiles where id = (select auth.uid())
$$;

create or replace function private.my_municipality()
returns uuid language sql stable security definer set search_path = '' as $$
  select municipality_id from public.profiles where id = (select auth.uid())
$$;

create or replace function private.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where org_id = p_org and user_id = (select auth.uid()) and status = 'active'
  )
$$;

create or replace function private.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where org_id = p_org and user_id = (select auth.uid()) and status = 'active' and role = 'admin'
  )
$$;

create or replace function private.is_org_staff(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where org_id = p_org and user_id = (select auth.uid()) and status = 'active' and role in ('admin', 'staff')
  )
$$;

-- Municipality admin (or worker) whose municipality contains the ward
create or replace function private.is_muni_for_ward(p_ward uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p join public.wards w on w.municipality_id = p.municipality_id
    where p.id = (select auth.uid()) and w.id = p_ward and p.platform_role = 'municipal_admin'
  )
$$;

create or replace function private.is_muni_for_org(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organizations o
    where o.id = p_org and private.is_muni_for_ward(o.ward_id)
  )
$$;

create or replace function private.nearest_ward(p_lat double precision, p_lng double precision)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.wards
  order by (center_lat - p_lat) ^ 2 + ((center_lng - p_lng) * cos(radians(p_lat))) ^ 2
  limit 1
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------
-- Triggers: organizations
-- ---------------------------------------------------------------------
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
  new.email_domain := nullif(lower(trim(both '@ ' from coalesce(new.email_domain, ''))), '');
  return new;
end $$;

create trigger organizations_before_insert
  before insert on public.organizations
  for each row execute function private.org_before_insert();

-- Registrant becomes the organization's admin automatically
create or replace function private.org_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.memberships (org_id, user_id, role, status)
    values (new.id, new.created_by, 'admin', 'active')
    on conflict (org_id, user_id) do nothing;
  end if;
  return new;
end $$;

create trigger organizations_after_insert
  after insert on public.organizations
  for each row execute function private.org_after_insert();

-- Only the municipality may change approval status; org admins may edit details
create or replace function private.org_before_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new; -- service role
  end if;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.invite_code := case when private.is_org_admin(old.id) then new.invite_code else old.invite_code end;
  if new.status is distinct from old.status or new.ward_id is distinct from old.ward_id then
    if not private.is_muni_for_ward(old.ward_id) then
      raise exception 'Only the municipality can review this organization' using errcode = '42501';
    end if;
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  else
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end $$;

create trigger organizations_before_update
  before update on public.organizations
  for each row execute function private.org_before_update();

-- ---------------------------------------------------------------------
-- Triggers: tickets — routing + state machine
-- ---------------------------------------------------------------------
create or replace function private.ticket_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organizations;
begin
  if (select auth.uid()) is not null then
    new.reporter_id := (select auth.uid());
    new.status := 'submitted';
    new.assigned_to := null;
    new.escalated := false;
    new.after_photo_path := null;
    new.resolved_at := null;
    new.closed_at := null;
    new.rating := null;
  end if;

  if new.org_id is not null then
    select * into v_org from public.organizations where id = new.org_id;
    new.ward_id := coalesce(v_org.ward_id, new.ward_id);
  end if;
  if new.ward_id is null then
    new.ward_id := private.nearest_ward(new.lat, new.lng);
  end if;

  -- Routing: inside an organization → its admin, except categories that are
  -- always the municipality's job.
  if (select auth.uid()) is not null then
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

create trigger tickets_before_insert
  before insert on public.tickets
  for each row execute function private.ticket_before_insert();

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
    return new; -- service role (seed / admin scripts)
  end if;

  -- Immutable fields
  new.code := old.code;           new.kind := old.kind;
  new.reporter_id := old.reporter_id;
  new.org_id := old.org_id;       new.ward_id := old.ward_id;
  new.lat := old.lat;             new.lng := old.lng;
  new.photo_path := old.photo_path;
  new.created_at := old.created_at;
  new.source := old.source;       new.qr_point_id := old.qr_point_id;

  v_reporter  := old.reporter_id = v_uid;
  v_org_admin := old.org_id is not null and private.is_org_staff(old.org_id);
  v_muni      := private.is_muni_for_ward(old.ward_id);
  v_assignee  := old.assigned_to = v_uid;

  -- Escalation: org admin hands an internal ticket to the municipality
  if new.scope is distinct from old.scope then
    if not (old.scope = 'internal' and new.scope = 'municipal' and v_org_admin) then
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

  -- Assignment is the municipality's call
  if new.assigned_to is distinct from old.assigned_to and not (v_muni and old.scope = 'municipal') then
    raise exception 'Only the municipality can assign workers' using errcode = '42501';
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

create trigger tickets_before_update
  before update on public.tickets
  for each row execute function private.ticket_before_update();

-- Timeline events (with optional note passed through a transaction-local setting)
create or replace function private.ticket_log_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_note text := nullif(current_setting('safaisetu.note', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_events (ticket_id, actor_id, from_status, to_status, note, created_at)
    values (new.id, new.reporter_id, null, new.status, 'Reported', new.created_at);
  elsif new.scope is distinct from old.scope then
    insert into public.ticket_events (ticket_id, actor_id, from_status, to_status, note)
    values (new.id, (select auth.uid()), old.status, new.status, coalesce(v_note, 'Escalated to municipality'));
  elsif new.status is distinct from old.status then
    insert into public.ticket_events (ticket_id, actor_id, from_status, to_status, note)
    values (new.id, (select auth.uid()), old.status, new.status, v_note);
  end if;
  return new;
end $$;

create trigger tickets_log_event
  after insert or update on public.tickets
  for each row execute function private.ticket_log_event();

-- RPC used by the app: status change with a note in one call (SECURITY INVOKER — RLS applies)
create or replace function public.update_ticket(
  p_ticket uuid,
  p_status public.ticket_status default null,
  p_note text default null,
  p_assigned_to uuid default null,
  p_after_photo text default null,
  p_escalate boolean default false,
  p_rating smallint default null
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
    rating = coalesce(p_rating, t.rating)
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
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.municipalities enable row level security;
alter table public.wards          enable row level security;
alter table public.profiles       enable row level security;
alter table public.organizations  enable row level security;
alter table public.memberships    enable row level security;
alter table public.invitations    enable row level security;
alter table public.qr_points      enable row level security;
alter table public.tickets        enable row level security;
alter table public.ticket_events  enable row level security;
alter table public.notices        enable row level security;

-- Reference data
create policy "municipalities readable" on public.municipalities for select to authenticated using (true);
create policy "wards readable" on public.wards for select to authenticated using (true);

-- Profiles
create policy "read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "municipality reads its people" on public.profiles for select to authenticated
  using (private.my_role() = 'municipal_admin' and municipality_id = private.my_municipality());
create policy "org admins read members" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.user_id = profiles.id and private.is_org_staff(m.org_id)
  ));
create policy "create own profile" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and platform_role = 'citizen' and municipality_id is null);
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Organizations
create policy "approved orgs are discoverable" on public.organizations for select to authenticated
  using (status = 'approved');
create policy "members see their org" on public.organizations for select to authenticated
  using (private.is_org_member(id) or created_by = (select auth.uid()));
create policy "municipality sees orgs in its wards" on public.organizations for select to authenticated
  using (private.is_muni_for_ward(ward_id));
create policy "anyone can register an org" on public.organizations for insert to authenticated
  with check (true); -- trigger forces created_by/status
create policy "org admin or municipality updates" on public.organizations for update to authenticated
  using (private.is_org_admin(id) or private.is_muni_for_ward(ward_id))
  with check (private.is_org_admin(id) or private.is_muni_for_ward(ward_id));

-- Memberships (joining happens through server actions with invitation checks)
create policy "see own memberships" on public.memberships for select to authenticated
  using (user_id = (select auth.uid()));
create policy "org staff see org memberships" on public.memberships for select to authenticated
  using (private.is_org_staff(org_id));
create policy "municipality sees memberships" on public.memberships for select to authenticated
  using (private.is_muni_for_org(org_id));
create policy "org admin manages memberships" on public.memberships for update to authenticated
  using (private.is_org_admin(org_id)) with check (private.is_org_admin(org_id));
create policy "org admin removes memberships" on public.memberships for delete to authenticated
  using (private.is_org_admin(org_id) and user_id <> (select auth.uid()));

-- Invitations
create policy "org admin reads invitations" on public.invitations for select to authenticated
  using (private.is_org_admin(org_id));
create policy "org admin creates invitations" on public.invitations for insert to authenticated
  with check (private.is_org_admin(org_id) and invited_by = (select auth.uid()));
create policy "org admin revokes invitations" on public.invitations for update to authenticated
  using (private.is_org_admin(org_id)) with check (private.is_org_admin(org_id));

-- QR points
create policy "qr points readable" on public.qr_points for select to authenticated using (true);
create policy "org admin manages qr" on public.qr_points for insert to authenticated
  with check (private.is_org_admin(org_id));
create policy "org admin deletes qr" on public.qr_points for delete to authenticated
  using (private.is_org_admin(org_id));

-- Tickets
create policy "reporter sees own tickets" on public.tickets for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy "org staff see org tickets" on public.tickets for select to authenticated
  using (org_id is not null and private.is_org_staff(org_id));
-- Municipality monitors every ticket in its wards (acts only on municipal scope — see trigger)
create policy "municipality sees tickets in its wards" on public.tickets for select to authenticated
  using (private.is_muni_for_ward(ward_id));
create policy "worker sees assigned tickets" on public.tickets for select to authenticated
  using (assigned_to = (select auth.uid()));
create policy "report a ticket" on public.tickets for insert to authenticated
  with check (
    org_id is null
    or private.is_org_member(org_id)
    or exists (select 1 from public.organizations o where o.id = org_id and o.status = 'approved' and o.type = 'public_place')
    or (qr_point_id is not null and exists (select 1 from public.qr_points q where q.id = qr_point_id and q.org_id = tickets.org_id))
  );
create policy "participants update tickets" on public.tickets for update to authenticated
  using (
    reporter_id = (select auth.uid())
    or assigned_to = (select auth.uid())
    or (org_id is not null and private.is_org_staff(org_id))
    or private.is_muni_for_ward(ward_id)
  )
  with check (true); -- the before-update trigger enforces the state machine

-- Ticket events: visible to whoever can see the ticket
create policy "events follow ticket visibility" on public.ticket_events for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id));

-- Notices
create policy "org notices for members" on public.notices for select to authenticated
  using (
    (org_id is not null and (private.is_org_member(org_id) or private.is_muni_for_org(org_id)))
    or (municipality_id is not null and (
      municipality_id = private.my_municipality()
      or exists (
        select 1 from public.memberships m
        join public.organizations o on o.id = m.org_id
        join public.wards w on w.id = o.ward_id
        where m.user_id = (select auth.uid()) and m.status = 'active' and w.municipality_id = notices.municipality_id
      )))
  );
create policy "post notices" on public.notices for insert to authenticated
  with check (
    author_id = (select auth.uid()) and (
      (org_id is not null and private.is_org_admin(org_id))
      or (municipality_id is not null and private.my_role() = 'municipal_admin' and municipality_id = private.my_municipality())
    )
  );
create policy "delete own notices" on public.notices for delete to authenticated
  using (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Data API grants (tables are no longer auto-exposed)
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select on public.municipalities, public.wards, public.qr_points, public.ticket_events to authenticated;
grant select, insert on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, update, delete on public.memberships to authenticated;
grant select, insert, update on public.invitations to authenticated;
grant insert, delete on public.qr_points to authenticated;
grant select, insert, update on public.tickets to authenticated;
grant select, insert, delete on public.notices to authenticated;
grant usage on sequence public.ticket_code_seq to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------
-- Realtime: live dashboards & status updates
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.tickets;

-- ---------------------------------------------------------------------
-- Storage: private buckets; uploads go to "<uid>/..." folders.
-- Reads are served through short-lived signed URLs generated server-side
-- after the ticket itself passes RLS.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('complaint-photos', 'complaint-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('org-documents', 'org-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "upload into own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('complaint-photos', 'org-documents')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "read own uploads" on storage.objects for select to authenticated
  using (
    bucket_id in ('complaint-photos', 'org-documents')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
