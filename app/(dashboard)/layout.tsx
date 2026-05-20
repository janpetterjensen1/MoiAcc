import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loggUt } from "@/app/actions/auth";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Receipt,
  Calculator,
  BookOpen,
  LogOut,
} from "lucide-react";
import { ProfilKnapp } from "@/components/ProfilKnapp";

const nav = [
  { href: "/dashbord", label: "Dashbord", icon: LayoutDashboard },
  { href: "/kunder", label: "Kunder", icon: Users },
  { href: "/timer", label: "Timer", icon: Clock },
  { href: "/fakturaer", label: "Fakturaer", icon: FileText },
  { href: "/utgifter", label: "Utgifter", icon: Receipt },
  { href: "/skatt", label: "Skatt", icon: Calculator },
  { href: "/regnskap", label: "Regnskap", icon: BookOpen },
];

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

  const { data: profilRaw } = await supabase.from("profiles" as string).select("visningsnavn, avatar_url").eq("id", user.id).single();
  const profil = profilRaw as { visningsnavn: string; avatar_url: string | null } | null;
  const visningsnavn = profil?.visningsnavn ?? "";
  const avatarUrl = profil?.avatar_url ?? null;
  const initial = (visningsnavn || user.email || "?")[0].toUpperCase();

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-56 flex-col fixed inset-y-0 bg-slate-900 text-slate-100">
        <div className="px-5 py-5 border-b border-slate-800">
          <span className="text-lg font-bold tracking-tight">MoiAcc</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Profil + logg ut (sidebar) */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          <Link
            href="/profil"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-slate-600 group-hover:bg-slate-500 overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-slate-700">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-white">{initial}</span>
              )}
            </div>
            <span className="text-sm text-slate-300 group-hover:text-white truncate">
              {visningsnavn || user.email}
            </span>
          </Link>
          <form action={loggUt}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              Logg ut
            </button>
          </form>
        </div>
      </aside>

      {/* Mobilheader */}
      <header className="md:hidden fixed top-0 inset-x-0 z-10 h-14 bg-slate-900 text-white flex items-center justify-between px-4">
        <span className="font-bold text-sm">MoiAcc</span>
        <ProfilKnapp initial={initial} avatarUrl={avatarUrl} visningsnavn={visningsnavn || user.email} />
        <form action={loggUt}>
          <button type="submit" className="p-2 text-slate-300 hover:text-white">
            <LogOut size={18} />
          </button>
        </form>
      </header>

      {/* Mobilnavigasjon */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 bg-slate-900 flex justify-around py-2 border-t border-slate-800">
        {nav.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-slate-400 hover:text-white"
          >
            <Icon size={20} />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Innhold */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
