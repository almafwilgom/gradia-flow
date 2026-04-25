insert into storage.buckets (id, name, public) values ('report-cards', 'report-cards', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('qr-codes', 'qr-codes', true) on conflict (id) do nothing;

-- Policies for report-cards
drop policy if exists "Public read report cards" on storage.objects;
create policy "Public read report cards" on storage.objects for select using ( bucket_id = 'report-cards' );
drop policy if exists "Upload report cards" on storage.objects;
create policy "Upload report cards" on storage.objects for insert with check ( bucket_id = 'report-cards' and auth.role() = 'authenticated' );
drop policy if exists "Update report cards" on storage.objects;
create policy "Update report cards" on storage.objects for update with check ( bucket_id = 'report-cards' and auth.role() = 'authenticated' );

-- Policies for qr-codes
drop policy if exists "Public read qr codes" on storage.objects;
create policy "Public read qr codes" on storage.objects for select using ( bucket_id = 'qr-codes' );
drop policy if exists "Upload qr codes" on storage.objects;
create policy "Upload qr codes" on storage.objects for insert with check ( bucket_id = 'qr-codes' and auth.role() = 'authenticated' );
drop policy if exists "Update qr codes" on storage.objects;
create policy "Update qr codes" on storage.objects for update with check ( bucket_id = 'qr-codes' and auth.role() = 'authenticated' );
