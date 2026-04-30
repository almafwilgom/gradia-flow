-- Fix Security Advisor issue: Change school_directory to SECURITY INVOKER
-- This ensures RLS on the underlying 'schools' table is respected.
drop view if exists public.school_directory cascade;

create view public.school_directory 
with (security_invoker = true)
as
select id, name, logo_url, school_code
from public.schools
where status = 'approved';

-- Fix Security Advisor issue: Change vw_school_overview to SECURITY INVOKER
drop view if exists public.vw_school_overview cascade;

create view public.vw_school_overview 
with (security_invoker = true)
as
select
  s.id,
  s.name,
  s.school_code,
  s.status,
  s.demo_started_at,
  s.demo_expires_at,
  s.subscription_status,
  s.current_term_fees,
  s.next_resumption_date,
  s.created_at,
  (select count(*) from public.students st where st.school_id = s.id) as total_students,
  (select count(*) from public.classes c where c.school_id = s.id) as total_classes
from public.schools s;

grant select on public.vw_school_overview to authenticated;

-- Fix Security Advisor issue: Change vw_dashboard_stats to SECURITY INVOKER
drop view if exists public.vw_dashboard_stats cascade;

create view public.vw_dashboard_stats 
with (security_invoker = true)
as
select
  s.id as school_id,
  (select count(*) from public.teachers t where t.school_id = s.id) as total_teachers,
  (select count(*) from public.students st where st.school_id = s.id) as total_students,
  (select count(*) from public.parents p where p.school_id = s.id) as total_parents,
  (select count(*) from public.classes c where c.school_id = s.id) as total_classes,
  coalesce(
    (
      select avg(case when a.status = 'present' then 1 else 0 end)
      from public.attendance_students a
      where a.school_id = s.id
        and a.attended_on > (now() - interval '30 days')
    ),
    0
  ) as attendance_pct,
  coalesce(
    (
      select sum(pay.amount)
      from public.payments pay
      where pay.school_id = s.id
        and pay.status = 'approved'
    ),
    0
  ) as fees_collected
from public.schools s;

grant select on public.vw_dashboard_stats to authenticated;

-- 1. Fix Function Search Path Mutable (Security Hardening)
-- Adding 'set search_path = public' to all functions to prevent search path hijacking.

alter function public.generate_verification_token() set search_path = public;
alter function public.generate_qr_code_data(uuid) set search_path = public;
alter function public.generate_school_code() set search_path = public;
alter function public.generate_student_code() set search_path = public;
alter function public.generate_teacher_code() set search_path = public;
alter function public.ensure_school_code() set search_path = public;
alter function public.ensure_student_code() set search_path = public;
alter function public.ensure_teacher_code() set search_path = public;
alter function public.sync_result_lock() set search_path = public;
alter function public.current_user_role() set search_path = public;
alter function public.current_school_id() set search_path = public;
alter function public.current_teacher_class_id() set search_path = public;
alter function public.rls_auto_enable() set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.resolve_login_email(text, text, text) set search_path = public;

-- 2. Restrict Execution of SECURITY DEFINER functions
-- Revoke from public (which includes anon) and grant only to intended roles.

revoke execute on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

revoke execute on function public.current_school_id() from public;
grant execute on function public.current_school_id() to authenticated;

revoke execute on function public.current_teacher_class_id() from public;
grant execute on function public.current_teacher_class_id() to authenticated;

revoke execute on function public.rls_auto_enable() from public;
-- rls_auto_enable is likely a system function, revoking from public is safe.

revoke execute on function public.handle_new_user() from public;
-- handle_new_user is a trigger, doesn't need public execute.

-- resolve_login_email MUST be executable by anon for the login flow to work.
-- We keep it but ensure it's hardened with search_path (done above).

-- 3. Tighten over-permissive RLS Policy on schools
drop policy if exists "public can create schools" on public.schools;
create policy "public can create schools" on public.schools
  for insert to public
  with check (status = 'pending');

-- 4. Fix Public Bucket Listing (Security Hardening)
-- Public buckets (public=true) don't need SELECT policies for object URL access.
-- Removing broad SELECT policies prevents unauthorized listing of all files.

drop policy if exists "Public Access to Avatars" on storage.objects;
drop policy if exists "Public Access to School Logos" on storage.objects;
drop policy if exists "Public read report cards" on storage.objects;
drop policy if exists "Public Access to Proofs" on storage.objects;
drop policy if exists "Public read qr codes" on storage.objects;
