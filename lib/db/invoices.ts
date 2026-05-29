import { createClient } from "@/lib/supabase/server";

export interface FakturaForPdf {
  id: string;
  invoice_number: string | null;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  period_from: string;
  period_to: string;
  subtotal: string | number;
  vat_amount: string | number;
  total: string | number;
  vat_exempt_note: string;
  status: string;
  approved_at: string | null;
  customers: {
    id: string;
    legal_name: string;
    org_number: string;
    invoice_address: unknown;
    invoice_email: string;
    rekvirent: string | null;
    bestillings_nummer: string | null;
    lokasjon: string | null;
    avtale_dato: string | null;
  } | null;
}

export interface FakturaRad {
  id: string;
  invoice_number: string | null;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  period_from: string;
  period_to: string;
  subtotal: string;
  vat_amount: string;
  total: string;
  vat_exempt_note: string;
  status: "draft" | "awaiting_approval" | "sent" | "paid" | "overdue" | "credited";
  approved_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  pdf_file_id: string | null;
  credited_by_id: string | null;
  created_at: string;
  created_by: string;
  customers: { id: string; short_name: string; legal_name: string } | null;
}

export interface FakturaLinje {
  id: string;
  session_date: string;
  actual_duration_h: string;
  hourly_rate_at_time: string;
  line_amount: string;
  note: string | null;
  status: string;
}

export interface MaanedSesjon {
  id: string;
  scheduled_date: string;
  planned_duration_h: string;
  status: string;
  customer_id: string;
}

export interface EksisterendeLoggRad {
  id: string;
  scheduled_session_id: string | null;
  session_date: string;
  actual_duration_h: string;
  hourly_rate_at_time: string;
  line_amount: string;
  note: string | null;
  status: string;
}

export async function hentAlleFakturaer() {
  const supabase = await createClient();
  const result = await supabase
    .from("invoices")
    .select("*, customers(id, short_name, legal_name)")
    .order("invoice_date", { ascending: false });
  return result as unknown as { data: FakturaRad[] | null; error: { message: string } | null };
}

export async function hentFaktura(id: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("invoices")
    .select("*, customers(id, short_name, legal_name)")
    .eq("id", id)
    .single();
  return result as unknown as { data: FakturaRad | null; error: { message: string } | null };
}

export async function hentFakturaLinjer(fakturaId: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("session_log")
    .select("id, session_date, actual_duration_h, hourly_rate_at_time, line_amount, note, status")
    .eq("invoice_id", fakturaId)
    .order("session_date");
  return result as unknown as { data: FakturaLinje[] | null; error: { message: string } | null };
}

/** Alle fakturerbare planlagte sesjoner for en kunde i en periode (ekskl. fravær). */
export async function hentMaanedSesjoner(customerId: string, fra: string, til: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("scheduled_sessions")
    .select("id, scheduled_date, planned_duration_h, status, customer_id")
    .eq("customer_id", customerId)
    .gte("scheduled_date", fra)
    .lte("scheduled_date", til)
    .not("status", "in", "(sick,substitute,vacation,cancelled,holiday)")
    .order("scheduled_date");
  return result as unknown as { data: MaanedSesjon[] | null; error: { message: string } | null };
}

/** Eksisterende session_log-rader for gitte scheduled_session_id-er. */
export async function hentSesjonLogForScheduledIds(scheduledIds: string[]) {
  if (scheduledIds.length === 0) return { data: [] as EksisterendeLoggRad[], error: null };
  const supabase = await createClient();
  const result = await supabase
    .from("session_log")
    .select("id, scheduled_session_id, session_date, actual_duration_h, hourly_rate_at_time, line_amount, note, status")
    .in("scheduled_session_id", scheduledIds);
  return result as unknown as { data: EksisterendeLoggRad[] | null; error: { message: string } | null };
}

/** Oppretter en pre-fakturert session_log-rad for en planlagt sesjon. */
export async function opprettPreBilledLogg(data: {
  customer_id: string;
  scheduled_session_id: string;
  session_date: string;
  actual_duration_h: number;
  hourly_rate_at_time: number;
  status: "invoiced";
  invoice_id: string;
  note: string;
  logged_by: string;
}) {
  const supabase = await createClient();
  return supabase.from("session_log").insert(data).select().single();
}

