import { NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf, type PdfInvoiceData } from "@/components/pdf/InvoicePdf";

export async function GET() {
  const data: PdfInvoiceData = {
    invoice_number: 1,
    invoice_date: "2026-05-19",
    due_date: "2026-06-02",
    period_from: "2026-05-01",
    period_to: "2026-05-31",
    subtotal: 11325,
    vat_amount: 0,
    total: 11325,
    vat_exempt_note: "Unntatt MVA, jf. mval. § 3-8",
    customer: {
      legal_name: "Equinor ASA",
      org_number: "923 609 016",
      invoice_address: { street: "Forusbeen 50", postal_code: "4035", city: "Stavanger" },
      invoice_email: "faktura@equinor.com",
      rekvirent: "Tore Morten Otterstad",
      bestillings_nummer: "1.1025",
      lokasjon: "Snarøyveien 30",
      avtale_dato: "2026-01-01",
    },
    seller: {
      name: "Jan Petter Jensen",
      tagline: "Motivation in motion",
      phone: "+47 95998900",
      address: "Gjøvikgata 1B, 0470 Oslo",
      org_number: "932 824 035",
      bank_account: "9820.55.37481",
      iban: "NO86 9820 5537 481",
      email: "janpetterjensen1@gmail.com",
    },
    lines: [
      { session_date: "2026-05-05", actual_duration_h: 1.5, hourly_rate_at_time: 775, line_amount: 1162.5, note: "Gruppetime – matematikk" },
      { session_date: "2026-05-08", actual_duration_h: 1.5, hourly_rate_at_time: 775, line_amount: 1162.5, note: "Gruppetime – matematikk" },
      { session_date: "2026-05-12", actual_duration_h: 2.0, hourly_rate_at_time: 775, line_amount: 1550, note: "Gruppetime – matematikk (dobbeltøkt)" },
      { session_date: "2026-05-15", actual_duration_h: 1.5, hourly_rate_at_time: 775, line_amount: 1162.5, note: "Gruppetime – matematikk" },
      { session_date: "2026-05-19", actual_duration_h: 1.5, hourly_rate_at_time: 775, line_amount: 1162.5, note: "Gruppetime – matematikk" },
      { session_date: "2026-05-22", actual_duration_h: 1.5, hourly_rate_at_time: 775, line_amount: 1162.5, note: "Gruppetime – matematikk" },
      { session_date: "2026-05-26", actual_duration_h: 2.0, hourly_rate_at_time: 775, line_amount: 1550, note: "Gruppetime – matematikk (dobbeltøkt)" },
      { session_date: "2026-05-29", actual_duration_h: 1.5, hourly_rate_at_time: 775, line_amount: 1162.5, note: "Gruppetime – matematikk" },
    ],
  };

  let buffer: Buffer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buffer = await renderToBuffer(createElement(InvoicePdf, { data }) as any);
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    return new NextResponse(msg, { status: 500, headers: { "Content-Type": "text/plain" } });
  }

  return new NextResponse(buffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="faktura-eksempel.pdf"',
    },
  });
}
