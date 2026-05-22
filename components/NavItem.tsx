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
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5"
      >
        <Icon
          size={22}
          strokeWidth={1.5}
          style={{
            stroke: aktiv ? "#c9a84c" : "rgba(120,180,120,0.4)",
            fill: "none",
            transition: "stroke 0.15s",
          }}
        />
        <span
          style={{
            fontSize: "10px",
            color: aktiv ? "#c9a84c" : "rgba(120,180,120,0.4)",
            letterSpacing: "0.3px",
            transition: "color 0.15s",
          }}
        >
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all"
      style={{
        background: aktiv ? "rgba(201,168,76,0.10)" : "transparent",
        color: aktiv ? "#c9a84c" : "rgba(168,216,168,0.6)",
        border: aktiv ? "1px solid rgba(201,168,76,0.20)" : "1px solid transparent",
        fontWeight: aktiv ? 500 : 400,
      }}
    >
      <Icon
        size={15}
        strokeWidth={1.5}
        style={{
          stroke: aktiv ? "#c9a84c" : "rgba(120,180,120,0.5)",
          fill: "none",
        }}
      />
      {label}
    </Link>
  );
}
