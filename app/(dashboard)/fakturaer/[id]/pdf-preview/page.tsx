import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { hentFaktura } from "@/lib/db/invoices";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PdfPreviewSide({ params }: Props) {
  const { id } = await params;
  const { data: faktura } = await hentFaktura(id);
  if (!faktura) notFound();

  const pdfUrl = `/api/invoice/${id}/pdf`;
  const nedlastingUrl = `/api/invoice/${id}/pdf?download=1`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Sticky header */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: "52px",
          background: "rgba(4,10,4,0.95)",
          borderBottom: "1px solid rgba(201,168,76,0.15)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <Link
          href={`/fakturaer/${id}`}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: "rgba(168,216,168,0.75)" }}
        >
          <ArrowLeft size={16} />
          Tilbake
        </Link>

        <span
          className="text-sm font-semibold"
          style={{ color: "rgba(232,213,160,0.8)" }}
        >
          Faktura #{faktura.invoice_number}
        </span>

        <a
          href={nedlastingUrl}
          download
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: "rgba(201,168,76,0.15)",
            border: "1px solid rgba(201,168,76,0.3)",
            color: "#c9a84c",
          }}
        >
          <Download size={14} />
          Last ned
        </a>
      </div>

      {/* PDF iframe */}
      <iframe
        src={pdfUrl}
        className="flex-1 w-full border-0"
        title={`Faktura ${faktura.invoice_number}`}
      />
    </div>
  );
}
