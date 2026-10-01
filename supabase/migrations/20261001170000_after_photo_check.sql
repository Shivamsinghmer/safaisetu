-- AI + device check of a cleanup's after photo (same place? cleaned? genuine camera photo? reused?).
-- Written only by the server (service role); users can neither set nor edit it, so a worker can't mark their
-- own proof as verified. A check that belongs to a different photo is dropped when the photo changes.

alter table public.tickets add column after_check jsonb;

create or replace function private.guard_after_check()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    if tg_op = 'INSERT' then
      new.after_check := null;
    elsif new.after_check is distinct from old.after_check then
      raise exception 'The photo check can only be recorded by the server' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'UPDATE'
     and new.after_photo_path is distinct from old.after_photo_path
     and new.after_check is not null
     and new.after_check ->> 'path' is distinct from new.after_photo_path then
    new.after_check := null;
  end if;
  return new;
end;
$$;

create trigger ticket_guard_after_check
  before insert or update on public.tickets
  for each row execute function private.guard_after_check();

-- Officers list flagged cleanups
create index tickets_after_check_verdict_idx on public.tickets ((after_check ->> 'verdict'))
  where after_check is not null;
