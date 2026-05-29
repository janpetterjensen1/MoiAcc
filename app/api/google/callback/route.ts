import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI ?? "https://moiacc-jan-petter-s-projects.vercel.app/api/google/callback";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code    = searchParams.get("code");
  const userId  = searchParams.get("state");
  const errParam = searchParams.get("error");

  if (errParam || !code || !userId) {
    return NextResponse.redirect(
      new URL("/kalender?google=feil", req.url)
    );
  }

  // Bytt autorisasjonskode mot tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    return NextResponse.redirect(new URL("/kalender?google=feil", req.url));
  }

  // Hent brukers Google-e-post
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json();

  // Lagre tokens med service role (siden vi er i callback uten session-cookie ennå)
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase
    .from("google_calendar_tokens")
    .upsert(
      {
        user_id:       userId,
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at:    new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope:         tokens.scope,
        email:         profile.email ?? null,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  return NextResponse.redirect(new URL("/kalender?google=ok", req.url));
}
