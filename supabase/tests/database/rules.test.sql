-- Database rules: routing, proof, assignment, escalation, access, guests, supporters, limits.
-- Run against the hosted project with `npm run test:db` (npx supabase test db --linked).
-- Everything runs in one transaction that is rolled back, so no data is left behind.
-- Fixtures live in Nagpur and Pune, far from any real ward, so they never mix with live data.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- ---------------------------------------------------------------------
-- Fixtures (as postgres: triggers treat this like the service role)
-- ---------------------------------------------------------------------
insert into public.municipalities (id, name, city, state) values
  ('00000000-0000-0000-0000-00000000000a', 'Test City', 'Nagpur', 'MH'),
  ('00000000-0000-0000-0000-00000000000b', 'Other City', 'Pune', 'MH');
insert into public.wards (id, municipality_id, name, code, center_lat, center_lng) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Ward 1', 'W-01', 21.1499, 79.0319),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Ward 1', 'W-01', 18.5204, 73.8567);

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'officer@test.in'),
  ('10000000-0000-0000-0000-000000000002', 'worker@test.in'),
  ('10000000-0000-0000-0000-000000000003', 'other-worker@test.in'),
  ('10000000-0000-0000-0000-000000000004', 'resident@test.in'),
  ('10000000-0000-0000-0000-000000000005', 'secretary@test.in'),
  ('10000000-0000-0000-0000-000000000006', 'outsider@test.in');
insert into public.profiles (id, email, full_name, platform_role, municipality_id) values
  ('10000000-0000-0000-0000-000000000001', 'officer@test.in', 'Officer', 'municipal_admin', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'worker@test.in', 'Worker', 'worker', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000003', 'other-worker@test.in', 'Other worker', 'worker', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000004', 'resident@test.in', 'Resident', 'citizen', null),
  ('10000000-0000-0000-0000-000000000005', 'secretary@test.in', 'Secretary', 'citizen', null),
  ('10000000-0000-0000-0000-000000000006', 'outsider@test.in', 'Outsider', 'citizen', null);

insert into public.organizations (id, type, name, address, lat, lng, status, created_by) values
  ('20000000-0000-0000-0000-000000000001', 'society', 'Test Society', 'Kidwai Nagar', 21.1318, 79.0233, 'approved', '10000000-0000-0000-0000-000000000005');
insert into public.memberships (org_id, user_id, role, status) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'member', 'active');
insert into public.qr_points (id, org_id, label, lat, lng) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Gate bins', 21.1319, 79.0234);

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------------
-- Reporting and routing
-- ---------------------------------------------------------------------
select pg_temp.act_as('10000000-0000-0000-0000-000000000004');
set local role authenticated;

insert into public.tickets (id, kind, category, severity, lat, lng, org_id)
values ('40000000-0000-0000-0000-000000000001', 'issue', 'overflowing_bin', 'medium', 21.1320, 79.0235, '20000000-0000-0000-0000-000000000001');
insert into public.tickets (id, kind, category, severity, lat, lng)
values ('40000000-0000-0000-0000-000000000002', 'issue', 'road_garbage', 'high', 21.1500, 79.0320);

select is((select scope::text from public.tickets where id = '40000000-0000-0000-0000-000000000001'), 'internal',
  'a report inside a society goes to the society');
select is((select scope::text from public.tickets where id = '40000000-0000-0000-0000-000000000002'), 'municipal',
  'a report on a public road goes to the municipality');
select throws_ok(
  $$insert into public.tickets (kind, category, severity, lat, lng) values ('issue', 'road_garbage', 'low', 12.97, 77.59)$$,
  '22023', null, 'a report outside the service area is refused');

-- ---------------------------------------------------------------------
-- Proof of cleanup
-- ---------------------------------------------------------------------
select pg_temp.act_as('10000000-0000-0000-0000-000000000005');
select throws_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000001', 'resolved')$$,
  '23514', 'Upload an after photo as proof of cleanup', 'resolving without an after photo is refused');
select lives_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000001', 'in_progress')$$,
  'the secretary can start work on an internal ticket');

-- ---------------------------------------------------------------------
-- Assignment
-- ---------------------------------------------------------------------
select pg_temp.act_as('10000000-0000-0000-0000-000000000001');
select throws_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000002', 'assigned', null, '10000000-0000-0000-0000-000000000004')$$,
  '23514', 'Assign a field worker from this municipality', 'a citizen cannot be assigned');
select throws_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000002', 'assigned', null, '10000000-0000-0000-0000-000000000003')$$,
  '23514', 'Assign a field worker from this municipality', 'another city''s worker cannot be assigned');
select lives_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000002', 'assigned', null, '10000000-0000-0000-0000-000000000002')$$,
  'the city''s own worker can be assigned');
select throws_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000001', 'assigned', null, '10000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'the municipality cannot assign on an internal ticket');

select pg_temp.act_as('10000000-0000-0000-0000-000000000002');
select lives_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000002', 'in_progress')$$,
  'the worker can start the task');
select throws_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000002', 'resolved')$$,
  '23514', null, 'the worker cannot resolve without a photo');
select lives_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000002', 'resolved', null, null, '10000000-0000-0000-0000-000000000002/after.jpg')$$,
  'the worker resolves with an after photo');

