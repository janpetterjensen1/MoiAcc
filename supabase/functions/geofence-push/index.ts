// Supabase Edge Function — auto-kvitterer sesjoner 10 min etter start og sender push
// Deploy: supabase functions deploy geofence-push
// Cron:   supabase functions schedule geofence-push --cron "* * * * *"
//
// Krever secrets (supabase secrets set):
//   VAPID_PUBLIC_KEY   — offentlig VAPID-nøkkel
//   VAPID_PRIVATE_KEY  — privat VAPID-nøkkel
//   VAPID_SUBJECT      — mailto: eller https: URL, f.eks. mailto:admin@moiacc.no

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@moiacc.no";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// ── VAPID JWT-signering (innebygd Web Crypto, ingen npm-avhengighet) ──────────

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function importVapidPrivateKey(): Promise<CryptoKey> {
  const pubBytes = base64UrlDecode(VAPID_PUBLIC_KEY); // 65 bytes: 04 || x || y
  return await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: VAPID_PRIVATE_KEY,
      x: base64UrlEncode(pubBytes.slice(1, 33)),
      y: base64UrlEncode(pubBytes.slice(33, 65)),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function lagVapidJwt(audience: string, privateKey: CryptoKey): Promise<string> {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 43200, sub: VAPID_SUBJECT })
    )
  );
  const input = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(input)
  );
  return `${input}.${base64UrlEncode(sig)}`;
}

// ── Push-kryptering (RFC 8291 aesgcm) ────────────────────────────────────────

async function krypterPayload(
  melding: string,
  p256dhB64: string,
  authB64: string
): Promise<{ body: Uint8Array; encHeader: string; cryptoKey: string }> {
  const abonnentPublicKey = base64UrlDecode(p256dhB64);
  const abonnentAuth = base64UrlDecode(authB64);

  const efemerPar = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const efemerPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", efemerPar.publicKey));

  const abonnentKey = await crypto.subtle.importKey(
    "raw",
    abonnentPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const deltHemmelighet = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: abonnentKey }, efemerPar.privateKey, 256)
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const hkdfMateriale = await crypto.subtle.importKey("raw", deltHemmelighet, "HKDF", false, ["deriveBits"]);

  const context = new Uint8Array([...abonnentPublicKey, ...efemerPublicKeyRaw]);

  function lagInfo(label: string): Uint8Array {
    const labelBytes = new TextEncoder().encode(label);
    const buf = new Uint8Array(labelBytes.length + 1 + 2 + context.length);
    buf.set(labelBytes);
    buf[labelBytes.length] = 0;
    new DataView(buf.buffer).setUint16(labelBytes.length + 1, context.length, false);
    buf.set(context, labelBytes.length + 3);
    return buf;
  }

  const [cekBits, nonceBits] = await Promise.all([
    crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: abonnentAuth, info: lagInfo("Content-Encoding: aesgcm") },
      hkdfMateriale,
      128
    ),
    crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: abonnentAuth, info: lagInfo("Content-Encoding: nonce") },
      hkdfMateriale,
      96
    ),
  ]);

  const cek = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
  const nonce = new Uint8Array(nonceBits);

  const meldingBytes = new TextEncoder().encode(melding);
  const plaintext = new Uint8Array(2 + meldingBytes.length);
  plaintext.set(meldingBytes, 2);

  const kryptert = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cek, plaintext)
  );

  return {
    body: kryptert,
    encHeader: `salt=${base64UrlEncode(salt)}`,
    cryptoKey: `dh=${base64UrlEncode(efemerPublicKeyRaw)}`,
  };
}

// ── Send push til ett abonnement ──────────────────────────────────────────────

async function sendPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  privateKey: CryptoKey,
  tittel: string,
  tekst: string,
  tag: string
): Promise<void> {
  const origin = new URL(endpoint).origin;
  const jwt = await lagVapidJwt(origin, privateKey);
  const payload = JSON.stringify({ title: tittel, body: tekst, tag });
  const { body, encHeader, cryptoKey } = await krypterPayload(payload, p256dh, auth);

  const svar = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      "Crypto-Key": `p256ecdh=${VAPID_PUBLIC_KEY};${cryptoKey}`,
      "Content-Encoding": "aesgcm",
      "Encryption": encHeader,
      "Content-Type": "application/octet-stream",
      "TTL": "60",
    },
    body,
  });

  if (!svar.ok && svar.status !== 201) {
    console.error(`Push feilet ${svar.status} for ${endpoint}`);
  }
}

// ── Hoved-handler ─────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const naaOslo = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Oslo" })
  );
  const dagStr = `${naaOslo.getFullYear()}-${String(naaOslo.getMonth() + 1).padStart(2, "0")}-${String(naaOslo.getDate()).padStart(2, "0")}`;
  const naaMin = naaOslo.getHours() * 60 + naaOslo.getMinutes();

  const { data: sesjoner, error: sesErr } = await supabase
    .from("scheduled_sessions")
    .select(`
      id, customer_id, planned_duration_h, planned_start_time, scheduled_date,
      customers!inner (short_name, hourly_rate)
    `)
    .eq("status", "planned")
    .eq("scheduled_date", dagStr)
    .not("planned_start_time", "is", null);

  if (sesErr || !sesjoner?.length) return new Response("ok");

  // Finn sesjoner som er nøyaktig 10–11 min inne (matcher ett cron-kjøring)
  const treff = sesjoner.filter((s) => {
    const [h, m] = (s.planned_start_time as string).split(":").map(Number);
    const diff = naaMin - (h * 60 + m);
    return diff >= 10 && diff < 11;
  });

  if (!treff.length) return new Response("ok");

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (!subs?.length) return new Response("ingen abonnenter");

  const privateKey = await importVapidPrivateKey();

  for (const sesjon of treff) {
    // Idempotenssjekk — oppdater kun om sesjonen fortsatt er 'planned'
    const { data: oppdatert } = await supabase
      .from("scheduled_sessions")
      .update({ status: "completed" })
      .eq("id", sesjon.id)
      .eq("status", "planned")
      .select("id");

    if (!oppdatert?.length) continue;

    const userId = subs[0].user_id;
    const varighetH = Number(sesjon.planned_duration_h);
    // deno-lint-ignore no-explicit-any
    const kunde = (sesjon as any).customers;

    await supabase.from("session_log").insert({
      scheduled_session_id: sesjon.id,
      customer_id: sesjon.customer_id,
      session_date: sesjon.scheduled_date,
      actual_duration_h: varighetH,
      hourly_rate_at_time: Number(kunde.hourly_rate),
      status: "pending_invoice",
      note: "Auto-kvittert via geo-push",
      logged_by: userId,
    });

    const tittel = "Auto-kvittert ✓";
    const tekst = `${kunde.short_name} — ${varighetH}t registrert`;
    const tag = `geo-${sesjon.id}`;

    await Promise.all(
      subs.map((sub) =>
        sendPush(sub.endpoint, sub.p256dh, sub.auth, privateKey, tittel, tekst, tag).catch(() => null)
      )
    );
  }

  return new Response("ok");
});
