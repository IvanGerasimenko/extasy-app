create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_reporter_id_idx
  on public.reports (reporter_id);

create index if not exists reports_status_created_at_idx
  on public.reports (status, created_at desc);

drop trigger if exists reports_touch_updated_at on public.reports;
create trigger reports_touch_updated_at
  before update on public.reports
  for each row execute procedure public.touch_updated_at();

alter table public.reports enable row level security;

drop policy if exists "Users create their reports" on public.reports;
create policy "Users create their reports"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "Users view their reports" on public.reports;
create policy "Users view their reports"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid());
