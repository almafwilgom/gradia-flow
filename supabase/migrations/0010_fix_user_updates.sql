-- Add missing update policies for portal users
-- 1. Allow users to update their own profile (for avatar_url updates)
drop policy if exists "users can update self" on public.profiles;
create policy "users can update self" on public.profiles
  for update to public
  using (id = auth.uid())
  with check (id = auth.uid());

-- 2. Allow students/parents to update payments (for proof_url uploads)
drop policy if exists "users can update own payments" on public.payments;
create policy "users can update own payments" on public.payments
  for update to public
  using (
    student_id = (select student_id from public.profiles where id = auth.uid())
    or student_id in (select id from public.students where parent_id = (select id from public.parents where profile_id = auth.uid()))
  )
  with check (
    student_id = (select student_id from public.profiles where id = auth.uid())
    or student_id in (select id from public.students where parent_id = (select id from public.parents where profile_id = auth.uid()))
  );
