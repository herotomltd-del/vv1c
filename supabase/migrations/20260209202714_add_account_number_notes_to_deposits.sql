/*
  # Add Account Number and Notes to Deposit Requests

  1. Changes
    - Add `account_number` column to `deposit_requests` table for users to specify their payment account
    - Add `user_notes` column to `deposit_requests` table for additional payment information
  
  2. Purpose
    These fields enable better manual payment processing by capturing:
    - The account number used for the deposit transaction
    - Any additional notes or details from the user about the payment
  
  3. Security
    - No RLS changes needed as table already has proper policies
    - Fields are optional to maintain backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deposit_requests' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE deposit_requests ADD COLUMN account_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deposit_requests' AND column_name = 'user_notes'
  ) THEN
    ALTER TABLE deposit_requests ADD COLUMN user_notes text;
  END IF;
END $$;