export async function opprettFaktura(data: {
  customer_id: string;
  invoice_date: string;
  due_date: string;
  period_from: string;
  period_to: string;
  subtotal: number;
  vat_amount: number;
  vat_exempt_note: string;
  created_by: string;
}) {
  const supabase = await createClient();
  return supabase.from("invoices").insert(data).select().single();
}

export async function markerSesjonerSomFakturert(sesjonIder: string[], fakturaId: string) {
  if (sesjonIder.length === 0) return;
  const supabase = await createClient();
  return supabase
    .from("session_log")
    .update({ status: "invoiced", invoice_id: fakturaId })
    .in("id", sesjonIder);
}

export async function godkjennFaktura(id: string) {
  const supabase = await createClient();

  // Finn fakturaens år for å generere riktig fakturanummer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rad } = await (supabase as any)
    .from("invoices")
    .select("invoice_date")
    .eq("id", id)
    .single();

  const year = rad ? new Date(rad.invoice_date).getFullYear() : new Date().getFullYear();

  // Tildel fakturanummer atomisk via DB-funksjon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nummer } = await (supabase as any).rpc("next_invoice_number", { p_year: year });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any)
    .from("invoices")
    .update({
      approved_at: new Date().toISOString(),
      invoice_number: nummer,
    })
    .eq("id", id)
    .select()
    .single();
}

export async function slettFakturaDraft(id: string) {
  const supabase = await createClient();
  // Slett pre-fakturerte linjer (opprettet automatisk for planlagte sesjoner)
  await supabase
    .from("session_log")
    .delete()
    .eq("invoice_id", id)
    .like("note", "%__prebilled__%");
  // Frigjør kvitterte linjer tilbake til pending_invoice
  await supabase
    .from("session_log")
    .update({ status: "pending_invoice", invoice_id: null })
    .eq("invoice_id", id)
    .not("note", "like", "%__prebilled__%");
  return supabase.from("invoices").delete().eq("id", id).eq("status", "draft");
}

export async function markerFakturaBetalt(id: string, paidAt: string) {
  const supabase = await createClient();
  return supabase
    .from("invoices")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", id);
}

export async function hentFakturaForPdf(id: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("invoices")
    .select("*, customers(id, legal_name, org_number, invoice_address, invoice_email, rekvirent, bestillings_nummer, lokasjon, avtale_dato)")
    .eq("id", id)
    .single();
  return result as unknown as { data: FakturaForPdf | null; error: { message: string } | null };
}

export async function oppdaterFakturaPdf(id: string, pdfFileId: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("invoices")
    .update({ pdf_file_id: pdfFileId })
    .eq("id", id);
  return result as unknown as { error: { message: string } | null };
}

export async function sendFaktura(id: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
  return result as unknown as { error: { message: string } | null };
}

export async function markerForfalteFakturaer() {
  const supabase = await createClient();
  const iDag = new Date().toISOString().slice(0, 10);
  return supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "sent")
    .lt("due_date", iDag);
}

export async function opprettKreditnota(originalId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: original, error } = await (supabase as any)
    .from("invoices")
    .select("*, customers(id, legal_name, org_number, invoice_address, invoice_email, rekvirent, bestillings_nummer, lokasjon, avtale_dato)")
    .eq("id", originalId)
    .single();
  if (error || !original) return { data: null, error: error ?? new Error("Ikke funnet") };

  const year = new Date().getFullYear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kreditNummer } = await (supabase as any).rpc("next_invoice_number", { p_year: year });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ny, error: nyFeil } = await (supabase as any)
    .from("invoices")
    .insert({
      customer_id: original.customer_id,
      invoice_number: kreditNummer,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date().toISOString().slice(0, 10),
      period_from: original.period_from,
      period_to: original.period_to,
      subtotal: -Number(original.subtotal),
      vat_amount: 0,
      vat_exempt_note: original.vat_exempt_note,
      status: "credited",
      created_by: original.created_by,
    })
    .select()
    .single();
  if (nyFeil || !ny) return { data: null, error: nyFeil };

  await supabase
    .from("invoices")
    .update({ status: "credited", credited_by_id: ny.id })
    .eq("id", originalId);

  return { data: ny, error: null };
}
