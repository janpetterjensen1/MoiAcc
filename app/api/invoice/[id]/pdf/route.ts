import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hentFakturaForPdf, hentFakturaLinjer } from "@/lib/db/invoices";
import { genererPdfBuffer } from "@/lib/invoice/pdf";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const download = searchParams.get("download") === "1";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: faktura, error: faktFeil }, { data: linjer }, { data: profil }] = await Promise.all([
    hentFakturaForPdf(id),
    hentFakturaLinjer(id),
    (supabase as any).from("profiles").select("visningsnavn,telefon,address,org_number,bank_account,iban,invoice_email").eq("id", user.id).single(),
  ]);

  if (faktFeil || !faktura) return new NextResponse("Ikke funnet", { status: 404 });
  if (!faktura.customers) return new NextResponse("Kundedata mangler", { status: 500 });

  const sellerOverride = profil ? {
    name:         profil.visningsnavn  || process.env.SELLER_NAME        || "",
    phone:        profil.telefon       || process.env.SELLER_PHONE       || "",
    address:      profil.address       || process.env.SELLER_ADDRESS     || "",
    org_number:   profil.org_number    || process.env.SELLER_ORG_NUMBER  || "",
    bank_account: profil.bank_account  || process.env.SELLER_BANK_ACCOUNT|| "",
    iban:         profil.iban          || process.env.SELLER_IBAN        || "",
    email:        profil.invoice_email || process.env.GMAIL_USER         || "",
  } : undefined;

  const pdfBuffer = await genererPdfBuffer(faktura, linjer ?? [], sellerOverride);
  const nummerVisning = faktura.invoice_number ?? faktura.invoice_date.slice(0, 4);

  const disposition = download
    ? `attachment; filename="faktura-${nummerVisning}.pdf"`
    : `inline; filename="faktura-${nummerVisning}.pdf"`;

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