-- ---------------------------------------------------------------------
-- Escalation by the resident, only after the deadline
-- ---------------------------------------------------------------------
select pg_temp.act_as('10000000-0000-0000-0000-000000000004');
select throws_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000001', null, null, null, null, true)$$,
  '42501', null, 'a resident cannot escalate before the deadline');
reset role;
update public.tickets set sla_due_at = now() - interval '1 hour' where id = '40000000-0000-0000-0000-000000000001';
set local role authenticated;
select lives_ok(
  $$select public.update_ticket('40000000-0000-0000-0000-000000000001', null, 'Nobody came', null, null, true)$$,
  'a resident can escalate once the deadline has passed');
select is((select scope::text from public.tickets where id = '40000000-0000-0000-0000-000000000001'), 'municipal',
  'the escalated ticket is now the municipality''s');

-- ---------------------------------------------------------------------
-- Automatic escalation of overdue internal tickets
-- ---------------------------------------------------------------------
insert into public.tickets (id, kind, category, severity, lat, lng, org_id)
values ('40000000-0000-0000-0000-000000000003', 'issue', 'unsegregated', 'low', 21.1321, 79.0236, '20000000-0000-0000-0000-000000000001');
reset role;
update public.tickets set sla_due_at = now() - interval '1 minute' where id = '40000000-0000-0000-0000-000000000003';
select ok(private.escalate_overdue_internal() >= 1, 'the scheduled job escalates overdue internal tickets');
select is((select scope::text from public.tickets where id = '40000000-0000-0000-0000-000000000003'), 'municipal',
  'the overdue ticket moved to the municipality');
select is((select note from public.ticket_events where ticket_id = '40000000-0000-0000-0000-000000000003' order by id desc limit 1),
  'Deadline passed without a fix: sent to the municipality automatically', 'the automatic escalation is logged');
select is((select count(*)::integer from public.notifications where url = '/app/tickets/40000000-0000-0000-0000-000000000003'), 2,
  'the reporter and the ward officer are notified in the app');

-- ---------------------------------------------------------------------
-- Visibility
-- ---------------------------------------------------------------------
insert into public.tickets (id, kind, category, severity, lat, lng, org_id, reporter_id, source)
values ('40000000-0000-0000-0000-000000000004', 'issue', 'overflowing_bin', 'medium', 21.1322, 79.0237,
        '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'app');
update public.tickets set scope = 'internal' where id = '40000000-0000-0000-0000-000000000004';
select pg_temp.act_as('10000000-0000-0000-0000-000000000006');
set local role authenticated;
select is((select count(*)::integer from public.tickets where id = '40000000-0000-0000-0000-000000000004'), 0,
  'an outsider cannot read a society''s internal ticket');
select throws_ok(
  $$update public.profiles set platform_role = 'municipal_admin' where id = '10000000-0000-0000-0000-000000000006'$$,
  '42501', null, 'a user cannot promote themselves');
select lives_ok(
  $$update public.profiles set full_name = 'Renamed', email_notices = false where id = '10000000-0000-0000-0000-000000000006'$$,
  'a user can edit their own name and email settings');
select throws_ok(
  $$delete from public.tickets where id = '40000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'nobody can delete tickets through the API');

-- ---------------------------------------------------------------------
-- Guest report from a QR code (created by the server)
-- ---------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
insert into public.tickets (id, kind, category, severity, lat, lng, org_id, qr_point_id, source, guest_contact)
values ('40000000-0000-0000-0000-000000000005', 'issue', 'overflowing_bin', 'medium', 21.1319, 79.0234,
        '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'guest', '98765 43210');
select is((select scope::text || '/' || status::text from public.tickets where id = '40000000-0000-0000-0000-000000000005'),
  'internal/submitted', 'a guest QR report is routed like any other report');

-- ---------------------------------------------------------------------
-- "Me too" supporters
-- ---------------------------------------------------------------------
insert into public.tickets (id, kind, category, severity, lat, lng, reporter_id, source)
values ('40000000-0000-0000-0000-000000000006', 'issue', 'road_garbage', 'medium', 21.1600, 79.0400,
        '10000000-0000-0000-0000-000000000004', 'app');
select pg_temp.act_as('10000000-0000-0000-0000-000000000006');
set local role authenticated;
select is((select count(*)::integer from public.nearby_open_tickets(21.1601, 79.0401)), 1,
  'a nearby public report is found');
select is(public.support_ticket('40000000-0000-0000-0000-000000000006'), 1, 'an outsider can support a public report');
select is((select count(*)::integer from public.tickets where id = '40000000-0000-0000-0000-000000000006'), 1,
  'a supporter can then follow the ticket');
select throws_ok(
  $$select public.support_ticket('40000000-0000-0000-0000-000000000004')$$,
  '42501', null, 'an outsider cannot support a society''s internal ticket');

-- ---------------------------------------------------------------------
-- Rate limits and the public scorecard
-- ---------------------------------------------------------------------
reset role;
select is(
  array[public.take_rate_limit('test:key', 2, 3600), public.take_rate_limit('test:key', 2, 3600), public.take_rate_limit('test:key', 2, 3600)],
  array[true, true, false], 'the third hit in a window is refused');
set local role anon;
select ok((select count(*) from public.public_ward_scorecard()) >= 2, 'the ward scorecard is public');

select * from finish();
rollback;
