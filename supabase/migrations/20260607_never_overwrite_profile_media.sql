create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    phone_number,
    name,
    picture,
    photos
  )
  values (
    new.id,
    lower(new.email),
    new.phone,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name'
    ),
    null,
    array[]::text[]
  )
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.profiles.email),
    phone_number = coalesce(
      excluded.phone_number,
      public.profiles.phone_number
    ),
    name = coalesce(public.profiles.name, excluded.name);

  return new;
exception
  when others then
    raise warning 'Could not create profile for auth user %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

