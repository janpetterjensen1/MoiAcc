import { hentFakturainntektForAar, hentUtgifterForAar } from "@/lib/db/skatt";
import { SkattOversikt } from "@/components/SkattOversikt";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default async function SkattPage() {
  const aar = new Date().getFullYear();
  const [fakturainntekt, utgifter] = await Promise.all([
    hentFakturainntektForAar(aar),
    hentUtgifterForAar(aar),
  ]);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Skatteestimat {aar}</h1>
          <p className="text-sm text-slate-500 mt-1">Foreløpig estimat basert på årets tall</p>
        </div>
        <Link
          href="/regnskap"
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <BookOpen size={14} />
          Årsregnskap
        </Link>
      </div>
      <SkattOversikt fakturainntekt={fakturainntekt} utgifter={utgifter} aar={aar} />
    </div>
  );
}
