"use client";

import { useState } from "react";
import { kvitterGjennomfort } from "@/app/actions/sessions";
import { ProduktVelger } from "@/components/ProduktVelger";
import { Stoppeklokke } from "@/components/Stoppeklokke";

interface Props {
  sesjonId: string;
  customerId: string;
  sesjonDate: string;
  timesats: number;
  defaultVarighet: number;
}

export function KvitteringsSkjema({ sesjonId, customerId, sesjonDate, timesats, defaultVarighet }: Props) {
  const [stoppeklokkeVarighet, setStoppeklokkeVarighet] = useState<number | null>(null);

  return (
    <>
      <Stoppeklokke onFerdig={(t) => setStoppeklokkeVarighet(t)} />
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Kvittér gjennomført</h2>
        <form action={kvitterGjennomfort} className="space-y-4">
          <input type="hidden" name="sesjon_id" value={sesjonId} />
          <input type="hidden" name="customer_id" value={customerId} />
          <input type="hidden" name="sesjon_date" value={sesjonDate} />
          <input type="hidden" name="timesats" value={timesats} />
          <ProduktVelger
            defaultVarighet={defaultVarighet}
            timesats={timesats}
            eksternVarighet={stoppeklokkeVarighet}
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Kvittér gjennomført
          </button>
        </form>
      </div>
    </>
  );
}
