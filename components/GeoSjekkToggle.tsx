"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

export function GeoSjekkToggle() {
  const [aktivert, setAktivert] = useState(true);
  const [lastet, setLastet] = useState(false);

  useEffect(() => {
    const lagret = localStorage.getItem("geoSjekk");
    setAktivert(lagret === null ? true : lagret === "true");
    setLastet(true);
  }, []);

  function toggle() {
    const nyVerdi = !aktivert;
    setAktivert(nyVerdi);
    localStorage.setItem("geoSjekk", String(nyVerdi));
  }

  if (!lastet) return null;

  return (
    <div className="flex items-center justify-between py-3 border-t border-slate-100 mt-2">
      <div className="flex items-center gap-2.5">
        <MapPin size={15} className="text-slate-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-slate-700">Auto-kvittering via GPS</p>
          <p className="text-xs text-slate-400">Sjekk 10 min etter sesjonstart</p>
        </div>
      </div>
      <button
        onClick={toggle}
        role="switch"
        aria-checked={aktivert}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          aktivert ? "bg-green-500" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
            aktivert ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
