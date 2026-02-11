/*
  # Advanced Casino Platform Features

  ## 1. New Tables
    - `referral_domains` - Custom domains for referral links
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `domain` (text, unique)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
    
    - `user_promo_codes` - User-created promo codes
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `code` (text, unique)
      - `creator_commission_percentage` (numeric)
      - `user_commission_percentage` (numeric)
      - `uses` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
    
    - `promo_code_uses` - Track promo code usage
      - `id` (uuid, primary key)
      - `promo_code_id` (uuid, foreign key to user_promo_codes)
      - `user_id` (uuid, foreign key to user_profiles)
      - `commission_amount` (numeric)
      - `created_at` (timestamptz)
    
    - `bonus_settings` - Platform bonus configuration
      - `id` (uuid, primary key)
      - `welcome_bonus_enabled` (boolean)
      - `welcome_bonus_amount` (numeric)
      - `login_bonus_enabled` (boolean)
      - `login_bonus_amount` (numeric)
      - `bonus_loss_percentage` (numeric)
      - `updated_at` (timestamptz)
    
    - `user_login_history` - Track user logins for daily bonus
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `login_date` (date)
      - `bonus_claimed` (boolean)
      - `created_at` (timestamptz)
    
    - `live_betting_fake_data` - Admin-controlled fake betting display
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `active_players` (integer)
      - `total_bet_amount` (numeric)
      - `fake_player_names` (jsonb)
      - `fake_bets` (jsonb)
      - `fake_wins` (jsonb)
      - `is_active` (boolean)
      - `updated_at` (timestamptz)

  ## 2. Modifications to Existing Tables
    - Add to `games` table:
      - `is_active` (boolean) - ON/OFF toggle
      - `min_bet_editable` (boolean)
      - `max_bet_editable` (boolean)
      - `profit_percentage` (numeric)
    
    - Add to `user_profiles` table:
      - `referral_domain` (text)
    
    - Add to `wallets` table:
      - `bonus_wagered` (numeric) - Track bonus wagering
      - `bonus_loss_percentage` (numeric) - Required loss %

  ## 3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
    - Add admin-only policies for sensitive operations
*/

-- Create referral_domains table
CREATE TABLE IF NOT EXISTS referral_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  domain text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referral_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own domains"
  ON referral_domains FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own domains"
  ON referral_domains FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own domains"
  ON referral_domains FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all domains"
  ON referral_domains FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create user_promo_codes table
CREATE TABLE IF NOT EXISTS user_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  code text UNIQUE NOT NULL,
  creator_commission_percentage numeric DEFAULT 0 CHECK (creator_commission_percentage >= 0 AND creator_commission_percentage <= 100),
  user_commission_percentage numeric DEFAULT 0 CHECK (user_commission_percentage >= 0 AND user_commission_percentage <= 100),
  uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo codes"
  ON user_promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create own promo codes"
  ON user_promo_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own promo codes"
  ON user_promo_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all promo codes"
  ON user_promo_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create promo_code_uses table
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid REFERENCES user_promo_codes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  commission_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promo uses"
  ON promo_code_uses FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_promo_codes
      WHERE user_promo_codes.id = promo_code_id
      AND user_promo_codes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create promo uses"
  ON promo_code_uses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all promo uses"
  ON promo_code_uses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create bonus_settings table
CREATE TABLE IF NOT EXISTS bonus_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  welcome_bonus_enabled boolean DEFAULT false,
  welcome_bonus_amount numeric DEFAULT 0,
  login_bonus_enabled boolean DEFAULT false,
  login_bonus_amount numeric DEFAULT 0,
  bonus_loss_percentage numeric DEFAULT 0 CHECK (bonus_loss_percentage >= 0 AND bonus_loss_percentage <= 100),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bonus_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bonus settings"
  ON bonus_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update bonus settings"
  ON bonus_settings FOR ALL
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

-- Insert default bonus settings if not exists
INSERT INTO bonus_settings (welcome_bonus_enabled, welcome_bonus_amount, login_bonus_enabled, login_bonus_amount, bonus_loss_percentage)
SELECT false, 100, false, 10, 50
WHERE NOT EXISTS (SELECT 1 FROM bonus_settings LIMIT 1);

-- Create user_login_history table
CREATE TABLE IF NOT EXISTS user_login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  login_date date DEFAULT CURRENT_DATE,
  bonus_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON user_login_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create login history"
  ON user_login_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all login history"
  ON user_login_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create live_betting_fake_data table
CREATE TABLE IF NOT EXISTS live_betting_fake_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  active_players integer DEFAULT 0,
  total_bet_amount numeric DEFAULT 0,
  fake_player_names jsonb DEFAULT '[]'::jsonb,
  fake_bets jsonb DEFAULT '[]'::jsonb,
  fake_wins jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE live_betting_fake_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active fake betting data"
  ON live_betting_fake_data FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Only admins can manage fake betting data"
  ON live_betting_fake_data FOR ALL
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

-- Add columns to games table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'is_active') THEN
    ALTER TABLE games ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'profit_percentage') THEN
    ALTER TABLE games ADD COLUMN profit_percentage numeric DEFAULT 5;
  END IF;
END $$;

-- Add columns to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'referral_domain') THEN
    ALTER TABLE user_profiles ADD COLUMN referral_domain text;
  END IF;
END $$;

-- Add columns to wallets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'bonus_wagered') THEN
    ALTER TABLE wallets ADD COLUMN bonus_wagered numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'bonus_loss_percentage') THEN
    ALTER TABLE wallets ADD COLUMN bonus_loss_percentage numeric DEFAULT 0;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_referral_domains_user_id ON referral_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_user_id ON user_promo_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_code ON user_promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user_id ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_promo_code_id ON promo_code_uses(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_login_date ON user_login_history(login_date);
CREATE INDEX IF NOT EXISTS idx_live_betting_fake_data_game_id ON live_betting_fake_data(game_id);
