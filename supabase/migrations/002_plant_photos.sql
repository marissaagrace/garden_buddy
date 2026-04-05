-- Create public storage bucket for plant milestone photos
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

-- Photos are stored as {user_id}/{plant_id}/{uuid}.{ext}
-- Only the owning user may upload or delete; public read is handled by the bucket being public.

create policy "plant_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'plant-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "plant_photos_select_own"
  on storage.objects for select
  using (
    bucket_id = 'plant-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "plant_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'plant-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
