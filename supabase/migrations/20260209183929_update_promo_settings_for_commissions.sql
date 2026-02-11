/*
  # Update Promo Settings for User-Created Codes with Commissions

  ## Changes
  1. Add commission percentage fields to promo_settings table
  2. These will be controlled by admin and used as defaults for user-created codes

  ## New Columns
  - `default_creator_commission_percentage` - Commission % for code creator
  - `default_user_commission_percentage` - Commission % for code user
*/

-- Add commission percentage columns to promo_settings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promo_settings' AND column_name = 'default_creator_commission_percentage'
  ) THEN
    ALTER TABLE promo_settings ADD COLUMN default_creator_commission_percentage numeric(5,2) DEFAULT 5.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promo_settings' AND column_name = 'default_user_commission_percentage'
  ) THEN
    ALTER TABLE promo_settings ADD COLUMN default_user_commission_percentage numeric(5,2) DEFAULT 3.00;
  END IF;
END $$;

-- Update existing promo_settings row with default values
UPDATE promo_settings
SET 
  default_creator_commission_percentage = COALESCE(default_creator_commission_percentage, 5.00),
  default_user_commission_percentage = COALESCE(default_user_commission_percentage, 3.00),
  user_creation_enabled = true
WHERE id IS NOT NULL;
