-- Grant Admin Access to User
-- Run this in your Supabase SQL Editor to make yourself an admin

-- Update the user's role to admin
UPDATE public.profiles 
SET role = 'admin'
WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';

-- Verify the change
SELECT id, email, role
FROM public.profiles 
WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';
