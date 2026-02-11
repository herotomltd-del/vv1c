/*
  # Referral Domain System Settings

  ## Overview
  Admin-controlled settings for custom referral domain management.

  ## New Table
  - `referral_domain_settings` - Admin controls for domain system

  ## Features
  1. Enable/disable custom domain feature
  2. Set max domains per user
  3. Control domain validation rules
  4. Track active domains

  ## Security
  - RLS enabled with admin-only access
*/

-- Create referral domain settings table
CREATE TABLE IF NOT EXISTS referral_domain_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_domains_enabled boolean DEFAULT true,
  max_domains_per_user integer DEFAULT 5,
  require_domain_verification boolean DEFAULT false,
  allowed_domain_pattern text DEFAULT '.*',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE referral_domain_settings ENABLE ROW LEVEL SECURITY;

-- Policies for referral_domain_settings
CREATE POLICY "Anyone can view referral domain settings"
  ON referral_domain_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify referral domain settings"
  ON referral_domain_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Update referral_domains policies to check settings
DROP POLICY IF EXISTS "Users can create own referral domains" ON referral_domains;

CREATE POLICY "Users can create own referral domains"
  ON referral_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      SELECT custom_domains_enabled
      FROM referral_domain_settings
      LIMIT 1
    ) = true
    AND (
      SELECT COUNT(*)
      FROM referral_domains
      WHERE user_id = auth.uid()
    ) < (
      SELECT max_domains_per_user
      FROM referral_domain_settings
      LIMIT 1
    )
  );

-- Insert default settings
INSERT INTO referral_domain_settings (
  custom_domains_enabled,
  max_domains_per_user,
  require_domain_verification,
  allowed_domain_pattern
) VALUES (
  true,
  5,
  false,
  '.*'
) ON CONFLICT DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_referral_domains_user_id ON referral_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_domains_domain ON referral_domains(domain);
