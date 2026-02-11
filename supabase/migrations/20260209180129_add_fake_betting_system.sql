/*
  # Fake Betting System for Live Game Display

  1. New Tables
    - `fake_betting_config`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `active_players_count` (integer) - Number of fake active players
      - `total_bet_amount` (numeric) - Total fake bet amount
      - `is_enabled` (boolean) - Whether fake betting is enabled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `fake_players`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `player_name` (text) - Fake player display name
      - `bet_amount` (numeric) - Player's bet amount
      - `win_amount` (numeric) - Player's win amount (null if didn't win)
      - `is_winner` (boolean) - Whether player won
      - `display_order` (integer) - Order to display
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Public can read (for display)
    - Only admins can modify

  3. Important Notes
    - Fake betting data is used for display purposes to create excitement
    - Admins can control all fake betting parameters
    - Real betting data is separate and not affected
*/

-- Create fake_betting_config table
CREATE TABLE IF NOT EXISTS fake_betting_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  active_players_count integer DEFAULT 0,
  total_bet_amount numeric(15,2) DEFAULT 0,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_id)
);

-- Create fake_players table
CREATE TABLE IF NOT EXISTS fake_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_name text NOT NULL,
  bet_amount numeric(15,2) DEFAULT 0,
  win_amount numeric(15,2) DEFAULT 0,
  is_winner boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE fake_betting_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE fake_players ENABLE ROW LEVEL SECURITY;

-- Policies for fake_betting_config
CREATE POLICY "Anyone can view fake betting config"
  ON fake_betting_config
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can insert fake betting config"
  ON fake_betting_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update fake betting config"
  ON fake_betting_config
  FOR UPDATE
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

CREATE POLICY "Only admins can delete fake betting config"
  ON fake_betting_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Policies for fake_players
CREATE POLICY "Anyone can view fake players"
  ON fake_players
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can insert fake players"
  ON fake_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update fake players"
  ON fake_players
  FOR UPDATE
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

CREATE POLICY "Only admins can delete fake players"
  ON fake_players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fake_betting_config_game_id ON fake_betting_config(game_id);
CREATE INDEX IF NOT EXISTS idx_fake_players_game_id ON fake_players(game_id);
CREATE INDEX IF NOT EXISTS idx_fake_players_display_order ON fake_players(game_id, display_order);
