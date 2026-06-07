create or replace function public.sync_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_auth_user auth.users;
  current_profile public.profiles;
begin
  select *
  into current_auth_user
  from auth.users
  where id = auth.uid();

  if current_auth_user.id is null then
    raise exception 'Not authenticated';
  end if;

  -- Authentication metadata may change between providers or devices. Only
  -- synchronize auth-owned fields; onboarding data belongs to the profile.
  insert into public.profiles (
    id,
    email,
    phone_number,
    google_id,
    name,
    picture,
    photos,
    onboarding_completed
  )
  values (
    current_auth_user.id,
    lower(current_auth_user.email),
    current_auth_user.phone,
    current_auth_user.raw_user_meta_data ->> 'provider_id',
    coalesce(
      current_auth_user.raw_user_meta_data ->> 'name',
      current_auth_user.raw_user_meta_data ->> 'full_name'
    ),
    null,
    array[]::text[],
    false
  )
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.profiles.email),
    phone_number = coalesce(
      excluded.phone_number,
      public.profiles.phone_number
    ),
    google_id = coalesce(excluded.google_id, public.profiles.google_id);

  select *
  into current_profile
  from public.profiles
  where id = current_auth_user.id;

  return current_profile;
end;
$$;

revoke all on function public.sync_current_profile() from public;
grant execute on function public.sync_current_profile() to authenticated;
