import { hentFakturainntektForAar, hentUtgifterForAar } from "@/lib/db/skatt";
import { SkattOversikt } from "@/components/SkattOversikt";

export default async function SkattPage() {
  const aar = new Date().getFullYear();
  const [fakturainntekt, utgifter] = await Promise.all([
    hentFakturainntektForAar(aar),
    hentUtgifterForAar(aar),
  ]);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Skatteestimat {aar}</h1>
        <p className="text-sm text-slate-500 mt-1">Foreløpig estimat basert på årets tall</p>
      </div>
      <SkattOversikt fakturainntekt={fakturainntekt} utgifter={utgifter} aar={aar} />
    </div>
  );
}
