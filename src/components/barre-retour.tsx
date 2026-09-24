import Link from "next/link";
import type { ReactNode } from "react";
import { classesBouton } from "./bouton";
import { Icone } from "./icone";

type Props = {
  href: string;
  /** Nomme la destination (« Accueil », « Profil ») ou l'effet (« Annuler »). */
  libelle: string;
  /** Avatar de la personne connectée, ou « Se connecter ». */
  compte?: ReactNode;
};

/** Barre du haut des pages secondaires, collée en haut quand la page défile. */
export function BarreRetour({ href, libelle, compte }: Props) {
  return (
    <header className="sticky top-0 z-30 bg-fond-page pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-[4.5rem] max-w-[980px] items-center justify-between gap-space-sm px-3 desktop:px-margin-desktop">
        <Link href={href} className={classesBouton("fantome")}>
          <Icone nom="arrow_back" taille={28} />
          {libelle}
        </Link>
        {compte}
      </div>
    </header>
  );
}
