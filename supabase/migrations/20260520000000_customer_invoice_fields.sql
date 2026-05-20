-- Legg til fakturarelaterte felt på customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS rekvirent          text,
  ADD COLUMN IF NOT EXISTS bestillings_nummer text,
  ADD COLUMN IF NOT EXISTS lokasjon           text,
  ADD COLUMN IF NOT EXISTS avtale_dato        date;
