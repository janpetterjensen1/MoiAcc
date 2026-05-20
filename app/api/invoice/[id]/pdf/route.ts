import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hentFakturaForPdf, hentFakturaLinjer } from "@/lib/db/invoices";
import { genererPdfBuffer } from "@/lib/invoice/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const [{ data: faktura, error: faktFeil }, { data: linjer }] = await Promise.all([
    hentFakturaForPdf(id),
    hentFakturaLinjer(id),
  ]);

  if (faktFeil || !faktura) return new NextResponse("Ikke funnet", { status: 404 });
  if (!faktura.customers) return new NextResponse("Kundedata mangler", { status: 500 });

  const pdfBuffer = await genererPdfBuffer(faktura, linjer ?? []);
  const year = faktura.invoice_date.slice(0, 4);
  const nummerVisning = `${year}-${String(faktura.invoice_number).padStart(4, "0")}`;

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="faktura-${nummerVisning}.pdf"`,
    },
  });
}
