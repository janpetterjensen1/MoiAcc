import Link from "next/link";
import { hentAlleUtgifter } from "@/lib/db/utgifter";
import { formatNorskDato, formatNorskValuta } from "@/lib/utils";
import { Paperclip, Receipt, Plus } from "lucide-react";
import type { UtgiftRad } from "@/lib/db/utgifter";

export default async function UtgifterSide() {
  const { data: utgifter } = await hentAlleUtgifter();
  const liste = (utgifter ?? []) as unknown as UtgiftRad[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utgifter</h1>
          <p className="text-sm text-slate-500 mt-0.5">{liste.length} totalt</p>
        </div>
        <Link
          href="/utgifter/ny"
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} />
          Registrer utgift
        </Link>
      </div>

      <div className="space-y-2">
        {liste.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Receipt size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Ingen utgifter registrert ennå.</p>
            <Link
              href="/utgifter/ny"
              className="mt-3 inline-block text-sm text-slate-500 hover:text-slate-900 underline underline-offset-2"
            >
              Registrer din første utgift
            </Link>
          </div>
        )}
        {liste.map((u) => (
          <Link
            key={u.id}
            href={`/utgifter/${u.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-slate-900 truncate">{u.description}</p>
                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {u.account_code}
                </span>
                {u.receipt_file_id && (
                  <Paperclip size={13} className="shrink-0 text-slate-400" />
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {formatNorskDato(u.expense_date)}
                {u.supplier_name && (
                  <span className="ml-2 text-slate-400">· {u.supplier_name}</span>
                )}
              </p>
            </div>
            <p className="ml-4 shrink-0 font-semibold text-slate-900 tabular-nums">
              {formatNorskValuta(Number(u.amount_gross))}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
