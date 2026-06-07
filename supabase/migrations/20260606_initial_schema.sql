create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone_number text,
  google_id text,
  name text,
  picture text,
  photos text[] not null default '{}',
  about text,
  age integer check (age is null or age >= 18),
  city text,
  country text,
  gender text,
  looking_for text,
  interests text[] not null default '{}',
  likes_count integer not null default 0,
  matches_count integer not null default 0,
  is_discover_hidden boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'skipped')),
  match_id uuid,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references public.profiles(id) on delete cascade,
  user_two_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_one_id, user_two_id),
  check (user_one_id::text < user_two_id::text)
);

alter table public.likes
  drop constraint if exists likes_match_id_fkey;
alter table public.likes
  add constraint likes_match_id_fkey
  foreign key (match_id) references public.matches(id) on delete set null;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text,
  image_url text,
  emoji text,
  photo_reaction text,
  created_at timestamptz not null default now(),
  check (
    nullif(trim(coalesce(text, '')), '') is not null
    or nullif(trim(coalesce(image_url, '')), '') is not null
    or nullif(trim(coalesce(emoji, '')), '') is not null
  )
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.notification_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_key text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, phone_number, google_id, name, picture, photos
  )
  values (
    new.id,
    new.email,
    new.phone,
    new.raw_user_meta_data ->> 'provider_id',
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url',
    case
      when new.raw_user_meta_data ->> 'avatar_url' is null then '{}'
      else array[new.raw_user_meta_data ->> 'avatar_url']
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

create or replace function public.refresh_profile_counters()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  affected_user_ids uuid[];
  affected_user_id uuid;
begin
  if tg_table_name = 'likes' then
    if tg_op = 'DELETE' then
      affected_user_ids := array[old.from_user_id, old.to_user_id];
    else
      affected_user_ids := array[new.from_user_id, new.to_user_id];
    end if;
  else
    if tg_op = 'DELETE' then
      affected_user_ids := array[old.user_one_id, old.user_two_id];
    else
      affected_user_ids := array[new.user_one_id, new.user_two_id];
    end if;
  end if;

  foreach affected_user_id in array affected_user_ids loop
    update public.profiles
    set
      likes_count = (
        select count(*) from public.likes
        where from_user_id = affected_user_id
      ),
      matches_count = (
        select count(*) from public.matches
        where affected_user_id in (user_one_id, user_two_id)
      )
    where id = affected_user_id;
  end loop;
  return null;
end;
$$;

drop trigger if exists likes_refresh_profile_counters on public.likes;
create trigger likes_refresh_profile_counters
  after insert or update or delete on public.likes
  for each row execute procedure public.refresh_profile_counters();

drop trigger if exists matches_refresh_profile_counters on public.matches;
create trigger matches_refresh_profile_counters
  after insert or delete on public.matches
  for each row execute procedure public.refresh_profile_counters();

create or replace function public.is_match_member(target_match_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.matches
    where id = target_match_id
      and auth.uid() in (user_one_id, user_two_id)
  );
$$;

create or replace function public.react_to_message(
  target_message_id uuid,
  reaction text
)
returns public.messages
language plpgsql
security definer set search_path = public
as $$
declare
  updated_message public.messages;
begin
  update public.messages
  set photo_reaction = nullif(trim(reaction), '')
  where id = target_message_id
    and public.is_match_member(match_id)
  returning * into updated_message;

  if updated_message.id is null then
    raise exception 'Message not found or access denied';
  end if;

  return updated_message;
end;
$$;

revoke all on function public.react_to_message(uuid, text) from public;
grant execute on function public.react_to_message(uuid, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.notification_reads enable row level security;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select to authenticated using (true);
drop policy if exists "Users update their profile" on public.profiles;
create policy "Users update their profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "Users insert their profile" on public.profiles;
create policy "Users insert their profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "Like participants can view likes" on public.likes;
create policy "Like participants can view likes"
  on public.likes for select to authenticated
  using (auth.uid() in (from_user_id, to_user_id));
drop policy if exists "Users create their likes" on public.likes;
create policy "Users create their likes"
  on public.likes for insert to authenticated
  with check (from_user_id = auth.uid());
drop policy if exists "Recipients respond to likes" on public.likes;
create policy "Recipients respond to likes"
  on public.likes for update to authenticated
  using (to_user_id = auth.uid())
  with check (to_user_id = auth.uid());
drop policy if exists "Users delete related likes" on public.likes;
create policy "Users delete related likes"
  on public.likes for delete to authenticated
  using (auth.uid() in (from_user_id, to_user_id));

drop policy if exists "Match members can view matches" on public.matches;
create policy "Match members can view matches"
  on public.matches for select to authenticated
  using (auth.uid() in (user_one_id, user_two_id));
drop policy if exists "Users create mutual matches" on public.matches;
create policy "Users create mutual matches"
  on public.matches for insert to authenticated
  with check (
    auth.uid() in (user_one_id, user_two_id)
    and exists (
      select 1 from public.likes
      where status = 'accepted'
        and from_user_id in (user_one_id, user_two_id)
        and to_user_id in (user_one_id, user_two_id)
    )
  );
drop policy if exists "Match members can delete matches" on public.matches;
create policy "Match members can delete matches"
  on public.matches for delete to authenticated
  using (auth.uid() in (user_one_id, user_two_id));

drop policy if exists "Match members can view messages" on public.messages;
create policy "Match members can view messages"
  on public.messages for select to authenticated
  using (public.is_match_member(match_id));
drop policy if exists "Match members can send messages" on public.messages;
create policy "Match members can send messages"
  on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_match_member(match_id));
drop policy if exists "Senders update their messages" on public.messages;
create policy "Senders update their messages"
  on public.messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

drop policy if exists "Users view related blocks" on public.blocks;
create policy "Users view related blocks"
  on public.blocks for select to authenticated
  using (auth.uid() in (blocker_id, blocked_id));
drop policy if exists "Users create blocks" on public.blocks;
create policy "Users create blocks"
  on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());
drop policy if exists "Users remove their blocks" on public.blocks;
create policy "Users remove their blocks"
  on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "Users view notification reads" on public.notification_reads;
create policy "Users view notification reads"
  on public.notification_reads for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Users create notification reads" on public.notification_reads;
create policy "Users create notification reads"
  on public.notification_reads for insert to authenticated
  with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do update set public = false;

drop policy if exists "Users upload profile photos" on storage.objects;
create policy "Users upload profile photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "Anyone views profile photos" on storage.objects;
create policy "Anyone views profile photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos');
drop policy if exists "Users manage profile photos" on storage.objects;
create policy "Users manage profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users upload chat media" on storage.objects;
create policy "Users upload chat media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "Authenticated users view chat media" on storage.objects;
create policy "Authenticated users view chat media"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-media');

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
