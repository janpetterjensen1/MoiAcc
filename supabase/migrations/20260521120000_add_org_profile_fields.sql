-- Add org/invoice fields to profiles so the seller info on invoices
-- comes from the database instead of environment variables.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS org_number    TEXT,
  ADD COLUMN IF NOT EXISTS bank_account  TEXT,
  ADD COLUMN IF NOT EXISTS iban          TEXT,
  ADD COLUMN IF NOT EXISTS address       TEXT,
  ADD COLUMN IF NOT EXISTS postal_code   TEXT,
  ADD COLUMN IF NOT EXISTS city          TEXT,
  ADD COLUMN IF NOT EXISTS invoice_email TEXT;
