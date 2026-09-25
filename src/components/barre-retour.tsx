import Link from "next/link";
import type { ReactNode } from "react";
import { classesBouton } from "./bouton";
import { Icone } from "./icone";

type Props = {
  href: string;
  /** Nomme la destination (« Accueil », « Profil ») ou l'effet (« Annuler »). */
  libelle: string;
  /** Bouton « Partager » d'une fiche. */
  partager?: ReactNode;
  /** Avatar de la personne connectée, ou « Se connecter ». */
  compte?: ReactNode;
};

/** Barre du haut des pages secondaires, collée en haut quand la page défile. */
export function BarreRetour({ href, libelle, partager, compte }: Props) {
  return (
    <header className="sticky top-0 z-30 bg-fond-page pt-[env(safe-area-inset-top)]">
      {/* Marges resserrées : Retour, Partager et Se connecter tiennent ensemble sur 360 px. */}
      <div className="mx-auto flex min-h-[4.5rem] max-w-[980px] items-center justify-between gap-1 px-2 desktop:px-margin-desktop">
        <Link href={href} className={`${classesBouton("fantome")} px-2.5!`}>
          <Icone nom="arrow_back" taille={28} />
          {libelle}
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          {partager}
          {compte}
        </div>
      </div>
    </header>
  );
}
