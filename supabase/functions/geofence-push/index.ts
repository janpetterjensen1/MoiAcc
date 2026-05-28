/**
 * geofence-push — Supabase Edge Function
 *
 * Kjøres hvert minutt via pg_cron.
 * Finner sesjoner der sjekktidspunktet er nådd (planned_start_time + 10 min),
 * og sender VAPID Web Push til alle push-subscriptions tilknyttet service-role-brukeren.
 *
 * Deploy: supabase functions deploy geofence-push
 * Cron (SQL):
 *   select cron.schedule(
 *     'geofence-push-minutt',
 *     '* * * * *',
 *     $$select net.http_post(
 *       url:='https://eptastodjhyanomzauti.supabase.co/functions/v1/geofence-push',
 *       headers:='{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
 *       body:='{}'::jsonb
 *     )$$
 *   );
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@example.com";

// Antall minutter etter sesjonstart for geo-sjekk
const SJEKK_MINUTTER = 10;

// ── VAPID helpers (Web Crypto API — Deno native) ─────────────────────────────

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
    "pkcs8",
    privBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, sigInput);

  return `${header}.${payload}.${base64UrlEncode(sig)}`;
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; data?: Record<string, string> }
) {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await lagVapidJwt(audience);

  // Krypter payload med ECDH (content-encryption)
  // Bruker Web Push content encryption: https://www.rfc-editor.org/rfc/rfc8291
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  // Generer ephemeral key pair
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const ephemeralPubRaw = await crypto.subtle.exportKey("raw", ephemeral.publicKey);

  // Importer mottakers p256dh-nøkkel
  const receiverPub = await crypto.subtle.importKey(
    "raw",
    base64UrlDecode(sub.p256dh),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverPub },
    ephemeral.privateKey,
    256
  );

  const authSecret = base64UrlDecode(sub.auth);

  // HKDF for content encryption key and nonce (RFC 8291)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const ikm = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveBits"]);

  // PRK
  const prkInfo = new Uint8Array([
    ...new TextEncoder().encode("WebPush: info\x00"),
    ...base64UrlDecode(sub.p256dh),
    ...new Uint8Array(ephemeralPubRaw),
  ]);
  const prk = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: prkInfo },
    ikm,
    256
  );

  const prkKey = await crypto.subtle.importKey("raw", prk, "HKDF", false, ["deriveBits"]);

  // CEK
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\x00");
  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    prkKey,
    128
  );

  // Nonce
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\x00");
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    prkKey,
    96
  );

  // Encrypt
  const aesKey = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
  const nonce = new Uint8Array(nonceBits);

  // Add padding delimiter (0x02)
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 0x02;

  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded);

  // Build aes128gcm content (RFC 8188)
  const rs = 4096;
  const keyid = new Uint8Array(ephemeralPubRaw);
  const header = new Uint8Array(21 + keyid.length);
  header.set(salt, 0); // 16 bytes salt
  new DataView(header.buffer).setUint32(16, rs, false); // 4 bytes rs
  header[20] = keyid.length; // 1 byte keyid length
  header.set(keyid, 21); // keyid

  const body = new Uint8Array(header.length + ciphertext.byteLength);
  body.set(header, 0);
  body.set(new Uint8Array(ciphertext), header.length);

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

// ── Hovedlogikk ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Norsk dato/tid
  const now = new Date();
  const dagStr = now.toISOString().slice(0, 10);

  // Nåværende tid i HH:MM
  const nowH = now.getUTCHours() + 1; // UTC+1 (CET) — juster ved sommerTid (+2)
  // For korrekt tid: bruk faktisk norsk tid fra et tidssone-bibliotek eller beregn offset
  // Enkel tilnærming: bruk epoch og sjekk med minutt-granularitet
  const nowMinutt = now.getUTCHours() * 60 + now.getUTCMinutes() + 60; // CET (+1)
  // Sommertid (CEST = UTC+2): manuell sjekk
  const maaned = now.getUTCMonth() + 1;
  const erSommertid = maaned >= 3 && maaned <= 10; // grov sjekk
  const offsetMin = erSommertid ? 120 : 60;
  const lokalMinutt = (now.getUTCHours() * 60 + now.getUTCMinutes() + offsetMin) % (24 * 60);

  // Finn sesjoner der sjekktidspunktet er akkurat nå (±1 minutt)
  // planned_start_time + SJEKK_MINUTTER == lokalMinutt
  const { data: sesjoner } = await supabase
    .from("scheduled_sessions")
    .select(`
      id, customer_id, planned_start_time, planned_duration_h,
      customers!inner(short_name, lat, lng)
    `)
    .eq("scheduled_date", dagStr)
    .in("status", ["planned", "completed"])
    .not("planned_start_time", "is", null);

  if (!sesjoner || sesjoner.length === 0) {
    return new Response(JSON.stringify({ sendt: 0, melding: "Ingen sesjoner i dag" }));
  }

  // Filtrer på sesjoner der sjekktid er innenfor dette minuttet
  const aktuelle = (sesjoner as Array<{
    id: string;
    customer_id: string;
    planned_start_time: string;
    planned_duration_h: number;
    customers: { short_name: string; lat: number; lng: number };
  }>).filter((s) => {
    const [h, m] = s.planned_start_time.split(":").map(Number);
    const startMin = h * 60 + m;
    const sjekkMin = startMin + SJEKK_MINUTTER;
    // Innenfor dette minuttet
    return Math.abs(sjekkMin - lokalMinutt) < 1;
  });

  if (aktuelle.length === 0) {
    return new Response(JSON.stringify({
      sendt: 0,
      melding: "Ingen sesjoner å sjekke nå",
      lokalMinutt,
      sesjoner: (sesjoner as Array<{ planned_start_time: string; id: string }>).map((s) => {
        const [h, m] = s.planned_start_time.split(":").map(Number);
        return { id: s.id, planned_start_time: s.planned_start_time, sjekkMin: h * 60 + m + SJEKK_MINUTTER };
      }),
    }));
  }

  // Sjekk om disse sesjonene allerede er kvittert
  const sessionIds = aktuelle.map((s) => s.id);
  const { data: logg } = await supabase
    .from("session_log")
    .select("scheduled_session_id, note")
    .in("scheduled_session_id", sessionIds)
    .eq("session_date", dagStr);

  const bekreftetIds = new Set(
    (logg ?? [])
      .filter((l) => !l.note?.startsWith("__prebilled__"))
      .map((l) => l.scheduled_session_id as string)
  );

  const ukvitterte = aktuelle.filter((s) => !bekreftetIds.has(s.id));

  if (ukvitterte.length === 0) {
    return new Response(JSON.stringify({ sendt: 0, melding: "Alle sesjoner allerede kvittert" }));
  }

  // Hent alle push-subscriptions (alle brukere med tilgang)
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sendt: 0, melding: "Ingen push-subscriptions" }));
  }

  let sendt = 0;
  for (const sesjon of ukvitterte) {
    const tittel = `MoiAcc — ${sesjon.customers.short_name}`;
    const body = `Åpne appen — lokasjonen sjekkes og timen kvitteres automatisk.`;

    for (const sub of subs) {
      try {
        const status = await sendPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title: tittel, body, data: { sesjonId: sesjon.id } }
        );
        if (status < 300) sendt++;
      } catch (e) {
        console.error("Push feilet:", e);
      }
    }
  }

  return new Response(
    JSON.stringify({ sendt, sesjoner: ukvitterte.map((s) => s.customers.short_name) }),
    { headers: { "Content-Type": "application/json" } }
  );
});
