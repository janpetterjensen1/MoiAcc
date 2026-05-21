import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { createElement } from "react";
import { render } from "@react-email/components";
import { createHash } from "crypto";
import { InvoiceEmail } from "@/components/email/InvoiceEmail";
import { genererPdfBuffer } from "@/lib/invoice/pdf";
import {
  hentFakturaForPdf,
  hentFakturaLinjer,
  oppdaterFakturaPdf,
  sendFaktura,
} from "@/lib/db/invoices";

function faktNr(invoiceNumber: number) {
  return String(invoiceNumber).padStart(6, "0");
}

function valuta(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  const [int, dec] = n.toFixed(2).split(".");
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `kr ${intFmt},${dec}`;
}

export async function sendInvoice(fakturaId: string): Promise<{ success: boolean; error?: string }> {
  // 1. Hent full fakturainfo
  const [{ data: faktura, error: faktFeil }, { data: linjer, error: linjeFeil }] =
    await Promise.all([hentFakturaForPdf(fakturaId), hentFakturaLinjer(fakturaId)]);

  if (faktFeil || !faktura) return { success: false, error: faktFeil?.message ?? "Faktura ikke funnet" };
  if (linjeFeil) return { success: false, error: linjeFeil.message };
  if (!faktura.approved_at) return { success: false, error: "Faktura er ikke godkjent" };

  const kunde = faktura.customers;
  if (!kunde) return { success: false, error: "Kundedata mangler" };

  // 2. Generer PDF
  const pdfBuffer = await genererPdfBuffer(faktura, linjer ?? []);
  const sha256 = createHash("sha256").update(pdfBuffer).digest("hex");
  const nummerVisning = faktNr(faktura.invoice_number);
  const filnavn = `faktura-${nummerVisning}.pdf`;
  const storagePath = `${faktura.customer_id}/${faktura.invoice_date.slice(0, 7)}/${filnavn}`;

  // 3. Last opp til Supabase Storage (service role trengs for å bypasse RLS på storage)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: uploadFeil } = await serviceClient.storage
    .from("invoices-pdf")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadFeil) return { success: false, error: `Storage-feil: ${uploadFeil.message}` };

  // 4. Registrer fil i files-tabellen
  const retainUntil = new Date();
  retainUntil.setFullYear(retainUntil.getFullYear() + 5);

  const supabase = await createClient();
  const { data: fil, error: filFeil } = await supabase
    .from("files")
    .insert({
      file_type: "invoice_pdf",
      original_filename: filnavn,
      storage_path: storagePath,
      mime_type: "application/pdf",
      file_size_bytes: pdfBuffer.length,
      sha256_hash: sha256,
      retain_until: retainUntil.toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (filFeil || !fil) return { success: false, error: filFeil?.message ?? "Fil-registrering feilet" };

  // 5. Knytt PDF-fil til faktura
  const { error: pdfFeil } = await oppdaterFakturaPdf(fakturaId, fil.id);
  if (pdfFeil) return { success: false, error: pdfFeil.message };

  // 6. Send e-post via Gmail
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) return { success: false, error: "GMAIL_USER eller GMAIL_APP_PASSWORD er ikke satt" };

  const selgerNavn = process.env.SELLER_NAME ?? "Jan Petter Jensen";
  const selgerOrgNr = process.env.SELLER_ORG_NUMBER ?? "";

  const emailHtml = await render(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(InvoiceEmail, {
      selgerNavn,
      selgerOrgNr,
      kundeNavn: kunde.legal_name,
      fakturaNummerVisning: nummerVisning,
      fakturadato: faktura.invoice_date,
      forfallsdato: faktura.due_date,
      periodeFrom: faktura.period_from,
      periodeTo: faktura.period_to,
      total: valuta(faktura.total),
      vatNote: faktura.vat_exempt_note,
    }) as React.ReactElement
  );

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  try {
    await transporter.sendMail({
      from: `"${selgerNavn}" <${gmailUser}>`,
      to: kunde.invoice_email,
      subject: `Faktura ${nummerVisning} fra ${selgerNavn}`,
      html: emailHtml,
      attachments: [{ filename: filnavn, content: pdfBuffer, contentType: "application/pdf" }],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `E-postfeil: ${msg}` };
  }

  // 7. Marker faktura som sendt
  const { error: sendFeil } = await sendFaktura(fakturaId);
  if (sendFeil) return { success: false, error: sendFeil.message };

  return { success: true };
}

export async function sendPurring(fakturaId: string): Promise<{ success: boolean; error?: string }> {
  const { data: faktura, error } = await hentFakturaForPdf(fakturaId);
  if (error || !faktura) return { success: false, error: "Faktura ikke funnet" };
  if (faktura.status !== "overdue") return { success: false, error: "Faktura er ikke forfalt" };

  const kunde = faktura.customers;
  if (!kunde) return { success: false, error: "Kundedata mangler" };

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) return { success: false, error: "E-postkonfig mangler" };

  const selgerNavn = process.env.SELLER_NAME ?? "Jan Petter Jensen";
  const selgerOrgNr = process.env.SELLER_ORG_NUMBER ?? "";
  const selgerBankKonto = process.env.SELLER_BANK_ACCOUNT ?? "";
  const nummerVisning = faktNr(faktura.invoice_number);

  const dagerSiden = Math.floor(
    (Date.now() - new Date(faktura.due_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  const { ReminderEmail } = await import("@/components/email/ReminderEmail");
  const emailHtml = await render(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(ReminderEmail, {
      selgerNavn, selgerOrgNr, selgerBankKonto,
      kundeNavn: kunde.legal_name,
      fakturaNummerVisning: nummerVisning,
      fakturadato: faktura.invoice_date,
      forfallsdato: faktura.due_date,
      total: valuta(faktura.total),
      dagerSiden,
    }) as React.ReactElement
  );

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  try {
    await transporter.sendMail({
      from: `"${selgerNavn}" <${gmailUser}>`,
      to: kunde.invoice_email,
      subject: `Purring: Faktura ${nummerVisning} fra ${selgerNavn} — forfalt`,
      html: emailHtml,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `E-postfeil: ${msg}` };
  }

  return { success: true };
}
