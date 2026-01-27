-- CRITICAL FIX: The profiles table might have the wrong schema
-- Let's check and fix it

-- Step 1: Check the current schema of profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if needed
DO $$
BEGIN
    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    END IF;
    
    -- Add email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT UNIQUE;
    END IF;
END $$;

-- Step 3: Verify your profile exists with all columns
SELECT * FROM public.profiles WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';

-- Step 4: Make sure the SELECT policy works
SELECT role FROM public.profiles WHERE id = 'cd56999b-b3bd-4c55-8613-f62173d3dc07';
