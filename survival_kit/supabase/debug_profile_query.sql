-- DEBUG: Test if the profile query actually works from the client's perspective
-- This simulates what your browser is trying to do

-- First, verify the profile exists (run as admin in SQL Editor)
SELECT id, email, role, created_at 
FROM public.profiles 
WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';

-- Now let's check if there are any issues with the query the app is using
-- The app runs: SELECT role FROM profiles WHERE id = 'user_id'
SELECT role 
FROM public.profiles 
WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';

-- Check if there's a case sensitivity issue
SELECT * FROM public.profiles;

-- Let's also make sure RLS isn't being overly restrictive
-- Temporarily disable RLS to test
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Try the query again
SELECT role 
FROM public.profiles 
WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
