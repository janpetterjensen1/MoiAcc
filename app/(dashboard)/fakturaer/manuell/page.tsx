import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { hentAlleKunder } from "@/lib/db/customers";
import { ManuellFakturaSkjema } from "./skjema";

export default async function ManuellFakturaSide() {
  const { data: kunder } = await hentAlleKunder();

  const iDag = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/fakturaer" className="p-1.5 rounded-lg transition-colors" style={{ color: "rgba(168,216,168,0.5)" }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1
            className="text-xl"
            style={{ fontFamily: "var(--font-cinzel)", color: "rgba(232,213,160,0.92)", letterSpacing: "0.5px" }}
          >
            Registrer faktura
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            For historiske fakturaer og fakturaer laget utenfor MoiAcc
          </p>
        </div>
      </div>

      <ManuellFakturaSkjema
        kunder={(kunder ?? []).map(k => ({ id: k.id, navn: k.short_name || k.legal_name }))}
        iDag={iDag}
      />
    </div>
  );
}
