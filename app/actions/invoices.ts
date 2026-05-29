"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import {
  opprettFaktura,
  markerSesjonerSomFakturert,
  godkjennFaktura,
  slettFakturaDraft,
  markerFakturaBetalt,
  hentMaanedSesjoner,
  hentSesjonLogForScheduledIds,
  opprettPreBilledLogg,
  opprettKreditnota,
  markerForfalteFakturaer,
} from "@/lib/db/invoices";
import { hentKunde } from "@/lib/db/customers";
import { byggFakturaForslag, innevarendeMaanedPeriode } from "@/lib/invoice/compiler";
import { sendInvoice } from "@/lib/invoice/send";
import { produktNavnFraVarighet } from "@/lib/products";
import type { SesjonRad } from "@/lib/invoice/compiler";

/**
 * Oppretter fakturaforslag for hele inneværende måned.
 *
 * Inkluderer alle planlagte sesjoner unntatt fravær (syk, vikar, ferie, helligdag, kansellert).
 * - Sesjoner som er kvittert (pending_invoice) → linkes direkte til fakturaen.
 * - Sesjoner som ikke er kvittert ennå (planlagt) → oppretter pre-fakturerte session_log-rader
 *   merket med "__prebilled__" slik at de kan slettes hvis fakturautkastet avbrytes.
 * - Sesjoner som allerede er fakturert på en annen faktura → hoppes over.
 */
export async function opprettFakturaForslag(customerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Ikke innlogget" };

  const { data: kunde } = await hentKunde(customerId);
  if (!kunde) return { success: false, error: "Kunde ikke funnet" };

  const iDag = new Date();
  const periodFra = format(startOfMonth(iDag), "yyyy-MM-dd");
  const periodTil = format(endOfMonth(iDag), "yyyy-MM-dd");

  // Sjekk om det allerede finnes en aktiv faktura for denne kunden i inneværende måned
  const { data: eksisterendeFaktura } = await supabase
    .from("invoices")
    .select("id, invoice_number, status")
    .eq("customer_id", customerId)
    .eq("period_from", periodFra)
    .eq("period_to", periodTil)
    .not("status", "in", "(credited)")
    .maybeSingle();
  if (eksisterendeFaktura) {
    return {
      success: false,
      error: `Faktura #${eksisterendeFaktura.invoice_number} for denne måneden finnes allerede (status: ${eksisterendeFaktura.status})`,
    };
  }

  // Hent alle fakturerbare planlagte sesjoner for måneden
  const { data: maanedSesjoner, error: mFeil } = await hentMaanedSesjoner(customerId, periodFra, periodTil);
  if (mFeil || !maanedSesjoner) return { success: false, error: mFeil?.message ?? "Feil ved henting av sesjoner" };
  if (maanedSesjoner.length === 0) return { success: false, error: "Ingen fakturerbare timer denne måneden" };

  // Finn eksisterende session_log-rader for disse sesjonene
  const scheduledIds = maanedSesjoner.map((s) => s.id);
  const { data: eksisterendeLogg } = await hentSesjonLogForScheduledIds(scheduledIds);

  const logByScheduledId = new Map(
    (eksisterendeLogg ?? []).map((l) => [l.scheduled_session_id ?? "", l])
  );

  const hourlyRate = Number(kunde.hourly_rate);

  // Første pass: opprett faktura (trenger ID for pre-billed linjer)
  const forslag = byggFakturaForslag(
    customerId,
    // Midlertidig: beregn subtotal fra alle sesjoner for å lage faktura
    maanedSesjoner.map((s) => {
      const existing = logByScheduledId.get(s.id);
      const timer = existing ? Number(existing.actual_duration_h) : Number(s.planned_duration_h);
      const rate = existing ? Number(existing.hourly_rate_at_time) : hourlyRate;
      return {
        id: "",
        customer_id: customerId,
        session_date: s.scheduled_date,
        actual_duration_h: String(timer),
        hourly_rate_at_time: String(rate),
        line_amount: String(Math.round(timer * rate * 100) / 100),
        note: null,
      } satisfies SesjonRad;
    }),
    kunde.payment_days,
    periodFra,
    periodTil,
  );

  if (!forslag) return { success: false, error: "Kunne ikke bygge fakturaforslag" };

  const { data: faktura, error: fakturaFeil } = await opprettFaktura({
    customer_id: forslag.customer_id,
    invoice_date: forslag.invoice_date,
    due_date: forslag.due_date,
    period_from: forslag.period_from,
    period_to: forslag.period_to,
    subtotal: forslag.subtotal,
    vat_amount: forslag.vat_amount,
    vat_exempt_note: forslag.vat_exempt_note,
    created_by: user.id,
  });

  if (fakturaFeil || !faktura) return { success: false, error: fakturaFeil?.message ?? "Feil ved opprettelse" };

  // Andre pass: knytt/opprett session_log-rader
  const pendingIds: string[] = [];

  for (const sesjon of maanedSesjoner) {
    const existing = logByScheduledId.get(sesjon.id);

    if (existing) {
      if (existing.status === "pending_invoice") {
        // Allerede kvittert — marker som fakturert
        pendingIds.push(existing.id);
      }
      // status === "invoiced" → allerede på en annen faktura, hopp over
    } else {
      // Ikke kvittert ennå → opprett pre-fakturert rad
      const timer = Number(sesjon.planned_duration_h);
      await opprettPreBilledLogg({
        customer_id: customerId,
        scheduled_session_id: sesjon.id,
        session_date: sesjon.scheduled_date,
        actual_duration_h: timer,
        hourly_rate_at_time: hourlyRate,
        status: "invoiced",
        invoice_id: faktura.id,
        note: `__prebilled__|${produktNavnFraVarighet(timer)}`,
        logged_by: user.id,
      });
    }
  }

  // Marker eksisterende pending_invoice-sesjoner som fakturert
  await markerSesjonerSomFakturert(pendingIds, faktura.id);

  revalidatePath("/fakturaer");
  return { success: true, fakturaId: faktura.id };
}

