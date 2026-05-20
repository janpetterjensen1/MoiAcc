import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hentUtgift } from "@/lib/db/utgifter";
import { formatNorskDato, formatNorskValuta } from "@/lib/utils";
import type { UtgiftRad } from "@/lib/db/utgifter";

interface Props {
  params: Promise<{ id: string }>;
}

const KONTO_NAVN: Record<string, string> = {
  "6000": "Varekjøp",
  "6540": "Inventar og utstyr",
  "6900": "Telefon og internett",
  "7140": "Reise og transport",
  "7150": "Diett og overnatting",
  "7160": "Reklame og markedsføring",
  "7320": "Revisjon og regnskap",
  "7500": "Forsikring",
  "7770": "Bank og kortgebyr",
  "7790": "Andre driftskostnader",
};

export default async function UtgiftDetaljerSide({ params }: Props) {
  const { id } = await params;
  const { data, error } = await hentUtgift(id);

  if (error || !data) notFound();

  const utgift = data as unknown as UtgiftRad;
  const fil = utgift.files ?? null;

  let signertUrl: string | null = null;
  if (fil) {
    const supabase = await createClient();
    const { data: signedData } = await supabase.storage
      .from("receipts")
      .createSignedUrl(fil.storage_path, 3600);
    signertUrl = signedData?.signedUrl ?? null;
  }

  const erBilde = fil?.mime_type.startsWith("image/") ?? false;

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/utgifter"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Utgift</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <Rad label="Dato" verdi={formatNorskDato(utgift.expense_date)} />
        <Rad label="Beskrivelse" verdi={utgift.description} />
        <Rad
          label="Konto"
          verdi={`${utgift.account_code} — ${KONTO_NAVN[utgift.account_code] ?? utgift.account_code}`}
        />
        <Rad
          label="Beløp inkl. mva"
          verdi={formatNorskValuta(Number(utgift.amount_gross))}
          uthevet
        />
        {utgift.supplier_name && (
          <Rad label="Leverandør" verdi={utgift.supplier_name} />
        )}

        {/* Kvittering */}
        {fil && signertUrl && (
          <div className="px-5 py-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Kvittering
            </p>
            {erBilde ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signertUrl}
                  alt={fil.original_filename}
                  className="w-full rounded-lg border border-slate-200 object-contain max-h-96"
                />
                <a
                  href={signertUrl}
                  download={fil.original_filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Download size={14} />
                  Last ned {fil.original_filename}
                </a>
              </div>
            ) : (
              <a
                href={signertUrl}
                download={fil.original_filename}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Paperclip size={15} className="text-slate-400" />
                {fil.original_filename}
                <Download size={14} className="ml-auto text-slate-400" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Rad({
  label,
  verdi,
  uthevet,
}: {
  label: string;
  verdi: string;
  uthevet?: boolean;
}) {
  return (
    <div className="flex justify-between items-center px-5 py-3.5 gap-4">
      <p className="text-sm text-slate-500 shrink-0">{label}</p>
      <p
        className={`text-sm text-right ${
          uthevet ? "font-semibold text-slate-900" : "text-slate-900"
        }`}
      >
        {verdi}
      </p>
    </div>
  );
}
