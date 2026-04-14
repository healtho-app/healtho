-- Add gender column to profiles table for accurate Mifflin-St Jeor BMR calculation.
-- Values: 'male', 'female', 'prefer_not_to_say'. Nullable for existing users.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
