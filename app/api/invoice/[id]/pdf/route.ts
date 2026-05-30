import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
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

  // Hent faktura inkl. pdf_file_id og storage_path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: fakturaRaw, error: faktFeil }, { data: linjer }, { data: profil }] = await Promise.all([
    (supabase as any)
      .from("invoices")
      .select("*, customers(*), files(storage_path, original_filename)")
      .eq("id", id)
      .single(),
    hentFakturaLinjer(id),
    (supabase as any).from("profiles").select("visningsnavn,telefon,address,org_number,bank_account,iban,invoice_email").eq("id", user.id).single(),
  ]);

  if (faktFeil || !fakturaRaw) return new NextResponse("Ikke funnet", { status: 404 });

  const nummerVisning = fakturaRaw.invoice_number ?? fakturaRaw.invoice_date?.slice(0, 4) ?? "faktura";
  const filnavn = download
    ? `Faktura ${nummerVisning}.pdf`
    : `faktura-${nummerVisning}.pdf`;

  const disposition = download
    ? `attachment; filename="${filnavn}"`
    : `inline; filename="${filnavn}"`;

  // Hvis det finnes en lagret original PDF — server den direkte
  const storagePath = fakturaRaw.files?.storage_path as string | undefined;
  if (storagePath) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: fileData, error: dlErr } = await serviceClient.storage
      .from("invoices-pdf")
      .download(storagePath);

    if (!dlErr && fileData) {
      const arrayBuf = await fileData.arrayBuffer();
      return new NextResponse(arrayBuf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": disposition,
        },
      });
    }
    // Fall through til generering hvis nedlasting feilet
  }

  // Generer ny PDF fra session_log-data (for fakturautkast og nye fakturaer)
  const { data: faktura, error: f2 } = await hentFakturaForPdf(id);
  if (f2 || !faktura) return new NextResponse("Ikke funnet", { status: 404 });
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

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
