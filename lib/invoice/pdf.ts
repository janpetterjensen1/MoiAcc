import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { InvoicePdf, type PdfInvoiceData } from "@/components/pdf/InvoicePdf";
import type { FakturaForPdf, FakturaLinje } from "@/lib/db/invoices";

type SellerOverride = {
  name: string;
  phone: string;
  address: string;
  org_number: string;
  bank_account: string;
  iban: string;
  email: string;
};

export function byggPdfData(
  faktura: FakturaForPdf,
  linjer: FakturaLinje[],
  sellerOverride?: SellerOverride,
): PdfInvoiceData {
  const kunde = faktura.customers!;
  return {
    invoice_number: faktura.invoice_number ?? "—",
    invoice_date: faktura.invoice_date,
    due_date: faktura.due_date,
    period_from: faktura.period_from,
    period_to: faktura.period_to,
    subtotal: faktura.subtotal,
    vat_amount: faktura.vat_amount,
    total: faktura.total,
    vat_exempt_note: faktura.vat_exempt_note,
    customer: {
      legal_name: kunde.legal_name,
      org_number: kunde.org_number,
      invoice_address: kunde.invoice_address as { street: string; postal_code: string; city: string },
      invoice_email: kunde.invoice_email,
      rekvirent: kunde.rekvirent ?? null,
      bestillings_nummer: kunde.bestillings_nummer ?? null,
      lokasjon: kunde.lokasjon ?? null,
      avtale_dato: kunde.avtale_dato ?? null,
    },
    seller: {
      name:         sellerOverride?.name         ?? process.env.SELLER_NAME         ?? "",
      tagline:      process.env.SELLER_TAGLINE   ?? "",
      phone:        sellerOverride?.phone        ?? process.env.SELLER_PHONE        ?? "",
      address:      sellerOverride?.address      ?? process.env.SELLER_ADDRESS      ?? "",
      org_number:   sellerOverride?.org_number   ?? process.env.SELLER_ORG_NUMBER   ?? "",
      bank_account: sellerOverride?.bank_account ?? process.env.SELLER_BANK_ACCOUNT ?? "",
      iban:         sellerOverride?.iban         ?? process.env.SELLER_IBAN         ?? "",
      email:        sellerOverride?.email        ?? process.env.GMAIL_USER          ?? "",
    },
    lines: linjer.map((l) => ({
      session_date: l.session_date,
      actual_duration_h: l.actual_duration_h,
      hourly_rate_at_time: l.hourly_rate_at_time,
      line_amount: l.line_amount,
      note: l.note,
    })),
  };
}

export async function genererPdfBuffer(
  faktura: FakturaForPdf,
  linjer: FakturaLinje[],
  sellerOverride?: SellerOverride,
): Promise<Buffer> {
  const data = byggPdfData(faktura, linjer, sellerOverride);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(InvoicePdf, { data }) as any;
  const uint8 = await renderToBuffer(element);
  return Buffer.from(uint8);
}
