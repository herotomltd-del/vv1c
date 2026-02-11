/*
  # Fix Profile and Wallet Visibility Issues

  1. Critical Fixes
    - Add missing INSERT RLS policy for wallets table
    - Add missing INSERT RLS policy for user_profiles table
    - Ensure users can create and read their own data

  2. Security
    - Policies are restrictive: users can only insert their own records
    - Uses auth.uid() for authentication checks

  3. Notes
    - These policies are required for the loadUserData() function to work properly
    - Without these, users cannot create wallet/profile records after registration
    - This fixes the "Failed to Load Profile" error
*/

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;

-- Add INSERT policy for user_profiles
-- This allows users to insert their own profile if it doesn't exist
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add INSERT policy for wallets
-- This is CRITICAL - without this, users cannot create their wallet
CREATE POLICY "Users can insert own wallet"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure users can update their own wallet (for balance changes)
CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);