-- Fix: Allow teachers to create parents for their students
-- The issue: Teachers couldn't add students because they couldn't create parent records
-- Solution: Allow teachers to create parents within their school

-- Drop the restrictive policy
drop policy if exists "parents by school" on public.parents;

-- Create new inclusive policy
create policy "parents by school" on public.parents
  for all
  to public
  using (
    (school_id = (select school_id from public.profiles where id = auth.uid()) 
     and current_user_role() in ('school_admin', 'teacher', 'parent'))
    or current_user_role() = 'super_admin'
  )
  with check (
    (school_id = (select school_id from public.profiles where id = auth.uid()) 
     and current_user_role() in ('school_admin', 'teacher', 'parent'))
    or current_user_role() = 'super_admin'
  );
