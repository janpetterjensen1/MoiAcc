/**
 * Google Calendar API helpers
 * Alle funksjoner bruker lagrede tokens fra google_calendar_tokens-tabellen.
 */

import { createClient } from "@/lib/supabase/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE    = "https://www.googleapis.com/calendar/v3";

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// ── Token-håndtering ──────────────────────────────────────────────────────────

async function hentOgFornyToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tokens } = await (supabase as any)
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .single();

  if (!tokens) return null;

  // Forny token hvis det utløper om < 5 min
  if (new Date(tokens.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    const json = await res.json();
    if (!json.access_token) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("google_calendar_tokens")
      .update({
        access_token: json.access_token,
        expires_at:   new Date(Date.now() + json.expires_in * 1000).toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return json.access_token;
  }

  return tokens.access_token;
}

// ── Import: Google Calendar → MoiAcc ─────────────────────────────────────────

export interface GoogleKalenderHendelse {
  id: string;
  summary: string;
  start: string;     // ISO date or dateTime
  end: string;
  description: string | null;
  location: string | null;
  htmlLink: string;
}

export async function hentKommendHendelser(dager = 30): Promise<GoogleKalenderHendelse[]> {
  const token = await hentOgFornyToken();
  if (!token) return [];

  const fra  = new Date().toISOString();
  const til  = new Date(Date.now() + dager * 86_400_000).toISOString();

  const res = await fetch(
    `${CALENDAR_BASE}/calendars/primary/events?` +
    new URLSearchParams({
      timeMin:      fra,
      timeMax:      til,
      singleEvents: "true",
      orderBy:      "startTime",
      maxResults:   "50",
    }),
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return [];
  const json = await res.json();

  return (json.items ?? []).map((e: any) => ({
    id:          e.id,
    summary:     e.summary ?? "(Uten tittel)",
    start:       e.start?.dateTime ?? e.start?.date ?? "",
    end:         e.end?.dateTime   ?? e.end?.date   ?? "",
    description: e.description ?? null,
    location:    e.location    ?? null,
    htmlLink:    e.htmlLink    ?? "",
  }));
}

// ── Eksport: MoiAcc → Google Calendar ────────────────────────────────────────

export interface NyKalenderHendelse {
  tittel:       string;
  beskrivelse?: string;
  dato:         string;   // YYYY-MM-DD
  heleDagen?:   boolean;
  tidFra?:      string;   // HH:MM
  tidTil?:      string;   // HH:MM
  farge?:       number;   // 1-11 (Google colorId)
}

export async function opprettKalenderHendelse(hendelse: NyKalenderHendelse): Promise<string | null> {
  const token = await hentOgFornyToken();
  if (!token) return null;

  const event: Record<string, unknown> = {
    summary:     hendelse.tittel,
    description: hendelse.beskrivelse,
  };

  if (hendelse.heleDagen || (!hendelse.tidFra && !hendelse.tidTil)) {
    event.start = { date: hendelse.dato };
    event.end   = { date: hendelse.dato };
  } else {
    event.start = { dateTime: `${hendelse.dato}T${hendelse.tidFra ?? "09:00"}:00`, timeZone: "Europe/Oslo" };
    event.end   = { dateTime: `${hendelse.dato}T${hendelse.tidTil  ?? "10:00"}:00`, timeZone: "Europe/Oslo" };
  }

  if (hendelse.farge) event.colorId = String(hendelse.farge);

  const res = await fetch(
    `${CALENDAR_BASE}/calendars/primary/events`,
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(event),
    }
  );

  if (!res.ok) return null;
  const json = await res.json();
  return json.id ?? null;
}

export async function slettKalenderHendelse(eventId: string): Promise<boolean> {
  const token = await hentOgFornyToken();
  if (!token) return false;
  const res = await fetch(
    `${CALENDAR_BASE}/calendars/primary/events/${eventId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  return res.status === 204;
}

// ── Sjekk om bruker er koblet til ────────────────────────────────────────────

export async function erGoogleKoblet(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("google_calendar_tokens")
    .select("user_id")
    .eq("user_id", user.id)
    .single();
  return !!data;
}
