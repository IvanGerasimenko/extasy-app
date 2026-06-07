insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Users upload profile photos" on storage.objects;
create policy "Users upload profile photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update profile photos" on storage.objects;
create policy "Users update profile photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated users view profile photos"
  on storage.objects;
create policy "Authenticated users view profile photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos');

drop policy if exists "Users manage profile photos" on storage.objects;
create policy "Users manage profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
