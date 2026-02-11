/*
  # Markozon Online Betting Casino Platform - Complete Database Schema

  ## Overview
  Production-grade online casino and betting platform with complete admin control,
  referral system, agent management, and fraud protection.

  ## Tables Created

  ### 1. User Management
  - `user_profiles` - Extended user information beyond auth.users
  - `wallets` - Main balance and bonus balance tracking
  - `referrals` - Referral relationships and earnings
  - `referral_settings` - Admin-controlled referral configuration

  ### 2. Gaming System
  - `games` - Available casino games configuration
  - `game_sessions` - Individual game play sessions
  - `bets` - All betting records
  - `game_settings` - Per-game RTP and profit controls

  ### 3. Cricket Betting
  - `cricket_matches` - Match listings and live scores
  - `cricket_bets` - Cricket betting records
  - `cricket_odds` - Dynamic odds management

  ### 4. Financial System
  - `transactions` - All financial transactions
  - `deposit_requests` - Manual deposit requests
  - `withdrawal_requests` - Withdrawal requests with approval
  - `payment_settings` - Payment gateway configurations

  ### 5. Promo & Marketing
  - `promo_codes` - User and admin created promo codes
  - `promo_usage` - Promo code usage tracking
  - `promo_settings` - Admin promo code controls

  ### 6. Agent System
  - `agents` - Agent accounts with permissions
  - `agent_transactions` - Agent activity tracking
  - `agent_settings` - Agent system configuration

  ### 7. Admin & Security
  - `admin_settings` - Global platform settings
  - `fraud_logs` - Security and fraud detection logs
  - `activity_logs` - System activity audit trail

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Restrictive policies requiring authentication
  - Admin-only access for sensitive tables
  - Audit trails for all critical operations
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER PROFILES & WALLETS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  full_name text,
  referral_code text UNIQUE NOT NULL,
  referred_by uuid REFERENCES auth.users(id),
  is_agent boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  is_active boolean DEFAULT true,
  kyc_verified boolean DEFAULT false,
  device_fingerprint text,
  last_ip text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  main_balance decimal(15,2) DEFAULT 0 NOT NULL CHECK (main_balance >= 0),
  bonus_balance decimal(15,2) DEFAULT 0 NOT NULL CHECK (bonus_balance >= 0),
  total_deposited decimal(15,2) DEFAULT 0 NOT NULL,
  total_withdrawn decimal(15,2) DEFAULT 0 NOT NULL,
  total_wagered decimal(15,2) DEFAULT 0 NOT NULL,
  total_won decimal(15,2) DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. REFERRAL SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  enabled boolean DEFAULT true,
  commission_percentage decimal(5,2) DEFAULT 5.00,
  deposit_bonus_percentage decimal(5,2) DEFAULT 10.00,
  duration_type text DEFAULT 'lifetime' CHECK (duration_type IN ('lifetime', '1year', '6months', '3months')),
  min_deposit_for_bonus decimal(10,2) DEFAULT 100.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_earned decimal(15,2) DEFAULT 0 NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- =====================================================
-- 3. GAMES SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('aviator', 'crash', 'slots', 'roulette', 'blackjack', 'plinko', 'super_ace')),
  description text,
  thumbnail_url text,
  is_active boolean DEFAULT true,
  min_bet decimal(10,2) DEFAULT 10.00,
  max_bet decimal(10,2) DEFAULT 10000.00,
  house_edge decimal(5,2) DEFAULT 5.00,
  rtp_percentage decimal(5,2) DEFAULT 95.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  bet_amount decimal(10,2) NOT NULL,
  payout_amount decimal(10,2) DEFAULT 0,
  multiplier decimal(10,2) DEFAULT 0,
  result text CHECK (result IN ('win', 'loss', 'pending')),
  game_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_id uuid REFERENCES games(id),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  bet_type text NOT NULL CHECK (bet_type IN ('casino', 'cricket', 'sports')),
  bet_amount decimal(10,2) NOT NULL,
  potential_payout decimal(10,2),
  actual_payout decimal(10,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cancelled')),
  bet_data jsonb,
  created_at timestamptz DEFAULT now(),
  settled_at timestamptz
);

-- =====================================================
-- 4. CRICKET BETTING
-- =====================================================

CREATE TABLE IF NOT EXISTS cricket_matches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_name text NOT NULL,
  team_a text NOT NULL,
  team_b text NOT NULL,
  match_date timestamptz NOT NULL,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  live_score jsonb,
  result text,
  is_betting_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cricket_odds (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id uuid REFERENCES cricket_matches(id) ON DELETE CASCADE NOT NULL,
  bet_type text NOT NULL,
  option_name text NOT NULL,
  odds decimal(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cricket_bets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  match_id uuid REFERENCES cricket_matches(id) ON DELETE CASCADE NOT NULL,
  bet_type text NOT NULL,
  bet_option text NOT NULL,
  bet_amount decimal(10,2) NOT NULL,
  odds decimal(10,2) NOT NULL,
  potential_payout decimal(10,2) NOT NULL,
  actual_payout decimal(10,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cancelled', 'refunded')),
  created_at timestamptz DEFAULT now(),
  settled_at timestamptz
);

-- =====================================================
-- 5. TRANSACTIONS & PAYMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win', 'bonus', 'referral_bonus', 'agent_credit')),
  amount decimal(15,2) NOT NULL,
  balance_type text DEFAULT 'main' CHECK (balance_type IN ('main', 'bonus')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_id text,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS deposit_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('bkash', 'nagad', 'rocket', 'bank', 'other')),
  transaction_id text,
  payment_proof_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  processed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('bkash', 'nagad', 'rocket', 'bank', 'other')),
  account_details jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
  admin_note text,
  processed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS payment_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  method text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  config jsonb,
  min_deposit decimal(10,2) DEFAULT 100.00,
  max_deposit decimal(10,2) DEFAULT 100000.00,
  min_withdrawal decimal(10,2) DEFAULT 500.00,
  max_withdrawal decimal(10,2) DEFAULT 50000.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. PROMO CODES
-- =====================================================

CREATE TABLE IF NOT EXISTS promo_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_creation_enabled boolean DEFAULT false,
  max_codes_per_user integer DEFAULT 3,
  default_discount_percentage decimal(5,2) DEFAULT 5.00,
  default_referrer_percentage decimal(5,2) DEFAULT 2.00,
  default_validity_days integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text DEFAULT 'user' CHECK (type IN ('user', 'admin')),
  discount_percentage decimal(5,2) NOT NULL,
  referrer_percentage decimal(5,2) DEFAULT 0,
  min_deposit decimal(10,2) DEFAULT 0,
  max_usage integer DEFAULT 100,
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id uuid REFERENCES promo_codes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  discount_amount decimal(10,2) NOT NULL,
  referrer_earnings decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(promo_code_id, user_id)
);

-- =====================================================
-- 7. AGENT SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  enabled boolean DEFAULT true,
  max_daily_credit decimal(15,2) DEFAULT 50000.00,
  commission_percentage decimal(5,2) DEFAULT 1.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  agent_code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  daily_limit decimal(15,2) DEFAULT 10000.00,
  total_credited decimal(15,2) DEFAULT 0,
  commission_earned decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  type text CHECK (type IN ('credit', 'debit', 'commission')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 8. ADMIN & SECURITY
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fraud_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  changes jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_cricket_bets_user_id ON cricket_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_cricket_bets_match_id ON cricket_bets(match_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_user_id ON fraud_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- User Profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Games (Public read)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active games"
  ON games FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Game Sessions
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game sessions"
  ON game_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own game sessions"
  ON game_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Bets
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bets"
  ON bets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bets"
  ON bets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Cricket Matches (Public read)
ALTER TABLE cricket_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cricket matches"
  ON cricket_matches FOR SELECT
  TO authenticated
  USING (true);

-- Cricket Odds (Public read)
ALTER TABLE cricket_odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cricket odds"
  ON cricket_odds FOR SELECT
  TO authenticated
  USING (true);

-- Cricket Bets
ALTER TABLE cricket_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cricket bets"
  ON cricket_bets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cricket bets"
  ON cricket_bets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Deposit Requests
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deposit requests"
  ON deposit_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deposit requests"
  ON deposit_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Withdrawal Requests
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawal requests"
  ON withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Payment Settings (Public read)
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment methods"
  ON payment_settings FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Promo Codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active promo codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create own promo codes"
  ON promo_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Promo Usage
ALTER TABLE promo_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promo usage"
  ON promo_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Activity Logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Settings tables (restricted)
ALTER TABLE referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default settings
INSERT INTO referral_settings (id) VALUES (uuid_generate_v4()) ON CONFLICT DO NOTHING;
INSERT INTO promo_settings (id) VALUES (uuid_generate_v4()) ON CONFLICT DO NOTHING;
INSERT INTO agent_settings (id) VALUES (uuid_generate_v4()) ON CONFLICT DO NOTHING;

-- Insert payment methods
INSERT INTO payment_settings (method, is_active, min_deposit, max_deposit) VALUES
  ('bkash', true, 100.00, 100000.00),
  ('nagad', true, 100.00, 100000.00),
  ('rocket', true, 100.00, 100000.00)
ON CONFLICT (method) DO NOTHING;

-- Insert casino games
INSERT INTO games (name, slug, type, description, min_bet, max_bet, rtp_percentage, is_active) VALUES
  ('Aviator', 'aviator', 'aviator', 'Watch the multiplier fly and cash out before it crashes!', 10.00, 10000.00, 97.00, true),
  ('Crash', 'crash', 'crash', 'Ride the rocket and cash out before the crash!', 10.00, 5000.00, 96.00, true),
  ('Super Ace', 'super-ace', 'super_ace', 'Classic card game with big multipliers!', 20.00, 10000.00, 95.00, true),
  ('Plinko', 'plinko', 'plinko', 'Drop the ball and watch it bounce to big wins!', 10.00, 5000.00, 98.00, true),
  ('Roulette', 'roulette', 'roulette', 'Classic casino roulette with European rules!', 10.00, 10000.00, 97.30, true),
  ('Blackjack', 'blackjack', 'blackjack', 'Beat the dealer and win big!', 20.00, 5000.00, 99.50, true),
  ('Slots', 'slots', 'slots', 'Spin the reels for massive jackpots!', 5.00, 1000.00, 94.00, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert admin settings
INSERT INTO admin_settings (key, value, description) VALUES
  ('platform_name', '"Markozon Betting"', 'Platform display name'),
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
  ('min_withdrawal_amount', '500', 'Minimum withdrawal amount'),
  ('max_withdrawal_amount', '50000', 'Maximum withdrawal amount'),
  ('withdrawal_fee_percentage', '0', 'Withdrawal fee percentage'),
  ('default_currency', '"BDT"', 'Default platform currency'),
  ('house_profit_percentage', '40', 'Platform profit percentage'),
  ('player_payout_percentage', '60', 'Player payout percentage')
ON CONFLICT (key) DO NOTHING;