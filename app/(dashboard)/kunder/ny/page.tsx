import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KundeSkjema } from "@/components/kunde-skjema";
import { opprettKundeAction } from "@/app/actions/customers";

interface Props {
  searchParams: Promise<{ feil?: string }>;
}

export default async function NyKundeSide({ searchParams }: Props) {
  const { feil } = await searchParams;

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/kunder"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Ny kunde</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <KundeSkjema action={opprettKundeAction} feil={feil} />
      </div>
    </div>
  );
}
