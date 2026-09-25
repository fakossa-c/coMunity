"use client";

import { useEffect, useState } from "react";
import { Bouton, type VarianteBouton } from "./bouton";
import { Icone } from "./icone";

type Props = {
  texte: string;
  /** « Copier le lien » */
  libelle: string;
  /** « Lien copié » */
  confirmation: string;
  variante?: VarianteBouton;
};

type Etat = "attente" | "copie" | "echec";

/** Durée d'affichage de la confirmation, en ms. */
const DUREE_CONFIRMATION = 4000;

/** Copie `texte` dans le presse-papiers et le confirme sous le bouton. */
export function BoutonCopier({
  texte,
  libelle,
  confirmation,
  variante = "contour",
}: Props) {
  const [etat, setEtat] = useState<Etat>("attente");

  useEffect(() => {
    if (etat !== "copie") return;
    const minuterie = setTimeout(() => setEtat("attente"), DUREE_CONFIRMATION);
    return () => clearTimeout(minuterie);
  }, [etat]);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setEtat("copie");
    } catch {
      setEtat("echec");
    }
  }

  return (
    <div className="flex flex-col gap-space-xs">
      <Bouton variante={variante} icone="content_copy" onClick={copier}>
        {libelle}
      </Bouton>
      <div role="status">
        {etat === "copie" && (
          <p className="flex items-center justify-center gap-space-xs text-body-md font-bold text-secondary">
            <Icone nom="check_circle" plein taille={20} />
            {confirmation}
          </p>
        )}
        {etat === "echec" && (
          <p className="text-center text-body-md text-error">
            La copie n&apos;a pas fonctionné : sélectionnez le texte et
            copiez-le à la main.
          </p>
        )}
      </div>
    </div>
  );
}
