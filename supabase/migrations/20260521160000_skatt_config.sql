-- Per-year tax configuration stored in DB (replaces localStorage)
CREATE TABLE skatt_config (
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year                  int  NOT NULL,
  annen_inntekt         numeric(12,2) NOT NULL DEFAULT 0,
  forskuddsskatt_utskrevet numeric(12,2) NOT NULL DEFAULT 0,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year)
);

ALTER TABLE skatt_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bruker ser egne skattinnstillinger"
  ON skatt_config FOR ALL
  USING (auth.uid() = user_id);
