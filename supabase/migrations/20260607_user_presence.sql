create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;

drop policy if exists "Authenticated users can view presence" on public.user_presence;
create policy "Authenticated users can view presence"
  on public.user_presence for select to authenticated
  using (true);

drop policy if exists "Users insert their presence" on public.user_presence;
create policy "Users insert their presence"
  on public.user_presence for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users update their presence" on public.user_presence;
create policy "Users update their presence"
  on public.user_presence for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

