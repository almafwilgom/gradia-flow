-- ========================================================
-- NUCLEAR RESET: RLS RECURSION & ACCESS DENIED FIX
-- ========================================================

-- PHASE 1: Emergency Access (Disable RLS temporarily)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;

-- PHASE 2: Re-define Secure Functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(
    nullif(auth.jwt()->'user_metadata'->>'role', '')::public.user_role,
    (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

-- PHASE 3: Drop and Recreate All Policies Cleanly
DO $$ 
BEGIN
    -- Drop all relevant policies to ensure a clean slate
    DROP POLICY IF EXISTS "users can view self" ON public.profiles;
    DROP POLICY IF EXISTS "school admin view school profiles" ON public.profiles;
    DROP POLICY IF EXISTS "super admin manage profiles" ON public.profiles;
    DROP POLICY IF EXISTS "super admin manage schools" ON public.schools;
    DROP POLICY IF EXISTS "school admin read own school" ON public.schools;
    DROP POLICY IF EXISTS "school admin update own school" ON public.schools;
    DROP POLICY IF EXISTS "classes by school" ON public.classes;
END $$;

-- Profiles
CREATE POLICY "users can view self" ON public.profiles FOR SELECT TO public USING (id = auth.uid());
CREATE POLICY "super admin manage profiles" ON public.profiles FOR ALL TO public USING (public.current_user_role() = 'super_admin');
CREATE POLICY "school admin view school profiles" ON public.profiles FOR SELECT TO public USING (public.current_user_role() = 'school_admin' AND school_id = public.current_school_id());

-- Schools
CREATE POLICY "super admin manage schools" ON public.schools FOR ALL TO public USING (public.current_user_role() = 'super_admin');
CREATE POLICY "school admin read own school" ON public.schools FOR SELECT TO public USING (id = public.current_school_id());
CREATE POLICY "school admin update own school" ON public.schools FOR UPDATE TO public USING (id = public.current_school_id());

-- Classes
CREATE POLICY "classes by school" ON public.classes FOR ALL TO public USING (public.current_user_role() = 'super_admin' OR school_id = public.current_school_id());

-- PHASE 4: Re-enable Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
