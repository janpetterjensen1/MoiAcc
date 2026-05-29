-- Invoice number overhaul
-- Numbers are now assigned at approval time (not draft creation),
-- use year-based format (2026-001) and are stored as TEXT.

-- 1. Per-year counter table (source of truth for next invoice number)
CREATE TABLE invoice_year_seq (
  year     INT PRIMARY KEY,
  last_seq INT NOT NULL DEFAULT 0
);

ALTER TABLE invoice_year_seq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autentisert bruker"
  ON invoice_year_seq FOR ALL
  USING (auth.uid() IS NOT NULL);

-- 2. Atomic function — always call this to get the next number
CREATE OR REPLACE FUNCTION next_invoice_number(p_year INT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq INT;
BEGIN
  INSERT INTO invoice_year_seq (year, last_seq)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_seq = invoice_year_seq.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN p_year::TEXT || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

-- 3. Migrate invoice_number column: INT → TEXT NULL
--    Existing numbers get converted to YYYY-NNN format.
ALTER TABLE invoices ALTER COLUMN invoice_number DROP DEFAULT;

ALTER TABLE invoices
  ALTER COLUMN invoice_number TYPE TEXT
  USING CASE
    WHEN invoice_number IS NOT NULL
    THEN EXTRACT(YEAR FROM invoice_date)::TEXT
         || '-'
         || LPAD(invoice_number::TEXT, 3, '0')
    ELSE NULL
  END;

ALTER TABLE invoices ALTER COLUMN invoice_number DROP NOT NULL;

-- 4. Seed year counter from existing numbered invoices
INSERT INTO invoice_year_seq (year, last_seq)
SELECT
  EXTRACT(YEAR FROM invoice_date)::INT,
  COUNT(*)::INT
FROM invoices
WHERE invoice_number IS NOT NULL
GROUP BY EXTRACT(YEAR FROM invoice_date)::INT
ON CONFLICT (year) DO UPDATE
  SET last_seq = EXCLUDED.last_seq;

-- 5. Drop the old global sequence
DROP SEQUENCE IF EXISTS invoice_number_seq;
