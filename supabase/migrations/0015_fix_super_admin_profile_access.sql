-- Fix Super Admin Profile Access
-- Ensure super admins can access their own profile and dashboard

-- 1. Fix the RLS policy to explicitly allow super admins to view their own profile
DROP POLICY IF EXISTS "users can view self" ON public.profiles;
DROP POLICY IF EXISTS "super admin manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "school admin view school profiles" ON public.profiles;

-- Users can view themselves
CREATE POLICY "users can view self" ON public.profiles
  FOR SELECT TO public
  USING (id = auth.uid());

-- Super admins can manage all profiles (including viewing)
CREATE POLICY "super admin manage profiles" ON public.profiles
  FOR ALL TO public
  USING (public.current_user_role() = 'super_admin');

-- School admins can view profiles in their school
CREATE POLICY "school admin view school profiles" ON public.profiles
  FOR SELECT TO public
  USING (
    public.current_user_role() = 'school_admin'
    AND school_id = public.current_school_id()
  );

-- 2. Ensure the current_user_role function works properly
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt()->'user_metadata'->>'role', '')::public.user_role,
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );
$$;
