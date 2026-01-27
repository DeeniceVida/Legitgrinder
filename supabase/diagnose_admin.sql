-- DIAGNOSTIC: Check if your admin account exists and has the right role
-- Run this in Supabase SQL Editor

-- 1. Check if the user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';

-- 2. Check if the profile exists and has admin role
SELECT id, email, role 
FROM public.profiles 
WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';

-- 3. If profile doesn't exist, create it manually
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users 
WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 4. Verify all profiles
SELECT * FROM public.profiles;