export async function godkjennOgSendFaktura(fakturaId: string) {
  const { data: faktura, error } = await godkjennFaktura(fakturaId);
  if (error || !faktura) return { success: false, error: error?.message ?? "Feil ved godkjenning" };

  const sendResultat = await sendInvoice(fakturaId);
  if (!sendResultat.success) return { success: false, error: sendResultat.error ?? "Feil ved sending" };

  revalidatePath(`/fakturaer/${fakturaId}`);
  revalidatePath("/fakturaer");
  return { success: true };
}

export async function avbrytFakturaAction(fakturaId: string) {
  const { error } = await slettFakturaDraft(fakturaId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/fakturaer");
  redirect("/fakturaer");
}

export async function markerBetaltAction(formData: FormData) {
  const fakturaId = formData.get("faktura_id") as string;
  const paidAt = formData.get("paid_at") as string;
  if (!fakturaId || !paidAt) return;

  await markerFakturaBetalt(fakturaId, paidAt);
  revalidatePath(`/fakturaer/${fakturaId}`);
  revalidatePath("/fakturaer");
}

export async function kreditnotatAction(fakturaId: string): Promise<{ success: boolean; error?: string; nyId?: string }> {
  const { data, error } = await opprettKreditnota(fakturaId);
  if (error || !data) return { success: false, error: "Kunne ikke opprette kreditnota" };
  revalidatePath(`/fakturaer/${fakturaId}`);
  revalidatePath("/fakturaer");
  return { success: true, nyId: data.id };
}

export async function oppdaterForfalteFakturaerAction() {
  await markerForfalteFakturaer();
  revalidatePath("/fakturaer");
}

export async function markerSendtAction(fakturaId: string, sentAt: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: sentAt, approved_at: sentAt })
    .eq("id", fakturaId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/fakturaer/${fakturaId}`);
  revalidatePath("/fakturaer");
  return { success: true };
}

export async function markerBetaltDatoAction(fakturaId: string, paidAt: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", fakturaId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/fakturaer/${fakturaId}`);
  revalidatePath("/fakturaer");
  return { success: true };
}

export async function sendTilGodkjenningAction(fakturaId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "awaiting_approval" })
    .eq("id", fakturaId)
    .eq("status", "draft");
  if (error) return { success: false, error: error.message };
  revalidatePath(`/fakturaer/${fakturaId}`);
  revalidatePath("/fakturaer");
  return { success: true };
}

