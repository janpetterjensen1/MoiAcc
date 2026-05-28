"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, Loader2 } from "lucide-react";

const VAPID_KEY = "BDq7UbRah_Ik92NdhowON-_Ct9RXrDTcN-41JvA-xQ9mRrXhtuBuBwUoRbvY9cjvQCwPATK3WXf545J6xAhQv_s";

type Status = "klar" | "registrert" | "feil" | "avvist" | "ikke-støttet";

export function PushVarselKnapp() {
  const [status, setStatus] = useState<Status>("klar");
  const [pending, setPending] = useState(false);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);

  useEffect(() => {
    // Støttesjekk
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("ikke-støttet");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("avvist");
      return;
    }

    // Sjekk om subscription allerede finnes — synkroniser mot server om nødvendig
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      reg.pushManager.getSubscription().then((sub) => {
        if (!sub) return;
        // Subscription finnes i nettleseren — synkroniser med DB
        const json = sub.toJSON();
        fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        }).then((r) => {
          setStatus(r.ok ? "registrert" : "feil");
        }).catch(() => setStatus("feil"));
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  async function aktiver() {
    if (pending) return;
    setPending(true);
    try {
      // Registrer SW om nødvendig
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Be om tillatelse
      const tillatelse = await Notification.requestPermission();
      if (tillatelse === "denied") { setStatus("avvist"); return; }
      if (tillatelse !== "granted") return;

      // Push-abonnement
      const pad = VAPID_KEY.length % 4;
      const padded = pad ? VAPID_KEY + "=".repeat(4 - pad) : VAPID_KEY;
      const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
      const applicationServerKey = new Uint8Array(raw.split("").map((c) => c.charCodeAt(0)));

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      }

      const json = sub.toJSON();
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });

      setStatus(res.ok ? "registrert" : "feil");
    } catch (e) {
      console.error("Push-feil:", e);
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      setFeilmelding(msg);
      setStatus("feil");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 pt-5 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Bakgrunns-geo-varsler
      </p>

      {status === "ikke-støttet" && (
        <p className="text-sm text-slate-400 flex items-start gap-2">
          <BellOff size={15} className="shrink-0 mt-0.5" />
          Støttes ikke i Safari-nettleseren. Legg til på hjemskjermen og åpne derfra.
        </p>
      )}

      {status === "avvist" && (
        <p className="text-sm text-red-500 flex items-start gap-2">
          <BellOff size={15} className="shrink-0 mt-0.5" />
          Varsler blokkert — gå til Innstillinger → Varsler → MoiAcc og aktiver.
        </p>
      )}

      {status === "registrert" && (
        <p className="text-sm text-green-600 font-medium flex items-center gap-2">
          <CheckCircle2 size={15} />
          Aktivert — geo-sjekk kjøres automatisk i bakgrunn
        </p>
      )}

      {(status === "klar" || status === "feil") && (
        <>
          <button
            onClick={aktiver}
            disabled={pending}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: status === "feil" ? "rgba(220,50,30,0.08)" : "rgba(201,168,76,0.10)",
              border: `1px solid ${status === "feil" ? "rgba(220,50,30,0.3)" : "rgba(201,168,76,0.35)"}`,
              color: status === "feil" ? "#c0392b" : "#b08830",
            }}
          >
            {pending
              ? <><Loader2 size={15} className="animate-spin" /> Aktiverer…</>
              : status === "feil"
                ? <><BellOff size={15} /> Feilet — trykk for å prøve igjen</>
                : <><Bell size={15} /> Aktiver geo-varsler i bakgrunn</>}
          </button>
          {feilmelding && (
            <p className="mt-2 text-xs text-red-400 break-all font-mono">{feilmelding}</p>
          )}
        </>
      )}
    </div>
  );
}
