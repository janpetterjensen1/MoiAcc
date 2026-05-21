import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, FileDown, Circle } from "lucide-react";
import { hentFaktura, hentFakturaLinjer } from "@/lib/db/invoices";
import { formatNorskDato, formatNorskValuta } from "@/lib/utils";
import { GodkjennKnapp } from "./godkjenn-knapp";
import { KreditnotaKnapp } from "./kreditnota-knapp";
import { PurringKnapp } from "./purring-knapp";
import { markerBetaltAction } from "@/app/actions/invoices";

const STATUS_ETIKETT: Record<string, { tekst: string; klasse: string }> = {
  draft:             { tekst: "Utkast",          klasse: "bg-slate-100 text-slate-500" },
  awaiting_approval: { tekst: "Til godkjenning", klasse: "bg-amber-100 text-amber-700" },
  sent:              { tekst: "Sendt",            klasse: "bg-blue-100 text-blue-700" },
  paid:              { tekst: "Betalt",           klasse: "bg-green-100 text-green-700" },
  overdue:           { tekst: "Forfalt",          klasse: "bg-red-100 text-red-700" },
  credited:          { tekst: "Kreditert",        klasse: "bg-purple-100 text-purple-700" },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FakturaDetaljSide({ params }: Props) {
  const { id } = await params;
  const [{ data: faktura }, { data: linjer }] = await Promise.all([
    hentFaktura(id),
    hentFakturaLinjer(id),
  ]);

  if (!faktura) notFound();

  const kunde = faktura.customers;
  const status = STATUS_ETIKETT[faktura.status] ?? { tekst: faktura.status, klasse: "bg-slate-100 text-slate-500" };
  const erDraft = faktura.status === "draft" || faktura.status === "awaiting_approval";
  const erSent = faktura.status === "sent";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/fakturaer" className="text-slate-500 hover:text-slate-900">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">
              Faktura #{faktura.invoice_number}
            </h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.klasse}`}>
              {status.tekst}
            </span>
          </div>
          <p className="text-sm text-slate-500">{kunde?.legal_name ?? kunde?.short_name}</p>
        </div>
      </div>

      {/* Faktura-metadata */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Fakturadato</p>
            <p className="font-medium">{formatNorskDato(faktura.invoice_date)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Forfall</p>
            <p className="font-medium">{formatNorskDato(faktura.due_date)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Periode</p>
            <p className="font-medium">
              {formatNorskDato(faktura.period_from)} – {formatNorskDato(faktura.period_to)}
            </p>
          </div>
          {faktura.approved_at && (
            <div>
              <p className="text-xs text-slate-400">Godkjent</p>
              <p className="font-medium">{formatNorskDato(faktura.approved_at)}</p>
            </div>
          )}
          {faktura.sent_at && (
            <div>
              <p className="text-xs text-slate-400">Sendt</p>
              <p className="font-medium">{formatNorskDato(faktura.sent_at)}</p>
            </div>
          )}
          {faktura.paid_at && (
            <div>
              <p className="text-xs text-slate-400">Betalt</p>
              <p className="font-medium text-green-600">{formatNorskDato(faktura.paid_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Statuslinje */}
      <FakturaStatuslinje
        createdAt={faktura.created_at}
        sentAt={faktura.sent_at}
        paidAt={faktura.paid_at}
        status={faktura.status}
      />

      {/* Tidslinjetabell */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Dato</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">Beskrivelse</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Timer</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">Sats</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Beløp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(linjer ?? []).map((linje) => (
              <tr key={linje.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 tabular-nums text-slate-600">
                  {formatNorskDato(linje.session_date)}
                </td>
                <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                  {linje.note?.startsWith("__prebilled__|")
                    ? linje.note.split("|")[1]
                    : (linje.note && !linje.note.startsWith("__"))
                      ? linje.note
                      : "Undervisning"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {Number(linje.actual_duration_h).toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500 hidden sm:table-cell">
                  {formatNorskValuta(Number(linje.hourly_rate_at_time))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatNorskValuta(Number(linje.line_amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Sum-seksjon */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatNorskValuta(Number(faktura.subtotal))}</span>
          </div>
          <div className="flex justify-between text-slate-500 text-xs">
            <span>{faktura.vat_exempt_note}</span>
            <span className="tabular-nums">{formatNorskValuta(0)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t border-slate-200">
            <span>Totalt å betale</span>
            <span className="tabular-nums">{formatNorskValuta(Number(faktura.total))}</span>
          </div>
        </div>
      </div>

      {/* PDF-forhåndsvisning */}
      <div className="flex justify-end mb-4">
        <Link
          href={`/api/invoice/${faktura.id}/pdf`}
          target="_blank"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
        >
          <FileDown size={14} />
          Forhåndsvis / last ned PDF
        </Link>
      </div>

      {/* Handlingsknapper */}
      {faktura.status === "awaiting_approval" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Faktura klar til godkjenning</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Gjennomgå linjene over. Godkjenning er lovpålagt før utsendelse (bokfl. §5).
              </p>
            </div>
          </div>
          <GodkjennKnapp fakturaId={faktura.id} />
        </div>
      )}

      {faktura.status === "overdue" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-800 mb-3">Faktura er forfalt</p>
          <PurringKnapp fakturaId={faktura.id} />
        </div>
      )}

      {(faktura.status === "sent" || faktura.status === "overdue") && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Registrer betaling</p>
            <form action={markerBetaltAction} className="flex gap-3">
              <input type="hidden" name="faktura_id" value={faktura.id} />
              <input
                name="paid_at"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                <CheckCircle2 size={15} />
                Merk betalt
              </button>
            </form>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <KreditnotaKnapp fakturaId={faktura.id} />
          </div>
        </div>
      )}

      {faktura.status === "paid" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <KreditnotaKnapp fakturaId={faktura.id} />
        </div>
      )}
    </div>
  );
}

function FakturaStatuslinje({
  createdAt,
  sentAt,
  paidAt,
  status,
}: {
  createdAt: string;
  sentAt: string | null;
  paidAt: string | null;
  status: string;
}) {
  const erKreditert = status === "credited";
  const erForfalt = status === "overdue";

  const steg = [
    {
      label: "Produsert",
      dato: createdAt,
      ferdig: true,
      farge: "green",
    },
    {
      label: "Sendt",
      dato: sentAt,
      ferdig: !!sentAt,
      farge: erForfalt ? "red" : "blue",
      ekstra: erForfalt ? "Forfalt" : undefined,
    },
    {
      label: erKreditert ? "Kreditert" : "Betalt",
      dato: paidAt,
      ferdig: !!paidAt || erKreditert,
      farge: erKreditert ? "purple" : "green",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 mb-4">
      <div className="flex items-start justify-between relative">
        {/* Forbindelseslinje */}
        <div className="absolute top-3.5 left-[calc(16.666%)] right-[calc(16.666%)] h-px bg-slate-200" />

        {steg.map((s, i) => {
          const fargeKlasser: Record<string, { dot: string; tekst: string }> = {
            green:  { dot: "bg-green-500 border-green-500",   tekst: "text-green-600" },
            blue:   { dot: "bg-blue-500 border-blue-500",     tekst: "text-blue-600" },
            red:    { dot: "bg-red-500 border-red-500",       tekst: "text-red-600" },
            purple: { dot: "bg-purple-500 border-purple-500", tekst: "text-purple-600" },
          };
          const f = fargeKlasser[s.farge] ?? fargeKlasser.green;
          return (
            <div key={i} className="flex flex-col items-center flex-1 relative z-10">
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white
                  ${s.ferdig ? f.dot : "border-slate-300 bg-white"}`}
              >
                {s.ferdig ? (
                  <CheckCircle2 size={16} className="text-white" />
                ) : (
                  <Circle size={10} className="text-slate-300 fill-slate-200" />
                )}
              </div>
              <p className={`mt-2 text-xs font-semibold ${s.ferdig ? f.tekst : "text-slate-400"}`}>
                {s.label}
              </p>
              {s.dato ? (
                <p className="text-[10px] text-slate-400 mt-0.5 text-center">
                  {formatNorskDato(s.dato.slice(0, 10))}
                </p>
              ) : (
                <p className="text-[10px] text-slate-300 mt-0.5">—</p>
              )}
              {s.ekstra && (
                <span className="mt-1 text-[9px] font-semibold text-red-500 uppercase tracking-wide">
                  {s.ekstra}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
