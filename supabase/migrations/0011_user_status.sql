-- Add status to profiles to allow disabling users
alter table public.profiles add column if not exists status text default 'active';

-- Add status to teachers as well for more granular control if needed
alter table public.teachers add column if not exists status text default 'active';
