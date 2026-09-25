import Link from "next/link";
import type { ReactNode } from "react";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Props = { href: string; icone?: NomIcone; children: ReactNode };

/** Bouton flottant vert, seul vert pastel d'action : au-dessus de la barre du bas, à droite. */
export function BoutonFlottant({ href, icone = "add", children }: Props) {
  return (
    <Link
      href={href}
      className="fixed right-5 bottom-[calc(100px+env(safe-area-inset-bottom))] z-40 inline-flex h-flottant items-center gap-2 rounded-full bg-fond-confirme pr-6 pl-5 font-headline text-label-lg text-texte-confirme shadow-flottant hover:bg-secondary-fixed-dim"
    >
      <Icone nom={icone} taille={28} />
      {children}
    </Link>
  );
}
