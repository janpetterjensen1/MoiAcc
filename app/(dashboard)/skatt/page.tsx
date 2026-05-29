import { hentFakturainntektForAar, hentUtgifterForAar } from "@/lib/db/skatt";
import { hentSkattConfig } from "@/app/actions/skatt";
import { SkattOversikt } from "@/components/SkattOversikt";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default async function SkattPage() {
  const aar = new Date().getFullYear();

  const [fakturainntekt, utgifter, skattConfig] = await Promise.all([
    hentFakturainntektForAar(aar),
    hentUtgifterForAar(aar),
    hentSkattConfig(aar),
  ]);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-xl"
            style={{ fontFamily: "var(--font-cinzel)", color: "rgba(232,213,160,0.92)", letterSpacing: "0.5px" }}
          >
            Skatteestimat {aar}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Foreløpig estimat basert på årets tall
          </p>
        </div>
        <Link
          href="/regnskap"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors"
          style={{ color: "rgba(168,216,168,0.6)", border: "1px solid rgba(45,122,45,0.3)" }}
        >
          <BookOpen size={13} />
          Årsregnskap
        </Link>
      </div>

      <SkattOversikt
        fakturainntekt={fakturainntekt}
        utgifter={utgifter}
        aar={aar}
        initAnnenInntekt={skattConfig.annen_inntekt}
        initForskuddsskatt={skattConfig.forskuddsskatt_utskrevet}
      />
    </div>
  );
}
