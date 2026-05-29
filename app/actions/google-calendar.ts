"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { opprettKalenderHendelse, slettKalenderHendelse } from "@/lib/google/calendar";

// ── Push forskuddsskatt-terminer til Google Calendar ─────────────────────────

export async function pushForskuddsskattTilKalender(): Promise<{ ok: number; feil: number }> {
  const aar = new Date().getFullYear();
  const terminer = [
    { nr: 1, dato: `${aar}-03-15` },
    { nr: 2, dato: `${aar}-06-15` },
    { nr: 3, dato: `${aar}-09-15` },
    { nr: 4, dato: `${aar}-12-15` },
  ];

  let ok = 0, feil = 0;
  for (const t of terminer) {
    if (t.dato < new Date().toISOString().slice(0, 10)) continue; // hopp over passerte
    const id = await opprettKalenderHendelse({
      tittel:       `Forskuddsskatt termin ${t.nr} — ${aar}`,
      beskrivelse:  `Termin ${t.nr} av 4 for forskuddsskatt ${aar}. Betales til Skatteetaten.\n\nSe MoiAcc → Skatt for beregnet beløp.`,
      dato:         t.dato,
      heleDagen:    true,
      farge:        11, // tomato
    });
    id ? ok++ : feil++;
  }
  return { ok, feil };
}

// ── Push forfallsdato for faktura til Google Calendar ─────────────────────────

export async function pushFakturaForfall(fakturaId: string): Promise<{ success: boolean; eventId?: string }> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: faktura } = await (supabase as any)
    .from("invoices")
    .select("invoice_number, due_date, total, customers(short_name, legal_name)")
    .eq("id", fakturaId)
    .single();

  if (!faktura) return { success: false };

  const kundeNavn = faktura.customers?.short_name ?? faktura.customers?.legal_name ?? "Ukjent";
  const belopStr  = Number(faktura.total).toLocaleString("nb-NO") + " kr";

  const eventId = await opprettKalenderHendelse({
    tittel:      `Forfall faktura #${faktura.invoice_number} — ${kundeNavn}`,
    beskrivelse: `Faktura ${faktura.invoice_number} til ${kundeNavn}\nBeløp: ${belopStr}\n\nSe MoiAcc → Fakturaer for detaljer.`,
    dato:        faktura.due_date,
    heleDagen:   true,
    farge:       5, // banana
  });

  if (!eventId) return { success: false };

  // Lagre event-ID på fakturaen for eventuell sletting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("invoices")
    .update({ google_calendar_event_id: eventId })
    .eq("id", fakturaId);

  revalidatePath(`/fakturaer/${fakturaId}`);
  return { success: true, eventId };
}

// ── Slett Google Calendar-hendelse for faktura ────────────────────────────────

export async function fjernFakturaFraKalender(fakturaId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: faktura } = await (supabase as any)
    .from("invoices")
    .select("google_calendar_event_id")
    .eq("id", fakturaId)
    .single();

  if (!faktura?.google_calendar_event_id) return { success: false };

  const ok = await slettKalenderHendelse(faktura.google_calendar_event_id);
  if (ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("invoices")
      .update({ google_calendar_event_id: null })
      .eq("id", fakturaId);
    revalidatePath(`/fakturaer/${fakturaId}`);
  }
  return { success: ok };
}
