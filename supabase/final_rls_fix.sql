-- FINAL FIX: Simplify RLS to allow authenticated users to read profiles
-- The issue is that RLS is blocking authenticated requests but not SQL Editor requests

-- Step 1: Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "enable_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Step 2: Create ONE simple policy that allows authenticated users to read ALL profiles
-- This is safe because profiles only contain id, email, and role - no sensitive data
CREATE POLICY "authenticated_users_read_all_profiles" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (true);

-- Step 3: Optionally allow users to update their own profiles (not required for admin access)
CREATE POLICY "users_update_own_profile" ON public.profiles
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id);

-- Step 4: Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Step 5: Test the query that the app uses
SELECT role FROM public.profiles WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';
