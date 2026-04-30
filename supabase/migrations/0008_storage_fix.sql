-- Fix storage buckets and policies
-- 1. Ensure all buckets exist
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('proofs', 'proofs', true),
  ('report-cards', 'report-cards', true),
  ('qr-codes', 'qr-codes', true),
  ('school-logos', 'school-logos', true)
on conflict (id) do nothing;

-- 2. Drop existing policies to avoid conflicts
drop policy if exists "Public Access to Avatars" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

drop policy if exists "Public Access to Proofs" on storage.objects;
drop policy if exists "Authenticated users can upload proofs" on storage.objects;

drop policy if exists "Public read report cards" on storage.objects;
drop policy if exists "Upload report cards" on storage.objects;
drop policy if exists "Update report cards" on storage.objects;

drop policy if exists "Public read qr codes" on storage.objects;
drop policy if exists "Upload qr codes" on storage.objects;
drop policy if exists "Update qr codes" on storage.objects;

drop policy if exists "Public Access to School Logos" on storage.objects;
drop policy if exists "Authenticated users can upload school logos" on storage.objects;
drop policy if exists "Authenticated users can update school logos" on storage.objects;

-- 3. Unified Policies for storage.objects

-- AVATARS
create policy "Public Access to Avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- PROOFS
create policy "Public Access to Proofs"
  on storage.objects for select
  using ( bucket_id = 'proofs' );

create policy "Authenticated users can upload proofs"
  on storage.objects for insert
  with check (
    bucket_id = 'proofs' 
    and auth.role() = 'authenticated'
  );

-- REPORT CARDS
create policy "Public read report cards" 
  on storage.objects for select 
  using ( bucket_id = 'report-cards' );

create policy "Upload report cards" 
  on storage.objects for insert 
  with check ( 
    bucket_id = 'report-cards' 
    and auth.role() = 'authenticated' 
  );

-- QR CODES
create policy "Public read qr codes" 
  on storage.objects for select 
  using ( bucket_id = 'qr-codes' );

create policy "Upload qr codes" 
  on storage.objects for insert 
  with check ( 
    bucket_id = 'qr-codes' 
    and auth.role() = 'authenticated' 
  );

-- SCHOOL LOGOS
create policy "Public Access to School Logos"
  on storage.objects for select
  using ( bucket_id = 'school-logos' );

create policy "Authenticated users can upload school logos"
  on storage.objects for insert
  with check (
    bucket_id = 'school-logos' 
    and auth.role() = 'authenticated'
  );

create policy "Authenticated users can update school logos"
  on storage.objects for update
  using (
    bucket_id = 'school-logos' 
    and auth.role() = 'authenticated'
  );
