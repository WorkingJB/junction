-- Add first_name and last_name columns to users table
-- This migration replaces the single full_name field with separate first/last name fields

-- Add new columns
ALTER TABLE public.users
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT;

-- Drop the old full_name column (safe because we have no users yet)
ALTER TABLE public.users
  DROP COLUMN full_name;

-- Update the handle_new_user function to use first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN public.users.first_name IS 'User''s first name';
COMMENT ON COLUMN public.users.last_name IS 'User''s last name';
