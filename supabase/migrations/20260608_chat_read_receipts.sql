create table if not exists public.chat_reads (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.chat_reads enable row level security;

drop policy if exists "Match members view chat reads" on public.chat_reads;
create policy "Match members view chat reads"
  on public.chat_reads for select to authenticated
  using (public.is_match_member(match_id));

create or replace function public.mark_chat_read(target_match_id uuid)
returns public.chat_reads
language plpgsql
security definer set search_path = public
as $$
declare
  read_receipt public.chat_reads;
begin
  if not public.is_match_member(target_match_id) then
    raise exception 'Match not found or access denied';
  end if;

  insert into public.chat_reads (match_id, user_id, last_read_at)
  values (target_match_id, auth.uid(), now())
  on conflict (match_id, user_id)
  do update set last_read_at = excluded.last_read_at
  returning * into read_receipt;

  return read_receipt;
end;
$$;

revoke all on function public.mark_chat_read(uuid) from public;
grant execute on function public.mark_chat_read(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.chat_reads;
exception
  when duplicate_object then null;
end $$;
