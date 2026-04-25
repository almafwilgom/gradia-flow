-- Portal RLS, Account Resolution, and Data Healing
-- Run this in the Supabase SQL Editor

-- 1. DROP OLD FUNCTIONS
drop function if exists public.resolve_login_email(text, text, text);

-- 2. CREATE FIXED ACCOUNT RESOLVER (RPC)
create or replace function public.resolve_login_email(
  p_role text,
  p_school_code text,
  p_login_code text
)
returns table (email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
begin
  -- Find school case-insensitive
  select id into v_school_id from public.schools where upper(school_code) = upper(p_school_code);
  
  if v_school_id is null then
    return;
  end if;

  -- Resolve email
  if p_role = 'student' then
    return query
    select p.email
    from public.profiles p
    join public.students s on s.id = p.student_id
    where p.school_id = v_school_id
      and p.role = 'student'
      and (upper(s.student_code) = upper(p_login_code) or upper(s.admission_no) = upper(p_login_code))
    limit 1;
  elsif p_role = 'teacher' then
    return query
    select p.email
    from public.profiles p
    join public.teachers t on t.profile_id = p.id
    where p.school_id = v_school_id
      and p.role = 'teacher'
      and upper(t.teacher_code) = upper(p_login_code)
    limit 1;
  end if;
end;
$$;

-- 3. DATA HEALING: Link any existing student profiles that manual registration missed
do $$
declare
  r record;
  v_student_id uuid;
begin
  -- Loop through all student profiles that have a missing student_id
  for r in (
    select p.id, p.school_id, au.raw_user_meta_data->>'student_code' as s_code
    from public.profiles p
    join auth.users au on au.id = p.id
    where p.role = 'student' 
      and p.student_id is null
      and au.raw_user_meta_data->>'student_code' is not null
  ) loop
    -- Find the matching student record
    select id into v_student_id
    from public.students
    where school_id = r.school_id
      and (upper(student_code) = upper(r.s_code) or upper(admission_no) = upper(r.s_code))
    limit 1;

    -- Link it
    if v_student_id is not null then
      update public.profiles set student_id = v_student_id where id = r.id;
    end if;
  end loop;
end $$;

-- 4. POLICIES (Comprehensive Select Access for Students/Parents)
drop policy if exists "students view portal" on public.students;
create policy "students view portal" on public.students
  for select to public using (
    current_user_role() = 'super_admin'
    or school_id = current_school_id()
  );

drop policy if exists "results view portal" on public.results;
create policy "results view portal" on public.results
  for select to public using (
    current_user_role() = 'super_admin'
    or (
      school_id = current_school_id()
      and (
        current_user_role() in ('school_admin', 'teacher')
        or (current_user_role() = 'student' and student_id = (select student_id from public.profiles where id = auth.uid()))
        or (current_user_role() = 'parent' and student_id in (select id from public.students where parent_id = (select id from public.parents where profile_id = auth.uid())))
      )
    )
  );

drop policy if exists "announcements view portal" on public.announcements;
create policy "announcements view portal" on public.announcements
  for select to public using (
    current_user_role() = 'super_admin'
    or (
      school_id = current_school_id()
      and (
        current_user_role()::text = any(audience)
        or current_user_role() = 'school_admin'
      )
    )
  );

drop policy if exists "payments view portal" on public.payments;
create policy "payments view portal" on public.payments
  for select to public using (
    current_user_role() = 'super_admin'
    or school_id = current_school_id()
  );

drop policy if exists "portal read classes" on public.classes;
create policy "portal read classes" on public.classes
  for select to public using (school_id = current_school_id());
