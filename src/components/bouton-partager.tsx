"use client";

import { useConfirmation } from "./bouton-copier";
import { Icone } from "./icone";

type Props = { titre: string; lien: string };

/**
 * « Partager » de la barre de retour : la feuille de partage du téléphone quand il en a une,
 * sinon la copie du lien, confirmée dans le bouton. Sur téléphone, le libellé passe sous le
 * pictogramme pour que la barre tienne sur 360 px à côté de « Se connecter ».
 */
export function BoutonPartager({ titre, lien }: Props) {
  const [copie, confirmer] = useConfirmation();

  async function partager() {
    if (navigator.share) {
      try {
        await navigator.share({ title: titre, url: lien });
      } catch {
        // Feuille de partage refermée sans choix : rien à signaler.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(lien);
      confirmer();
    } catch {
      // Ni partage ni presse-papiers : les boutons de la fiche restent là.
    }
  }

  return (
    <button
      type="button"
      onClick={partager}
      aria-live="polite"
      className="inline-flex min-h-cible shrink-0 flex-col items-center justify-center rounded-full px-2 font-headline text-label-sm text-on-surface transition-transform hover:bg-surface-container-low active:translate-y-0.5 desktop:flex-row desktop:gap-1.5 desktop:px-3.5 desktop:text-label-lg"
    >
      <Icone nom={copie ? "check" : "ios_share"} />
      {copie ? "Lien copié" : "Partager"}
    </button>
  );
}
