import { hentFakturainntektForAar, hentUtgifterPerKontoForAar } from "@/lib/db/skatt";
import { Aarsregnskap } from "@/components/Aarsregnskap";

interface Props {
  searchParams: Promise<{ aar?: string }>;
}

export default async function RegnskapPage({ searchParams }: Props) {
  const { aar: aarParam } = await searchParams;
  const naavaerende = new Date().getFullYear();
  const aar = aarParam ? parseInt(aarParam) : naavaerende;

  // Tilby de siste 3 årene pluss inneværende
  const alleAar = Array.from({ length: 4 }, (_, i) => naavaerende - i);

  const [fakturainntekt, utgifterPerKonto] = await Promise.all([
    hentFakturainntektForAar(aar),
    hentUtgifterPerKontoForAar(aar),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Årsregnskap</h1>
        <p className="text-sm text-slate-500 mt-1">Grunnlag for næringsoppgave (RF-1175)</p>
      </div>
      <Aarsregnskap
        aar={aar}
        alleAar={alleAar}
        fakturainntekt={fakturainntekt}
        utgifterPerKonto={utgifterPerKonto}
      />
    </div>
  );
}
