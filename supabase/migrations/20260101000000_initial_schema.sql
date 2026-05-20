-- MoiAcc initial schema
-- Kjør i Supabase SQL Editor

-- files (referert av customers, invoices, expenses)
CREATE TABLE files (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_type         text NOT NULL
                      CHECK (file_type IN ('contract','invoice_pdf','receipt','export','other')),
  original_filename text NOT NULL,
  storage_path      text NOT NULL,
  mime_type         text NOT NULL,
  file_size_bytes   bigint NOT NULL,
  sha256_hash       text NOT NULL,
  uploaded_at       timestamptz NOT NULL DEFAULT now(),
  retain_until      date NOT NULL,
  deleted_at        timestamptz
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kun autentisert bruker ser filer"
  ON files FOR ALL
  USING (auth.uid() IS NOT NULL);

-- customers
CREATE TABLE customers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_name        text NOT NULL,
  legal_name        text NOT NULL,
  org_number        text NOT NULL CHECK (org_number ~ '^\d{9}$'),
  invoice_address   jsonb NOT NULL,
  invoice_email     text NOT NULL,
  invoice_day_rule  text NOT NULL,
  payment_days      int NOT NULL DEFAULT 14,
  hourly_rate       numeric(10,2) NOT NULL,
  vat_status        text NOT NULL DEFAULT 'exempt_3_8'
                      CHECK (vat_status IN ('exempt_3_8','exempt_3_14','vat_25')),
  active_from       date NOT NULL,
  active_to         date,
  contract_file_id  uuid REFERENCES files(id),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kun autentisert bruker ser kunder"
  ON customers FOR ALL
  USING (auth.uid() IS NOT NULL);

-- public_holidays
CREATE TABLE public_holidays (
  holiday_date  date PRIMARY KEY,
  name          text NOT NULL
);

ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle autentiserte kan lese helligdager"
  ON public_holidays FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- scheduled_sessions
CREATE TABLE scheduled_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          uuid NOT NULL REFERENCES customers(id),
  scheduled_date       date NOT NULL,
  planned_duration_h   numeric(4,2) NOT NULL,
  status               text NOT NULL DEFAULT 'planned'
                         CHECK (status IN ('planned','completed','sick',
                                           'substitute','holiday','vacation','cancelled')),
  blocked_reason       text,
  is_public_holiday    boolean NOT NULL DEFAULT false,
  UNIQUE (customer_id, scheduled_date)
);

ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kun autentisert bruker ser planlagte sesjoner"
  ON scheduled_sessions FOR ALL
  USING (auth.uid() IS NOT NULL);

-- invoices (trenger fakturanummer-sekvens)
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
  approved_at       timestamptz,
  sent_at           timestamptz,
  paid_at           date,
  pdf_file_id       uuid REFERENCES files(id),
  credited_by_id    uuid REFERENCES invoices(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kun eier ser egne fakturaer"
  ON invoices FOR ALL
  USING (auth.uid() = created_by);

-- Trigger: blokkér sending uten godkjenning og immutable sent_at
CREATE OR REPLACE FUNCTION check_invoice_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND NEW.approved_at IS NULL THEN
    RAISE EXCEPTION 'Faktura kan ikke sendes uten godkjenning (approved_at mangler)';
  END IF;
  IF OLD.sent_at IS NOT NULL AND NEW.sent_at IS DISTINCT FROM OLD.sent_at THEN
    RAISE EXCEPTION 'sent_at er immutable etter utsendelse';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_approval_guard
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION check_invoice_approval();

-- session_log
CREATE TABLE session_log (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_session_id    uuid REFERENCES scheduled_sessions(id),
  customer_id             uuid NOT NULL REFERENCES customers(id),
  session_date            date NOT NULL,
  actual_duration_h       numeric(4,2) NOT NULL CHECK (actual_duration_h > 0),
  hourly_rate_at_time     numeric(10,2) NOT NULL,
  line_amount             numeric(12,2) GENERATED ALWAYS AS
                            (actual_duration_h * hourly_rate_at_time) STORED,
  status                  text NOT NULL DEFAULT 'pending_invoice'
                            CHECK (status IN ('pending_invoice','invoiced',
                                              'sick','substitute','vacation')),
  invoice_id              uuid REFERENCES invoices(id),
  note                    text,
  logged_at               timestamptz NOT NULL DEFAULT now(),
  logged_by               uuid NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE session_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kun eier ser egne sesjoner"
  ON session_log FOR ALL
  USING (auth.uid() = logged_by);

-- expenses
CREATE TABLE expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date    date NOT NULL,
  account_code    text NOT NULL,
  description     text NOT NULL,
  amount_gross    numeric(12,2) NOT NULL CHECK (amount_gross > 0),
  supplier_name   text,
  receipt_file_id uuid REFERENCES files(id),
  customer_id     uuid REFERENCES customers(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kun autentisert bruker ser utgifter"
  ON expenses FOR ALL
  USING (auth.uid() IS NOT NULL);

-- tax_estimates
CREATE TABLE tax_estimates (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year                 int NOT NULL,
  ytd_revenue              numeric(12,2) NOT NULL DEFAULT 0,
  ytd_expenses             numeric(12,2) NOT NULL DEFAULT 0,
  estimated_annual_profit  numeric(12,2),
  estimated_tax            numeric(12,2),
  prepaid_tax              numeric(12,2),
  gap                      numeric(12,2),
  next_installment_date    date,
  next_installment_amount  numeric(12,2),
  calculated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tax_year)
);

ALTER TABLE tax_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kun autentisert bruker ser skattestimat"
  ON tax_estimates FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Indekser
CREATE INDEX idx_session_log_customer ON session_log(customer_id, session_date);
CREATE INDEX idx_session_log_pending ON session_log(customer_id) WHERE status = 'pending_invoice';
CREATE INDEX idx_invoices_customer ON invoices(customer_id, invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status) WHERE status IN ('awaiting_approval','overdue');
CREATE INDEX idx_scheduled_date ON scheduled_sessions(scheduled_date, customer_id);