export async function sendPurringAction(fakturaId: string): Promise<{ success: boolean; error?: string }> {
  const { sendPurring } = await import("@/lib/invoice/send");
  const res = await sendPurring(fakturaId);
  if (res.success) revalidatePath(`/fakturaer/${fakturaId}`);
  return res;
}

export async function genererAlleUtkastAction(): Promise<{
  opprettet: string[];
  hoppetOver: string[];
  feil: { kunde: string; feil: string }[];
}> {
  const { hentAlleKunder } = await import("@/lib/db/customers");
  const { data: kunder } = await hentAlleKunder();
  const aktive = (kunder ?? []).filter(
    (k) => !k.active_to || new Date(k.active_to) >= new Date()
  );

  const opprettet: string[] = [];
  const hoppetOver: string[] = [];
  const feil: { kunde: string; feil: string }[] = [];

  for (const kunde of aktive) {
    const res = await opprettFakturaForslag(kunde.id);
    if (res.success) {
      opprettet.push(kunde.short_name);
    } else if (res.error?.includes("Ingen fakturerbare")) {
      hoppetOver.push(kunde.short_name);
    } else {
      feil.push({ kunde: kunde.short_name, feil: res.error ?? "Ukjent feil" });
    }
  }

  revalidatePath("/fakturaer");
  return { opprettet, hoppetOver, feil };
}

export async function registrerManuellFakturaAction(formData: FormData): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Ikke innlogget" };

  const invoiceNumber = (formData.get("invoice_number") as string | null)?.trim();
  const customerId    = (formData.get("customer_id") as string | null)?.trim() || null;
  const kundeNavn     = (formData.get("external_customer_name") as string | null)?.trim() || null;
  const invoiceDate   = formData.get("invoice_date") as string;
  const dueDate       = (formData.get("due_date") as string | null)?.trim() || invoiceDate;
  const periodFrom    = (formData.get("period_from") as string | null)?.trim() || invoiceDate;
  const periodTo      = (formData.get("period_to") as string | null)?.trim() || invoiceDate;
  const subtotal      = parseFloat((formData.get("subtotal") as string || "0").replace(",", "."));
  const status        = (formData.get("status") as string) || "sent";
  const paidAt        = (formData.get("paid_at") as string | null)?.trim() || null;

  if (!invoiceDate) return { success: false, error: "Fakturadato er påkrevd" };
  if (!customerId && !kundeNavn) return { success: false, error: "Kunde eller kundenavn er påkrevd" };
  if (isNaN(subtotal)) return { success: false, error: "Ugyldig beløp" };

  let finalNumber = invoiceNumber || null;
  if (invoiceNumber) {
    // Synk årsteller hvis oppgitt nummer er høyere enn gjeldende
    const match = invoiceNumber.match(/^(\d{4})-(\d+)$/);
    if (match) {
      const year = parseInt(match[1]);
      const seq  = parseInt(match[2]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc("sync_invoice_year_seq", { p_year: year, p_min_seq: seq });
    }
  } else {
    // Auto-generer neste nummer
    const year = new Date(invoiceDate).getFullYear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: nr } = await (supabase as any).rpc("next_invoice_number", { p_year: year });
    finalNumber = nr;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("invoices")
    .insert({
      invoice_number:         finalNumber,
      customer_id:            customerId || null,
      external_customer_name: kundeNavn || null,
      kilde:                  "manuell",
      invoice_date:           invoiceDate,
      due_date:               dueDate,
      period_from:            periodFrom,
      period_to:              periodTo,
      subtotal,
      vat_amount:             0,
      vat_exempt_note:        "Unntatt MVA, jf. mval. § 3-8",
      status:                 status === "paid" ? "paid" : "sent",
      approved_at:            new Date().toISOString(),
      sent_at:                new Date().toISOString(),
      paid_at:                status === "paid" ? (paidAt || invoiceDate) : null,
      created_by:             user.id,
    })
    .select()
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Feil ved registrering" };

  revalidatePath("/fakturaer");
  return { success: true, id: data.id };
}
