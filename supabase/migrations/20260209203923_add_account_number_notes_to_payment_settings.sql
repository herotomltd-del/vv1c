/*
  # Add Account Number and Notes to Payment Settings

  1. Changes
    - Add `account_number` field to payment_settings table for storing gateway account details
    - Add `notes` field to payment_settings table for additional gateway information
  
  2. Fields
    - account_number (text, nullable) - The account number or identifier for the payment gateway
    - notes (text, nullable) - Additional notes or instructions about the payment gateway
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_settings' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE payment_settings ADD COLUMN account_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_settings' AND column_name = 'notes'
  ) THEN
    ALTER TABLE payment_settings ADD COLUMN notes text;
  END IF;
END $$;