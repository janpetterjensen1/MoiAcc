import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Download, Circle, Eye } from "lucide-react";
import { hentFaktura, hentFakturaLinjer } from "@/lib/db/invoices";
import { formatNorskDato, formatNorskValuta } from "@/lib/utils";
import { GodkjennKnapp } from "./godkjenn-knapp";
import { KlargjorKnapp } from "./klargjor-knapp";
import { KreditnotaKnapp } from "./kreditnota-knapp";
import { PurringKnapp } from "./purring-knapp";
import { markerBetaltAction } from "@/app/actions/invoices";
import { FakturaStatuslinje } from "./statuslinje";

function linjeProdukt(note: string | null): string {
  if (note?.startsWith("__prebilled__|")) return note.split("|")[1];
  if (note && !note.startsWith("__")) return note;
  return "Spinning";
}

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
        fakturaId={faktura.id}
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
                  {linjeProdukt(linje.note)}
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

      {/* PDF-knapper */}
      <div className="flex justify-end gap-2 mb-4">
        <Link
          href={`/fakturaer/${faktura.id}/pdf-preview`}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
        >
          <Eye size={14} />
          Forhåndsvis PDF
        </Link>
        <a
          href={`/api/invoice/${faktura.id}/pdf?download=1`}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
          download
        >
          <Download size={14} />
          Last ned
        </a>
      </div>

      {/* Handlingsknapper */}
      {faktura.status === "draft" && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-slate-700 mb-1">Utkast klar til gjennomgang</p>
          <p className="text-xs text-slate-500 mb-4">
            Sjekk linjene over. Når alt ser riktig ut, sender du fakturaen til godkjenning.
          </p>
          <KlargjorKnapp fakturaId={faktura.id} />
        </div>
      )}

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

