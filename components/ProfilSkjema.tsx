"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Camera, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { oppdaterProfil, lagreAvatar } from "@/app/actions/profil";
import { lagreSkattConfig } from "@/app/actions/skatt";

interface Props {
  userId: string;
  email: string;
  visningsnavn: string;
  telefon: string;
  tittel: string;
  avatarUrl: string | null;
  orgNumber: string;
  bankAccount: string;
  iban: string;
  address: string;
  postalCode: string;
  city: string;
  invoiceEmail: string;
  skatteAar: number;
  annenInntekt: number;
  forskuddsskattUtskrevet: number;
}

export function ProfilSkjema({ userId, email, visningsnavn, telefon, tittel, avatarUrl, orgNumber, bankAccount, iban, address, postalCode, city, invoiceEmail, skatteAar, annenInntekt, forskuddsskattUtskrevet }: Props) {
  const [navn, setNavn] = useState(visningsnavn);
  const [tlf, setTlf] = useState(telefon);
  const [rolle, setRolle] = useState(tittel);
  const [orgNr, setOrgNr] = useState(orgNumber);
  const [annenInntektVal, setAnnenInntektVal] = useState(annenInntekt > 0 ? String(annenInntekt) : "");
  const [forskuddVal, setForskuddVal] = useState(forskuddsskattUtskrevet > 0 ? String(forskuddsskattUtskrevet) : "");
  const [konto, setKonto] = useState(bankAccount);
  const [ibanNr, setIbanNr] = useState(iban);
  const [adresse, setAdresse] = useState(address);
  const [postnr, setPostnr] = useState(postalCode);
  const [poststed, setPoststed] = useState(city);
  const [fakturaEpost, setFakturaEpost] = useState(invoiceEmail);

  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [avatarStatus, setAvatarStatus] = useState<"idle" | "laster" | "ok" | "feil">("idle");
  const [avatarFeil, setAvatarFeil] = useState("");

  const [lagreStatus, setLagreStatus] = useState<"idle" | "laster" | "ok" | "feil">("idle");
  const [lagreFeil, setLagreFeil] = useState("");
  const [isPending, startTransition] = useTransition();

  const initial = (navn || email)[0].toUpperCase();

  async function handleBilde(e: React.ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0];
    if (!fil) return;

    if (fil.size > 2 * 1024 * 1024) {
      setAvatarStatus("feil");
      setAvatarFeil("For stort — maks 2 MB");
      return;
    }

    setAvatarStatus("laster");
    setAvatarFeil("");
    setPreview(URL.createObjectURL(fil));

    const supabase = createClient();
    const ext = fil.name.split(".").pop() ?? "jpg";
    const filsti = `${userId}/avatar.${ext}`;

    const { error: opplastFeil } = await supabase.storage
      .from("avatars")
      .upload(filsti, fil, { upsert: true, contentType: fil.type });

    if (opplastFeil) {
      setAvatarStatus("feil");
      setAvatarFeil("Opplasting feilet: " + opplastFeil.message);
      setPreview(avatarUrl);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filsti);
    const publicUrl = data.publicUrl;

    // Lagre URL i profiles-tabellen via server action
    const res = await lagreAvatar(publicUrl);
    if (res.error) {
      setAvatarStatus("feil");
      setAvatarFeil("Kunne ikke lagre bilde: " + res.error);
      return;
    }

    setPreview(`${publicUrl}?t=${Date.now()}`);
    setAvatarStatus("ok");
  }

  function lagreProfil() {
    setLagreStatus("laster");
    setLagreFeil("");

    startTransition(async () => {
      const [res] = await Promise.all([
        oppdaterProfil(navn, rolle, tlf, {
          org_number:    orgNr,
          bank_account:  konto,
          iban:          ibanNr,
          address:       adresse,
          postal_code:   postnr,
          city:          poststed,
          invoice_email: fakturaEpost,
        }),
        lagreSkattConfig(
          skatteAar,
          parseFloat(annenInntektVal.replace(/\s/g, "").replace(",", ".")) || 0,
          parseFloat(forskuddVal.replace(/\s/g, "").replace(",", ".")) || 0,
        ),
      ]);
      if (res?.error) {
        setLagreStatus("feil");
        setLagreFeil(res.error);
      } else {
        setLagreStatus("ok");
      }
    });
  }

  return (
    <div className="space-y-5">
      {lagreStatus === "feil" && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {lagreFeil}
        </div>
      )}
      {lagreStatus === "ok" && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={15} /> Profilen er lagret.
        </div>
      )}

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 pb-1">
        <label htmlFor="avatar-input" className="relative cursor-pointer group">
          <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center ring-4 ring-white shadow-md">
            {preview ? (
              <Image
                src={preview}
                alt="Profilbilde"
                width={96}
                height={96}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <span className="text-3xl font-bold text-slate-500">{initial}</span>
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={22} className="text-white" />
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shadow ring-2 ring-white pointer-events-none">
            <Camera size={14} className="text-white" />
          </div>
        </label>

        <p className="text-xs text-center min-h-[1rem]">
          {avatarStatus === "laster" && <span className="text-slate-400">Laster opp…</span>}
          {avatarStatus === "ok"     && <span className="text-green-600">Bilde lagret ✓</span>}
          {avatarStatus === "feil"   && <span className="text-red-600">{avatarFeil}</span>}
          {avatarStatus === "idle"   && <span className="text-slate-400">Trykk på bildet for å endre</span>}
        </p>

        <input
          id="avatar-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleBilde}
          disabled={avatarStatus === "laster"}
        />
      </div>

      {/* E-post */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">E-post</label>
        <p className="px-3 py-2 rounded-lg bg-slate-100 text-sm text-slate-500">{email}</p>
      </div>

      {/* Navn */}
      <div>
        <label htmlFor="p-navn" className="block text-xs font-medium text-slate-600 mb-1.5">Navn</label>
        <input
          id="p-navn"
          type="text"
          value={navn}
          onChange={(e) => { setNavn(e.target.value); setLagreStatus("idle"); }}
          placeholder="Jan Petter Jensen"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* Tittel */}
      <div>
        <label htmlFor="p-tittel" className="block text-xs font-medium text-slate-600 mb-1.5">Tittel / rolle</label>
        <input
          id="p-tittel"
          type="text"
          value={rolle}
          onChange={(e) => { setRolle(e.target.value); setLagreStatus("idle"); }}
          placeholder="Personlig trener"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* Telefon */}
      <div>
        <label htmlFor="p-telefon" className="block text-xs font-medium text-slate-600 mb-1.5">Telefon</label>
        <input
          id="p-telefon"
          type="tel"
          value={tlf}
          onChange={(e) => { setTlf(e.target.value); setLagreStatus("idle"); }}
          placeholder="+47 900 00 000"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* Fakturainformasjon */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Fakturainformasjon</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="p-orgnr" className="block text-xs font-medium text-slate-600 mb-1.5">Organisasjonsnummer</label>
            <input
              id="p-orgnr"
              type="text"
              value={orgNr}
              onChange={(e) => { setOrgNr(e.target.value); setLagreStatus("idle"); }}
              placeholder="123 456 789"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="p-konto" className="block text-xs font-medium text-slate-600 mb-1.5">Kontonummer</label>
            <input
              id="p-konto"
              type="text"
              value={konto}
              onChange={(e) => { setKonto(e.target.value); setLagreStatus("idle"); }}
              placeholder="1234.56.78901"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="p-iban" className="block text-xs font-medium text-slate-600 mb-1.5">IBAN</label>
            <input
              id="p-iban"
              type="text"
              value={ibanNr}
              onChange={(e) => { setIbanNr(e.target.value); setLagreStatus("idle"); }}
              placeholder="NO12 3456 7890 123"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="p-adresse" className="block text-xs font-medium text-slate-600 mb-1.5">Adresse</label>
            <input
              id="p-adresse"
              type="text"
              value={adresse}
              onChange={(e) => { setAdresse(e.target.value); setLagreStatus("idle"); }}
              placeholder="Storgata 1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex gap-3">
            <div className="w-28">
              <label htmlFor="p-postnr" className="block text-xs font-medium text-slate-600 mb-1.5">Postnr</label>
              <input
                id="p-postnr"
                type="text"
                value={postnr}
                onChange={(e) => { setPostnr(e.target.value); setLagreStatus("idle"); }}
                placeholder="0001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="p-poststed" className="block text-xs font-medium text-slate-600 mb-1.5">Poststed</label>
              <input
                id="p-poststed"
                type="text"
                value={poststed}
                onChange={(e) => { setPoststed(e.target.value); setLagreStatus("idle"); }}
                placeholder="Oslo"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="p-fakturaepost" className="block text-xs font-medium text-slate-600 mb-1.5">Faktura-e-post</label>
            <input
              id="p-fakturaepost"
              type="email"
              value={fakturaEpost}
              onChange={(e) => { setFakturaEpost(e.target.value); setLagreStatus("idle"); }}
              placeholder="faktura@eksempel.no"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Skatteinformasjon */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Skatt {skatteAar}</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="p-annen-inntekt" className="block text-xs font-medium text-slate-600 mb-1.5">
              Annen inntekt
            </label>
            <input
              id="p-annen-inntekt"
              type="text"
              inputMode="numeric"
              value={annenInntektVal}
              onChange={(e) => { setAnnenInntektVal(e.target.value); setLagreStatus("idle"); }}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Annen inntekt, ikke fakturert gjennom MoiAcc, for å beregne skatt
            </p>
          </div>

          <div>
            <label htmlFor="p-forskudd" className="block text-xs font-medium text-slate-600 mb-1.5">
              Forskuddsskatt utskrevet fra Altinn
            </label>
            <input
              id="p-forskudd"
              type="text"
              inputMode="numeric"
              value={forskuddVal}
              onChange={(e) => { setForskuddVal(e.target.value); setLagreStatus("idle"); }}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Finn beløpet i Altinn under Skatt og avgift
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={lagreProfil}
        disabled={isPending || avatarStatus === "laster"}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        {isPending ? "Lagrer…" : "Lagre profil"}
      </button>
    </div>
  );
}
