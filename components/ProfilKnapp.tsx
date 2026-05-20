"use client";

import Link from "next/link";

interface Props {
  initial: string;
  avatarUrl?: string | null;
  visningsnavn?: string | null;
}

export function ProfilKnapp({ initial, avatarUrl, visningsnavn }: Props) {
  return (
    <Link
      href="/profil"
      title={visningsnavn ?? "Profil"}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-600 hover:bg-slate-500 transition-colors overflow-hidden ring-2 ring-slate-700 hover:ring-slate-400"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={visningsnavn ?? "Profil"}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="text-xs font-semibold text-white">{initial}</span>
      )}
    </Link>
  );
}
