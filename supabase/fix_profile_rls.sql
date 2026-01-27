-- FIX: Ensure users can read their own profiles
-- The RLS policy might be blocking profile reads

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate the essential policy: users can ALWAYS see their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Verify it worked
SELECT * FROM public.profiles WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';
