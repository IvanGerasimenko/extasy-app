create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists web_push_subscriptions_user_id_idx
  on public.web_push_subscriptions(user_id);

alter table public.web_push_subscriptions enable row level security;

drop policy if exists "Users view their web push subscriptions"
  on public.web_push_subscriptions;
create policy "Users view their web push subscriptions"
  on public.web_push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users create their web push subscriptions"
  on public.web_push_subscriptions;
create policy "Users create their web push subscriptions"
  on public.web_push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users update their web push subscriptions"
  on public.web_push_subscriptions;
create policy "Users update their web push subscriptions"
  on public.web_push_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users delete their web push subscriptions"
  on public.web_push_subscriptions;
create policy "Users delete their web push subscriptions"
  on public.web_push_subscriptions for delete to authenticated
  using (user_id = auth.uid());
