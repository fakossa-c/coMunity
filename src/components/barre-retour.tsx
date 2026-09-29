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

/**
 * Barre du haut des pages secondaires du mobile, collée en haut quand la page défile. Sur
 * ordinateur, la barre du haut du cadre Journal la remplace ; `LienRetour` garde le retour.
 */
export function BarreRetour({ href, libelle, partager, compte }: Props) {
  return (
    <header className="sticky top-0 z-30 bg-fond-page pt-[env(safe-area-inset-top)] desktop:hidden">
      {/* Marges resserrées : Retour, Partager et Se connecter tiennent ensemble sur 360 px. */}
      <div className="mx-auto flex min-h-[4.5rem] max-w-conteneur items-center justify-between gap-1 px-2">
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

/**
 * Lien « Retour » d'une page secondaire sur ordinateur, en tête du contenu, sous la barre du haut
 * du cadre Journal, avec « Partager » à l'autre bout. Sur mobile, la barre de retour le porte.
 */
export function LienRetour({
  href,
  libelle,
  partager,
}: Pick<Props, "href" | "libelle" | "partager">) {
  return (
    <div className="mb-space-md hidden items-center justify-between gap-space-sm desktop:flex">
      <Link
        href={href}
        className={`${classesBouton("fantome")} bg-surface-container-low pr-5 hover:bg-surface-container`}
      >
        <Icone nom="arrow_back" taille={24} />
        {libelle}
      </Link>
      {partager}
    </div>
  );
}
