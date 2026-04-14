-- Add goal weight column to profiles table for tracking weight targets.
-- Nullable — null for Maintain goal users. Stored in kg.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_weight_kg NUMERIC;
