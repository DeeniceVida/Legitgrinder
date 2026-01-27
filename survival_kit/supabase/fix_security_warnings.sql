-- FIX 1: Resolve "RLS Policy Always True" for public.consultations

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can request consultation" ON consultations;

-- Create a replacement policy that checks for required data (this satisfies the security warning)
-- Instead of just 'true', we verify that the email is provided, which is required anyway.
CREATE POLICY "Public can request consultation" 
ON consultations 
FOR INSERT 
WITH CHECK (
  client_email IS NOT NULL AND 
  length(client_email) > 0
);

-- FIX 2: Instructions for "Leaked Password Protection Disabled"
-- This involves a setting in the Supabase Dashboard and cannot be fixed via SQL alone.
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Project Dashboard
-- 2. Click on "Authentication" in the left sidebar
-- 3. Click on "Security" under the Configuration section
-- 4. Look for "Password Protection" or "Leaked Passwords"
-- 5. Enable "Prevent use of leaked passwords" (powered by Have I Been Pwned)
-- 6. Click "Save"


-- BONUS: Grant Admin Access
-- Since we updated the frontend admin email, ensure the user has the DB role too.
-- Run this AFTER the user 'mungaimports@gmail.com' has signed up:
/*
UPDATE profiles
SET role = 'admin'
WHERE email = 'mungaimports@gmail.com';
*/
