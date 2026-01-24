-- Add user preference fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS import_needs TEXT[];

-- Update existing admin profile if needed
UPDATE profiles SET full_name = 'Admin User' WHERE role = 'admin' AND full_name IS NULL;
