-- COMPREHENSIVE FIX: Reset all RLS policies on profiles table
-- This will ensure you can read your own profile

-- Step 1: Disable RLS temporarily (to test)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Step 4: Create a simple, foolproof policy
CREATE POLICY "enable_read_own_profile" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

-- Step 5: Test the query (should return your profile)
SELECT id, email, role 
FROM public.profiles 
WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';

-- Step 6: List all policies to verify
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
