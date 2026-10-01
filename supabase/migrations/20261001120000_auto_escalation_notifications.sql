-- Automatic escalations run inside Postgres (pg_cron), where the app's email code can't
-- reach them. Tell the people involved through in-app notifications instead: the
-- reporter, everyone following the ticket ("me too"), and the ward's officers.
create or replace function private.escalate_overdue_internal()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  perform set_config('safaisetu.note', 'Deadline passed without a fix: sent to the municipality automatically', true);

  drop table if exists pg_temp.moved;
  create temporary table moved on commit drop as
  with updated as (
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
    returning t.id, t.code, t.reporter_id, t.ward_id
  )
  select * from updated;

  select count(*) into v_count from moved;

  insert into public.notifications (user_id, title, body, url)
  select distinct r.user_id, 'Sent to the municipality · ' || m.code,
    'The deadline passed without a fix, so it has gone to the city automatically.', '/app/tickets/' || m.id
  from moved m
  cross join lateral (
    select m.reporter_id as user_id
    union
    select s.user_id from public.ticket_supporters s where s.ticket_id = m.id
  ) r
  where r.user_id is not null;

  insert into public.notifications (user_id, title, body, url)
  select p.id, 'Escalated automatically · ' || m.code,
    'An organization missed the deadline on this complaint. It needs a field worker.', '/app/tickets/' || m.id
  from moved m
  join public.wards w on w.id = m.ward_id
  join public.profiles p on p.municipality_id = w.municipality_id and p.platform_role = 'municipal_admin';

  return v_count;
end $$;
revoke execute on function private.escalate_overdue_internal from public, anon, authenticated;
