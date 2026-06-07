create or replace function public.sync_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_auth_user auth.users;
  current_profile public.profiles;
  source_profile public.profiles;
  source_photos text[];
begin
  select *
  into current_auth_user
  from auth.users
  where id = auth.uid();

  if current_auth_user.id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (
    id,
    email,
    phone_number,
    google_id,
    name,
    picture,
    photos
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
    array[]::text[]
  )
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.profiles.email),
    phone_number = coalesce(excluded.phone_number, public.profiles.phone_number),
    google_id = coalesce(excluded.google_id, public.profiles.google_id);

  select *
  into current_profile
  from public.profiles
  where id = current_auth_user.id;

  if current_auth_user.email is not null
     and current_auth_user.email_confirmed_at is not null then
    select candidate.*
    into source_profile
    from public.profiles candidate
    where lower(trim(candidate.email)) = lower(trim(current_auth_user.email))
    order by
      case when candidate.onboarding_completed then 1 else 0 end desc,
      cardinality(
        array(
          select photo
          from unnest(coalesce(candidate.photos, array[]::text[])) photo
          where photo !~* '(^|[.])googleusercontent[.]com/'
        )
      ) desc,
      (
        (candidate.name is not null)::integer +
        (candidate.about is not null)::integer +
        (candidate.age is not null)::integer +
        (candidate.city is not null)::integer +
        (candidate.country is not null)::integer +
        (candidate.gender is not null)::integer +
        (candidate.looking_for is not null)::integer +
        (cardinality(candidate.interests) > 0)::integer
      ) desc,
      candidate.updated_at desc
    limit 1;
  end if;

  if source_profile.id is not null then
    source_photos := array(
      select photo
      from unnest(coalesce(source_profile.photos, array[]::text[])) photo
      where photo !~* '(^|[.])googleusercontent[.]com/'
    );

    update public.profiles
    set
      email = lower(current_auth_user.email),
      phone_number = coalesce(source_profile.phone_number, current_profile.phone_number),
      google_id = coalesce(source_profile.google_id, current_profile.google_id),
      name = coalesce(nullif(source_profile.name, ''), current_profile.name),
      picture = case
        when cardinality(source_photos) > 0 then source_photos[1]
        else null
      end,
      photos = source_photos,
      about = coalesce(nullif(source_profile.about, ''), current_profile.about),
      age = coalesce(source_profile.age, current_profile.age),
      city = coalesce(nullif(source_profile.city, ''), current_profile.city),
      country = coalesce(nullif(source_profile.country, ''), current_profile.country),
      gender = coalesce(nullif(source_profile.gender, ''), current_profile.gender),
      looking_for = coalesce(
        nullif(source_profile.looking_for, ''),
        current_profile.looking_for
      ),
      interests = case
        when cardinality(source_profile.interests) > 0 then source_profile.interests
        else current_profile.interests
      end,
      is_discover_hidden = current_profile.is_discover_hidden
        or source_profile.is_discover_hidden,
      onboarding_completed = (
        current_profile.onboarding_completed
        or source_profile.onboarding_completed
      ) and (
        cardinality(source_photos) > 0
      )
    where id = current_auth_user.id;
  end if;

  select *
  into current_profile
  from public.profiles
  where id = current_auth_user.id;

  return current_profile;
end;
$$;

revoke all on function public.sync_current_profile() from public;
grant execute on function public.sync_current_profile() to authenticated;
