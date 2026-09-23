"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

const onglets: { href: string; libelle: string; icone: NomIcone }[] = [
  { href: "/", libelle: "Activités", icone: "diversity_3" },
  {
    href: "/mon-evenement",
    libelle: "Mon Événement",
    icone: "event_available",
  },
  { href: "/proposer", libelle: "Proposer", icone: "add_circle" },
  { href: "/voisins-profil", libelle: "Voisins & Profil", icone: "group" },
];

/**
 * Barre d'onglets : en bas de l'écran sur mobile (zone du pouce),
 * sous l'en-tête sur grand écran.
 */
export function NavigationPrincipale() {
  const chemin = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] backdrop-blur-xl desktop:top-20 desktop:bottom-auto desktop:pb-0 desktop:shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
    >
      <ul className="mx-auto grid h-24 max-w-lg grid-cols-4 items-stretch px-1 desktop:h-16 desktop:max-w-[980px] desktop:gap-2 desktop:px-margin-desktop">
        {onglets.map(({ href, libelle, icone }) => {
          const actif = href === "/" ? chemin === "/" : chemin.startsWith(href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={actif ? "page" : undefined}
                className={`flex min-h-[56px] min-w-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-center font-headline text-label-sm transition-colors desktop:flex-row desktop:gap-2 desktop:text-label-md ${
                  actif
                    ? "text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <Icone
                  nom={icone}
                  plein={actif}
                  className="size-7 shrink-0 desktop:size-6"
                />
                <span className="leading-none">{libelle}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
