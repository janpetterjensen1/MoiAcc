import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { hentKunde, hentKundeEndringslogg } from "@/lib/db/customers";
import { KundeSkjema } from "@/components/kunde-skjema";
import { oppdaterKundeAction } from "@/app/actions/customers";
import { formatNorskDato } from "@/lib/utils";
import { BesoksadressePanel } from "@/components/BesoksadressePanel";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feil?: string; lagret?: string }>;
}

export default async function KundeDetaljSide({ params, searchParams }: Props) {
  const { id } = await params;
  const { feil, lagret } = await searchParams;

  const { data: kunde, error } = await hentKunde(id);
  if (error || !kunde) notFound();

  const { data: logg } = await hentKundeEndringslogg(id);

  const adr = kunde.invoice_address as {
    street: string;
    postal_code: string;
    city: string;
  };

  const oppdaterMedId = oppdaterKundeAction.bind(null, id);

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/kunder"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{kunde.short_name}</h1>
          <p className="text-sm text-slate-500">{kunde.legal_name}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <KundeSkjema
          action={oppdaterMedId}
          feil={feil}
          lagret={!!lagret}
          prefill={{
            short_name: kunde.short_name,
            legal_name: kunde.legal_name,
            org_number: kunde.org_number,
            invoice_email: kunde.invoice_email,
            invoice_day_rule: kunde.invoice_day_rule,
            payment_days: kunde.payment_days,
            hourly_rate: Number(kunde.hourly_rate),
            active_from: kunde.active_from,
            active_to: kunde.active_to ?? undefined,
            notes: kunde.notes ?? undefined,
            invoice_address_street: adr.street,
            invoice_address_postal_code: adr.postal_code,
            invoice_address_city: adr.city,
          }}
        />
      </div>

      <BesoksadressePanel
        kundeId={id}
        visitAddress={(kunde as { visit_address?: { street: string; postal_code: string; city: string } | null }).visit_address ?? null}
        harKoordinater={(kunde as { lat?: number | null }).lat != null}
      />

      {logg && logg.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Endringslogg</h2>
          <div className="space-y-2">
            {logg.map((rad) => (
              <div key={rad.id} className="text-xs text-slate-500 flex justify-between">
                <span>{rad.action}</span>
                <span>{formatNorskDato(rad.changed_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
