-- SQL Script to grant Admin Access
-- Go to Supabase Dashboard -> SQL Editor -> New Query -> Paste and Run

INSERT INTO public.profiles (id, role)
VALUES ('8c1eb535-2957-4e44-85cb-a2127741d5c7', 'admin')
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- Also ensure the user email is allowed in App.tsx logic if needed
-- But this SQL script handles the database permission directly.
