# MoiAcc — Databaseskjema

Supabase/Postgres. Region: eu-central-1 (Frankfurt).
RLS aktivert på alle tabeller. Alle tabeller i `public` schema.

## Tabeller

### customers
Én rad per kunde. Immutable `id`. Kan oppdateres (endringer logges i audit_log).

```sql
CREATE TABLE customers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_name        text NOT NULL,                    -- ditt kallenavn, f.eks. "Aker S"
  legal_name        text NOT NULL,                    -- juridisk navn på faktura
  org_number        text NOT NULL CHECK (org_number ~ '^\d{9}$'),
  invoice_address   jsonb NOT NULL,                   -- {street, postal_code, city}
  invoice_email     text NOT NULL,
  invoice_day_rule  text NOT NULL,                    -- 'last_friday' | 'day_25' | 'last_weekday'
  payment_days      int NOT NULL DEFAULT 14,
  hourly_rate       numeric(10,2) NOT NULL,
  vat_status        text NOT NULL DEFAULT 'exempt_3_8'
                      CHECK (vat_status IN ('exempt_3_8','exempt_3_14','vat_25')),
  active_from       date NOT NULL,
  active_to         date,                             -- null = aktiv
  contract_file_id  uuid REFERENCES files(id),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

### scheduled_sessions
Årsplan — én rad per planlagt oppdrag. Genereres automatisk fra ukemønster.

```sql
CREATE TABLE scheduled_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          uuid NOT NULL REFERENCES customers(id),
  scheduled_date       date NOT NULL,
  planned_duration_h   numeric(4,2) NOT NULL,
  status               text NOT NULL DEFAULT 'planned'
                         CHECK (status IN ('planned','completed','sick',
                                           'substitute','holiday','vacation','cancelled')),
  blocked_reason       text,                          -- 'Påske', 'Ferie - Alpene' etc.
  is_public_holiday    boolean NOT NULL DEFAULT false,
  UNIQUE (customer_id, scheduled_date)
);
```

### session_log
Timebanken. Immutable etter at faktura er sendt. Primærdokumentasjon (bokfl. §10).

```sql
CREATE TABLE session_log (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_session_id    uuid REFERENCES scheduled_sessions(id),  -- null for ad-hoc
  customer_id             uuid NOT NULL REFERENCES customers(id),
  session_date            date NOT NULL,
  actual_duration_h       numeric(4,2) NOT NULL CHECK (actual_duration_h > 0),
  hourly_rate_at_time     numeric(10,2) NOT NULL,    -- LÅST ved kvittering, aldri endre
  line_amount             numeric(12,2) GENERATED ALWAYS AS
                            (actual_duration_h * hourly_rate_at_time) STORED,
  status                  text NOT NULL DEFAULT 'pending_invoice'
                            CHECK (status IN ('pending_invoice','invoiced',
                                              'sick','substitute','vacation')),
  invoice_id              uuid REFERENCES invoices(id),  -- null inntil fakturert
  note                    text,
  logged_at               timestamptz NOT NULL DEFAULT now(),  -- IMMUTABLE
  logged_by               uuid NOT NULL REFERENCES auth.users(id)
);
```

### invoices
Én rad per faktura. Immutable etter `sent_at` er satt.

```sql
CREATE SEQUENCE invoice_number_seq START 1;

CREATE TABLE invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number    int NOT NULL UNIQUE DEFAULT nextval('invoice_number_seq'),
  customer_id       uuid NOT NULL REFERENCES customers(id),
  invoice_date      date NOT NULL,
  due_date          date NOT NULL,
  period_from       date NOT NULL,
  period_to         date NOT NULL,
  subtotal          numeric(12,2) NOT NULL,
  vat_amount        numeric(12,2) NOT NULL DEFAULT 0.00,
  total             numeric(12,2) GENERATED ALWAYS AS (subtotal + vat_amount) STORED,
  vat_exempt_note   text NOT NULL DEFAULT 'Unntatt MVA, jf. mval. § 3-8',
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','awaiting_approval',
                                        'sent','paid','overdue','credited')),
  approved_at       timestamptz,    -- MÅ være satt før status kan settes til 'sent'
  sent_at           timestamptz,    -- IMMUTABLE etter satt
  paid_at           date,
  pdf_file_id       uuid REFERENCES files(id),
  credited_by_id    uuid REFERENCES invoices(id),  -- peker på kreditnota
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid NOT NULL REFERENCES auth.users(id)
);

