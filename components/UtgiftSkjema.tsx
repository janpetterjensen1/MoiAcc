"use client";

import { useRef, useState } from "react";
import { Camera, Upload, X, FileText } from "lucide-react";
import { registrerUtgift } from "@/app/actions/utgifter";

const KONTO_ALTERNATIVER = [
  { kode: "6000", navn: "Varekjøp" },
  { kode: "6540", navn: "Inventar og utstyr" },
  { kode: "6900", navn: "Telefon og internett" },
  { kode: "7140", navn: "Reise og transport" },
  { kode: "7150", navn: "Diett og overnatting" },
  { kode: "7160", navn: "Reklame og markedsføring" },
  { kode: "7320", navn: "Revisjon og regnskap" },
  { kode: "7500", navn: "Forsikring" },
  { kode: "7770", navn: "Bank og kortgebyr" },
  { kode: "7790", navn: "Andre driftskostnader" },
];

const AKSEPTERTE_TYPER = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAKS_STORRELSE = 10 * 1024 * 1024; // 10 MB

function iDagISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Syncs a File object into the named file input so the multipart form
 * submission picks it up regardless of whether the user used the camera
 * trigger or the regular file picker / drag-and-drop.
 */
function settFilPaaInput(input: HTMLInputElement, fil: File) {
  const dt = new DataTransfer();
  dt.items.add(fil);
  input.files = dt.files;
}

export function UtgiftSkjema() {
  const [valgtFil, setValgtFil] = useState<File | null>(null);
  const [filFeil, setFilFeil] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [forhåndsvisning, setForhåndsvisning] = useState<string | null>(null);

  // The ONE named input that ends up in the FormData as "receipt"
  const receiptInputRef = useRef<HTMLInputElement>(null);
  // Separate trigger for camera (no name — data is synced to receiptInputRef)
  const kameraRef = useRef<HTMLInputElement>(null);

  function haandterFil(fil: File | null | undefined) {
    setFilFeil(null);
    if (!fil) return;
    if (!AKSEPTERTE_TYPER.includes(fil.type)) {
      setFilFeil("Kun JPEG, PNG, WebP og PDF er tillatt.");
      return;
    }
    if (fil.size > MAKS_STORRELSE) {
      setFilFeil("Filen er for stor. Maks 10 MB.");
      return;
    }
    setValgtFil(fil);

    // Sync into the named receipt input so the server action receives it
    if (receiptInputRef.current) {
      settFilPaaInput(receiptInputRef.current, fil);
    }

    if (fil.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setForhåndsvisning(e.target?.result as string);
      reader.readAsDataURL(fil);
    } else {
      setForhåndsvisning(null);
    }
  }

  function fjernFil() {
    setValgtFil(null);
    setForhåndsvisning(null);
    setFilFeil(null);
    if (receiptInputRef.current) receiptInputRef.current.value = "";
    if (kameraRef.current) kameraRef.current.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    haandterFil(e.dataTransfer.files?.[0]);
  }

  return (
    <form
      action={registrerUtgift}
      encType="multipart/form-data"
      className="space-y-5"
    >
      {/* Dato */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Dato <span className="text-red-500">*</span>
        </label>
        <input
          name="expense_date"
          type="date"
          required
          defaultValue={iDagISO()}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Konto */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Konto <span className="text-red-500">*</span>
        </label>
        <select
          name="account_code"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {KONTO_ALTERNATIVER.map((k) => (
            <option key={k.kode} value={k.kode}>
              {k.kode} - {k.navn}
            </option>
          ))}
        </select>
      </div>

      {/* Beskrivelse */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Beskrivelse <span className="text-red-500">*</span>
        </label>
        <input
          name="description"
          type="text"
          required
          placeholder="Hva gjelder utgiften?"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Leverandør */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Leverandør
        </label>
        <input
          name="supplier_name"
          type="text"
          placeholder="Valgfritt"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Beløp */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Beløp inkl. mva <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            kr
          </span>
          <input
            name="amount_gross"
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder="0,00"
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      {/* Kvittering */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Kvittering
        </label>

        {/*
          Primary named input — used by the form.
          On desktop this is triggered by the drag zone / "Velg fil" click.
          On mobile it is also synced from the camera trigger below.
        */}
        <input
          ref={receiptInputRef}
          name="receipt"
          type="file"
          accept={AKSEPTERTE_TYPER.join(",")}
          className="hidden"
          onChange={(e) => haandterFil(e.target.files?.[0])}
        />

        {/*
          Camera trigger — no name attribute, so it does NOT appear in FormData.
          We manually sync the picked file into receiptInputRef via haandterFil.
        */}
        <input
          ref={kameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => haandterFil(e.target.files?.[0])}
        />

        {valgtFil ? (
          <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-3">
            {forhåndsvisning ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={forhåndsvisning}
                alt="Forhåndsvisning"
                className="h-16 w-16 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                <FileText size={24} className="text-slate-500" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {valgtFil.name}
              </p>
              <p className="text-xs text-slate-500">
                {(valgtFil.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={fjernFil}
              className="ml-auto shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Kamera-knapp — bare synlig på mobil */}
            <button
              type="button"
              onClick={() => kameraRef.current?.click()}
              className="md:hidden w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white py-4 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 active:bg-slate-50 transition-colors"
            >
              <Camera size={18} />
              Ta bilde med kamera
            </button>

            {/* Drag-and-drop / klikk for å velge — alle enheter */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => receiptInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && receiptInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 cursor-pointer transition-colors ${
                dragOver
                  ? "border-slate-500 bg-slate-50"
                  : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <Upload size={22} className="text-slate-400" />
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">Klikk for å velge</span>{" "}
                eller dra og slipp
              </p>
              <p className="text-xs text-slate-400">JPEG, PNG, WebP, PDF — maks 10 MB</p>
            </div>
          </div>
        )}

        {filFeil && (
          <p className="mt-1.5 text-xs text-red-600">{filFeil}</p>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
      >
        Lagre utgift
      </button>
    </form>
  );
}
