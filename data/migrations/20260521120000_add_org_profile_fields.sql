-- Add Norwegian org profile fields to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS org_number TEXT,
  ADD COLUMN IF NOT EXISTS company_type TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS invoice_email TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'NO';

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_org_number
ON companies (org_number)
WHERE org_number IS NOT NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS billing_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_billing_company_id
ON profiles (billing_company_id)
WHERE billing_company_id IS NOT NULL;
