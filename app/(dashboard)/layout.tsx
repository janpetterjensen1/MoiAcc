import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loggUt } from "@/app/actions/auth";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { DashboardNav, DashboardNavMobile } from "@/components/DashboardNav";
import { PushVakt } from "@/components/PushVakt";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel) {
    redirect("/login/mfa");
  }

  const { data: profilRaw } = await supabase.from("profiles").select("visningsnavn, avatar_url").eq("id", user.id).single();
  const profil = profilRaw as { visningsnavn: string; avatar_url: string | null } | null;
  const visningsnavn = profil?.visningsnavn ?? "";
  const avatarUrl = profil?.avatar_url ?? null;
  const initial = (visningsnavn || user.email || "?")[0].toUpperCase();

  return (
    <div className="min-h-screen flex relative">
      {/* Ambient glows */}
      <div className="ambient ambient-1" />
      <div className="ambient ambient-2" />
      <div className="ambient ambient-3" />

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-60 flex-col fixed inset-y-0 z-20"
        style={{
          background: "rgba(4,10,4,0.90)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(201,168,76,0.12)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(201,168,76,0.10)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.25)",
              }}
            >
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "15px", color: "#c9a84c" }}>M</span>
            </div>
            <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "16px", color: "rgba(232,213,160,0.92)", letterSpacing: "1px" }}>
              MoiAcc
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <DashboardNav />
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 space-y-0.5" style={{ borderTop: "1px solid rgba(201,168,76,0.10)" }}>
          <Link
            href="/profil"
            className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all"
            style={{ color: "rgba(168,216,168,0.6)" }}
          >
            <div
              className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
              style={{
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.20)",
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "11px", color: "#c9a84c" }}>{initial}</span>
              )}
            </div>
            <span className="text-sm truncate">{visningsnavn || user.email}</span>
          </Link>
          <form action={loggUt}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-all"
              style={{ color: "rgba(120,180,120,0.45)" }}
            >
              <LogOut size={14} />
              Logg ut
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top header — profilbilde øverst til høyre */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between px-4"
        style={{
          height: "52px",
          background: "rgba(4,10,4,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(201,168,76,0.10)",
        }}
      >
        {/* Logo */}
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "15px", color: "#c9a84c", letterSpacing: "1px" }}>
          MoiAcc
        </span>

        {/* Profilbilde */}
        <Link href="/profil">
          <div
            className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              background: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.28)",
              boxShadow: "0 0 12px rgba(201,168,76,0.08)",
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "14px", color: "#c9a84c" }}>{initial}</span>
            )}
          </div>
        </Link>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 flex"
        style={{
          background: "rgba(4,10,4,0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(201,168,76,0.12)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <DashboardNavMobile />
      </nav>

      {/* Push-overvåker — vedlikeholder SW og abonnement */}
      <PushVakt />

      {/* Main content */}
      <main className="flex-1 md:ml-60 pt-[52px] md:pt-0 pb-24 md:pb-0 relative z-10">
        <div className="max-w-2xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
