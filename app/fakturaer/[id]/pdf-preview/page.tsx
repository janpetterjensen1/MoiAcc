"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

export default function PdfPreviewSide() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const pdfUrl = `/api/invoice/${id}/pdf`;
  const nedlastingUrl = `/api/invoice/${id}/pdf?download=1`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#0a0f0a",
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          paddingTop: "env(safe-area-inset-top)",
          minHeight: "52px",
          flexShrink: 0,
          background: "rgba(4,10,4,0.97)",
          borderBottom: "1px solid rgba(201,168,76,0.18)",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(168,216,168,0.85)",
            fontSize: 15,
            fontWeight: 500,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px 0",
          }}
        >
          <ArrowLeft size={18} />
          Tilbake
        </button>

        <a
          href={nedlastingUrl}
          download
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#c9a84c",
            fontSize: 14,
            fontWeight: 600,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(201,168,76,0.14)",
            border: "1px solid rgba(201,168,76,0.32)",
            textDecoration: "none",
          }}
        >
          <Download size={15} />
          Lagre PDF
        </a>
      </div>

      {/* PDF embed — works in iOS WKWebView / Safari */}
      <embed
        src={pdfUrl}
        type="application/pdf"
        style={{ flex: 1, width: "100%", border: "none" }}
      />

      {/* Fallback for devices where embed doesn't render the PDF */}
      <div
        style={{
          textAlign: "center",
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          background: "rgba(4,10,4,0.95)",
          borderTop: "1px solid rgba(201,168,76,0.10)",
        }}
      >
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "rgba(168,216,168,0.5)",
            fontSize: 12,
            textDecoration: "underline",
          }}
        >
          Åpne PDF i nettleseren
        </a>
      </div>
    </div>
  );
}
