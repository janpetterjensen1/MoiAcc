/**
 * skatt-varsel — Supabase Edge Function
 *
 * Kjøres daglig 07:00 CET via pg_cron.
 * Sender push-varsel til alle brukere 14 og 7 dager før hver forskuddsskatt-termin.
 *
 * Deploy: supabase functions deploy skatt-varsel
 * Cron (SQL):
 *   select cron.schedule(
 *     'skatt-varsel-daglig',
 *     '0 6 * * *',
 *     $$select net.http_post(
 *       url:='https://eptastodjhyanomzauti.supabase.co/functions/v1/skatt-varsel',
 *       headers:='{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
 *       body:='{}'::jsonb
 *     )$$
 *   );
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY          = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY         = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT             = Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@example.com";

// ── Norske forskuddsskatt-terminer ────────────────────────────────────────────

function terminer(year: number): { dato: string; nr: number }[] {
  return [
    { nr: 1, dato: `${year}-03-15` },
    { nr: 2, dato: `${year}-06-15` },
    { nr: 3, dato: `${year}-09-15` },
    { nr: 4, dato: `${year}-12-15` },
  ];
}

function dagsDiff(fra: string, til: string): number {
  return Math.round(
    (new Date(til).getTime() - new Date(fra).getTime()) / 86_400_000
  );
}

// ── VAPID helpers (identisk med geofence-push) ────────────────────────────────

function base64UrlDecode(str: string): Uint8Array {
  const pad = str.length % 4;
  const padded = pad ? str + "=".repeat(4 - pad) : str;
  const std = padded.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(std);
  return new Uint8Array(bin.split("").map((c) => c.charCodeAt(0)));
}

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function lagVapidJwt(audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  );
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT })
    )
  );
  const privBytes = base64UrlDecode(VAPID_PRIVATE_KEY);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8", privBytes, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, sigInput);
  return `${header}.${payload}.${base64UrlEncode(sig)}`;
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<number> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await lagVapidJwt(audience);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );
  const ephemeralPubRaw = await crypto.subtle.exportKey("raw", ephemeral.publicKey);
  const receiverPub = await crypto.subtle.importKey(
    "raw", base64UrlDecode(sub.p256dh), { name: "ECDH", namedCurve: "P-256" }, false, []
  );
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverPub }, ephemeral.privateKey, 256
  );
  const authSecret = base64UrlDecode(sub.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveBits"]);
  const prkInfo = new Uint8Array([
    ...new TextEncoder().encode("WebPush: info\x00"),
    ...base64UrlDecode(sub.p256dh),
    ...new Uint8Array(ephemeralPubRaw),
  ]);
  const prk = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: prkInfo }, ikm, 256
  );
  const prkKey = await crypto.subtle.importKey("raw", prk, "HKDF", false, ["deriveBits"]);
  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("Content-Encoding: aes128gcm\x00") },
    prkKey, 128
  );
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("Content-Encoding: nonce\x00") },
    prkKey, 96
  );
  const aesKey = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
  const nonce = new Uint8Array(nonceBits);
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 0x02;
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded);

  const rs = 4096;
  const keyid = new Uint8Array(ephemeralPubRaw);
  const hdr = new Uint8Array(21 + keyid.length);
  hdr.set(salt, 0);
  new DataView(hdr.buffer).setUint32(16, rs, false);
  hdr[20] = keyid.length;
  hdr.set(keyid, 21);
  const body = new Uint8Array(hdr.length + ciphertext.byteLength);
  body.set(hdr, 0);
  body.set(new Uint8Array(ciphertext), hdr.length);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
      "Urgency": "high",
      "Authorization": `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
    },
    body,
  });
  return res.status;
}

// ── Norsk dato-formatering ────────────────────────────────────────────────────

function norskDato(iso: string): string {
  const [, m, d] = iso.split("-");
  const mnd = ["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"];
  return `${parseInt(d)}. ${mnd[parseInt(m) - 1]}`;
}

function kr(v: number): string {
  return v.toLocaleString("nb-NO") + " kr";
}

// ── Hovedlogikk ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const iDag = new Date().toISOString().slice(0, 10);
  const aar  = new Date().getFullYear();

  // Finn terminer som er 14 eller 7 dager frem i tid
  const aktuelleVarsler: { termin: number; dato: string; dager: number }[] = [];
  for (const t of terminer(aar)) {
    const diff = dagsDiff(iDag, t.dato);
    if (diff === 14 || diff === 7) {
      aktuelleVarsler.push({ termin: t.nr, dato: t.dato, dager: diff });
    }
  }

  if (aktuelleVarsler.length === 0) {
    return new Response(JSON.stringify({ sendt: 0, grunn: "Ingen terminer innen 7 eller 14 dager" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Hent alle push-subscriptions med skatt_config
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (!subs?.length) {
    return new Response(JSON.stringify({ sendt: 0, grunn: "Ingen push-subscriptions" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let sendt = 0;

  for (const varsel of aktuelleVarsler) {
    const dagerTekst = varsel.dager === 14 ? "14 dager" : "1 uke";
    const tittel = `Forskuddsskatt termin ${varsel.termin} — ${dagerTekst}`;

    for (const sub of subs) {
      // Hent eventuelt anbefalt beløp fra skatt_config
      const { data: cfg } = await supabase
        .from("skatt_config")
        .select("annen_inntekt, forskuddsskatt_utskrevet")
        .eq("user_id", sub.user_id)
        .eq("year", aar)
        .single();

      const utskrevet = Number(cfg?.forskuddsskatt_utskrevet ?? 0);
      const belopPerTermin = utskrevet > 0 ? Math.round(utskrevet / 4) : null;

      const body = belopPerTermin
        ? `Forfaller ${norskDato(varsel.dato)}. Husk å betale ${kr(belopPerTermin)} til Skatteetaten.`
        : `Termin ${varsel.termin} forfaller ${norskDato(varsel.dato)}. Åpne MoiAcc for beregning.`;

      try {
        await sendPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title: tittel, body, data: { url: "/skatt" } }
        );
        sendt++;
      } catch (_) {
        // Ignorer feilede subscriptions
      }
    }
  }

  return new Response(JSON.stringify({ sendt, varsler: aktuelleVarsler }), {
    headers: { "Content-Type": "application/json" },
  });
});
