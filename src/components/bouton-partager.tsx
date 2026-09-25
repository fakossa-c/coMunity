"use client";

import { useEffect, useState } from "react";
import { Bouton } from "./bouton";

type Props = { titre: string; lien: string };

/**
 * « Partager » de la barre de retour : la feuille de partage du téléphone quand il en a une,
 * sinon la copie du lien, confirmée dans le bouton.
 */
export function BoutonPartager({ titre, lien }: Props) {
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    if (!copie) return;
    const minuterie = setTimeout(() => setCopie(false), 4000);
    return () => clearTimeout(minuterie);
  }, [copie]);

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
      setCopie(true);
    } catch {
      // Ni partage ni presse-papiers : les boutons de la fiche restent là.
    }
  }

  return (
    <Bouton
      variante="fantome"
      icone={copie ? "check" : "ios_share"}
      onClick={partager}
      aria-live="polite"
    >
      {copie ? "Lien copié" : "Partager"}
    </Bouton>
  );
}
