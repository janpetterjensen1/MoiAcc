-- Lagrer Google OAuth-tokens for kalenderintegrasjon per bruker
CREATE TABLE google_calendar_tokens (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  text NOT NULL,
  refresh_token text NOT NULL,
  expires_at    timestamptz NOT NULL,
  scope         text NOT NULL,
  email         text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bruker ser egne tokens"
  ON google_calendar_tokens FOR ALL
  USING (auth.uid() = user_id);
