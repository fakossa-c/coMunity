"use client";

import { useEffect, useState } from "react";
import { Bouton } from "./bouton";
import { Icone } from "./icone";

/** Durée d'affichage d'une confirmation, en ms : le temps de la lire. */
const DUREE_CONFIRMATION = 4000;

/** Vrai pendant quelques secondes après `confirmer()`, puis faux de nouveau. */
export function useConfirmation() {
  const [confirme, setConfirme] = useState(false);

  useEffect(() => {
    if (!confirme) return;
    const minuterie = setTimeout(() => setConfirme(false), DUREE_CONFIRMATION);
    return () => clearTimeout(minuterie);
  }, [confirme]);

  return [confirme, () => setConfirme(true)] as const;
}

type Props = {
  texte: string;
  /** « Copier le lien » */
  libelle: string;
  /** « Lien copié » */
  confirmation: string;
};

/** Copie `texte` dans le presse-papiers et le confirme sous le bouton. */
export function BoutonCopier({ texte, libelle, confirmation }: Props) {
  const [copie, confirmer] = useConfirmation();
  const [echec, setEchec] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setEchec(false);
      confirmer();
    } catch {
      setEchec(true);
    }
  }

  return (
    <div className="flex flex-col gap-space-xs">
      <Bouton variante="contour" icone="content_copy" onClick={copier}>
        {libelle}
      </Bouton>
      <div role="status">
        {copie && (
          <p className="flex items-center justify-center gap-space-xs text-body-md font-bold text-secondary">
            <Icone nom="check_circle" plein taille={20} />
            {confirmation}
          </p>
        )}
        {echec && (
          <p className="text-center text-body-md text-error">
            La copie n&apos;a pas fonctionné : sélectionnez le texte et
            copiez-le à la main.
          </p>
        )}
      </div>
    </div>
  );
}