-- Trigger: blokkér sending uten godkjenning
CREATE OR REPLACE FUNCTION check_invoice_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND NEW.approved_at IS NULL THEN
    RAISE EXCEPTION 'Faktura kan ikke sendes uten godkjenning (approved_at mangler)';
  END IF;
  IF OLD.sent_at IS NOT NULL AND NEW.sent_at != OLD.sent_at THEN
    RAISE EXCEPTION 'sent_at er immutable etter utsendelse';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_approval_guard
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION check_invoice_approval();
```

### expenses
Kostnadsbilag. Alle beløp i NOK inkl. MVA (ikke MVA-registrert).

```sql
CREATE TABLE expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date    date NOT NULL,
  account_code    text NOT NULL,                -- NS 4102, f.eks. '6000', '7320'
  description     text NOT NULL,
  amount_gross    numeric(12,2) NOT NULL CHECK (amount_gross > 0),
  supplier_name   text,
  receipt_file_id uuid REFERENCES files(id),
  customer_id     uuid REFERENCES customers(id),  -- null = generell kostnad
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### tax_estimates
Løpende skatteestimat — beregnet, ikke bokført. Oppdateres ved ny faktura/kostnad.

```sql
CREATE TABLE tax_estimates (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year                 int NOT NULL,
  ytd_revenue              numeric(12,2) NOT NULL DEFAULT 0,
  ytd_expenses             numeric(12,2) NOT NULL DEFAULT 0,
  estimated_annual_profit  numeric(12,2),          -- skalert til helår
  estimated_tax            numeric(12,2),
  prepaid_tax              numeric(12,2),           -- fra Altinn, manuelt inntastet
  gap                      numeric(12,2),           -- positiv = bør øke
  next_installment_date    date,
  next_installment_amount  numeric(12,2),
  calculated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tax_year)
);
```

### files
All dokumentasjon. Immutable etter upload. 5-årig oppbevaring (bokfl. §13).

```sql
CREATE TABLE files (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_type         text NOT NULL
                      CHECK (file_type IN ('contract','invoice_pdf','receipt','export','other')),
  original_filename text NOT NULL,
  storage_path      text NOT NULL,              -- IMMUTABLE etter INSERT
  mime_type         text NOT NULL,
  file_size_bytes   bigint NOT NULL,
  sha256_hash       text NOT NULL,              -- integritetskontroll
  uploaded_at       timestamptz NOT NULL DEFAULT now(),  -- IMMUTABLE
  retain_until      date NOT NULL,              -- uploaded_at + 5 år
  deleted_at        timestamptz                 -- soft delete — aldri hard slett
);
```

### public_holidays
Norske helligdager. Forhåndsinnlastet for 2025–2030.

```sql
CREATE TABLE public_holidays (
  holiday_date  date PRIMARY KEY,
  name          text NOT NULL
);
```

## RLS-policies (mal for alle tabeller)
```sql
-- Eksempel for invoices (gjenta for alle tabeller)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kun eier ser egne fakturaer"
  ON invoices FOR ALL
  USING (auth.uid() = created_by);
```

## Indekser
```sql
CREATE INDEX idx_session_log_customer ON session_log(customer_id, session_date);
CREATE INDEX idx_session_log_pending ON session_log(customer_id) WHERE status = 'pending_invoice';
CREATE INDEX idx_invoices_customer ON invoices(customer_id, invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status) WHERE status IN ('awaiting_approval','overdue');
CREATE INDEX idx_scheduled_date ON scheduled_sessions(scheduled_date, customer_id);
```
