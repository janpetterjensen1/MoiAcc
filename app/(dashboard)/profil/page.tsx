import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfilSkjema } from "@/components/ProfilSkjema";
import { GeoSjekkToggle } from "@/components/GeoSjekkToggle";
import { PushVarselKnapp } from "@/components/PushVarselKnapp";

export default async function ProfilSide() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type Profil = {
    visningsnavn: string;
    tittel: string;
    telefon: string;
    avatar_url: string | null;
    org_number: string | null;
    bank_account: string | null;
    iban: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    invoice_email: string | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profil } = await (supabase as any).from("profiles").select("*").eq("id", user.id).single() as { data: Profil | null; error: unknown };

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Profil</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <ProfilSkjema
          userId={user.id}
          email={user.email ?? ""}
          visningsnavn={profil?.visningsnavn ?? ""}
          tittel={profil?.tittel ?? ""}
          telefon={profil?.telefon ?? ""}
          avatarUrl={profil?.avatar_url ?? null}
          orgNumber={profil?.org_number ?? ""}
          bankAccount={profil?.bank_account ?? ""}
          iban={profil?.iban ?? ""}
          address={profil?.address ?? ""}
          postalCode={profil?.postal_code ?? ""}
          city={profil?.city ?? ""}
          invoiceEmail={profil?.invoice_email ?? ""}
        />
        <GeoSjekkToggle />
        <PushVarselKnapp />
      </div>
    </div>
  );
}
