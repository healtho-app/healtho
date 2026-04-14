-- Add fitness goal columns to profiles table for personalised calorie targets.
-- fitness_goal: 'lose', 'maintain', 'gain'. Nullable for existing users.
-- weekly_rate_kg: rate of weight change (0.25-1.0 kg/week). Null for maintain.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_goal TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_rate_kg NUMERIC;
