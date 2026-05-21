"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface Props {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile?: boolean;
}

export function NavItem({ href, label, icon: Icon, mobile }: Props) {
  const pathname = usePathname();
  const aktiv = pathname === href || (href !== "/dashbord" && pathname.startsWith(href));

  if (mobile) {
    return (
      <Link
        href={href}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 shrink-0 transition-colors ${
          aktiv ? "text-white" : "text-slate-400 hover:text-white"
        }`}
      >
        <div className={`rounded-lg p-1 transition-colors ${aktiv ? "bg-slate-700" : ""}`}>
          <Icon size={18} />
        </div>
        <span className={`text-[9px] font-medium ${aktiv ? "text-white" : ""}`}>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        aktiv
          ? "bg-slate-700 text-white font-medium"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}
