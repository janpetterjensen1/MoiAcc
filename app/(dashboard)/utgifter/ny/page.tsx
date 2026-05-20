import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UtgiftSkjema } from "@/components/UtgiftSkjema";

export default function NyUtgiftSide() {
  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/utgifter"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Registrer utgift</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <UtgiftSkjema />
      </div>
    </div>
  );
}
