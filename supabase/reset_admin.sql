-- RUN THIS IN THE SUPABASE SQL EDITOR TO SET YOUR ADMIN PASSWORD
-- This script updates the user 'mungaimports@gmail.com' with the password you requested.

DO $$ 
DECLARE
  target_email TEXT := 'mungaimports@gmail.com';
  target_password TEXT := 'Munene_madeit_LegitG';
  user_id UUID;
BEGIN
  -- 1. Find the user ID
  SELECT id INTO user_id FROM auth.users WHERE email = target_email;

  IF user_id IS NULL THEN
    RAISE NOTICE 'User % not found. Please sign up on the website first, then run this script again.', target_email;
  ELSE
    -- 2. Update the password (hashed using pgcrypto which Supabase uses)
    UPDATE auth.users 
    SET encrypted_password = crypt(target_password, gen_salt('bf'))
    WHERE id = user_id;

    -- 3. Ensure the profile is set to admin
    INSERT INTO public.profiles (id, email, role)
    VALUES (user_id, target_email, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';

    RAISE NOTICE 'Admin credentials updated successfully for %', target_email;
  END IF;
END $$;
