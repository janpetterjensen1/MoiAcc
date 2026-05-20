import Link from "next/link";
import { hentAlleKunder } from "@/lib/db/customers";
import { formatNorskDato, formatNorskValuta } from "@/lib/utils";
import { Plus, ChevronRight } from "lucide-react";

export default async function KunderSide() {
  const { data: kunder, error } = await hentAlleKunder();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kunder</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {kunder?.length ?? 0} kunder
          </p>
        </div>
        <Link
          href="/kunder/ny"
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} />
          Ny kunde
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          Feil ved henting av kunder: {error.message}
        </div>
      )}

      <div className="space-y-2">
        {kunder?.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-500 text-sm">Ingen kunder ennå.</p>
            <Link
              href="/kunder/ny"
              className="mt-3 inline-block text-sm font-medium text-slate-900 underline"
            >
              Legg til første kunde
            </Link>
          </div>
        )}

        {kunder?.map((kunde) => {
          const adresse = kunde.invoice_address as {
            street: string;
            postal_code: string;
            city: string;
          };
          const aktiv = !kunde.active_to || new Date(kunde.active_to) >= new Date();

          return (
            <Link
              key={kunde.id}
              href={`/kunder/${kunde.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {kunde.short_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{kunde.short_name}</p>
                    {!aktiv && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        Inaktiv
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {kunde.legal_name} · {adresse.postal_code} {adresse.city}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">
                    {formatNorskValuta(Number(kunde.hourly_rate))}/t
                  </p>
                  <p className="text-xs text-slate-500">
                    Fra {formatNorskDato(kunde.active_from)}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
