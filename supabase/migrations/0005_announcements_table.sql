-- Announcements table for system-wide and school-specific announcements
-- Run with: supabase db push

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  title text not null,
  description text,
  content text,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz,
  is_active boolean default true
);

create index if not exists announcements_school_idx on public.announcements(school_id, is_active);
create index if not exists announcements_created_idx on public.announcements(created_at desc);

-- RLS Policies for announcements
alter table public.announcements enable row level security;

drop policy if exists "Public read announcements" on public.announcements;
create policy "Public read announcements" on public.announcements for select using (
  is_active = true AND (expires_at IS NULL OR expires_at > now())
);

drop policy if exists "Admins can manage announcements" on public.announcements;
create policy "Admins can manage announcements" on public.announcements for all using (
  auth.jwt() ->> 'role' in ('school_admin', 'super_admin')
  or author_id = auth.uid()
);
