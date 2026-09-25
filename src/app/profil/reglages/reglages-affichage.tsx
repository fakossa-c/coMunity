"use client";

import { useState, useTransition } from "react";
import { ChoixSegmente } from "@/components/choix-segmente";
import { TitreSection } from "@/components/titre-section";
import type {
  TailleAffichage,
  ThemeAffichage,
} from "@/lib/attributs-affichage";
import { choisirTaille, choisirTheme } from "./actions";

type Props = { taille: TailleAffichage; theme: ThemeAffichage };

/**
 * Taille des caractères et thème : le choix s'applique tout de suite sur la racine du document
 * (avant même la réponse du serveur) et est enregistré sur le profil en arrière-plan.
 */
export function ReglagesAffichage({
  taille: tailleInitiale,
  theme: themeInitial,
}: Props) {
  const [taille, setTaille] = useState(tailleInitiale);
  const [theme, setTheme] = useState(themeInitial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [, demarrer] = useTransition();

  function appliquer(nom: "data-taille" | "data-theme", valeur: string | null) {
    if (valeur) document.documentElement.setAttribute(nom, valeur);
    else document.documentElement.removeAttribute(nom);
  }

  function changerTaille(id: string) {
    const valeur = id as TailleAffichage;
    setTaille(valeur);
    appliquer("data-taille", valeur === "grands" ? "grands" : null);
    setErreur(null);
    demarrer(async () => {
      const resultat = await choisirTaille(valeur);
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  function changerTheme(id: string) {
    const valeur = id as ThemeAffichage;
    setTheme(valeur);
    appliquer("data-theme", valeur === "sombre" ? "sombre" : null);
    setErreur(null);
    demarrer(async () => {
      const resultat = await choisirTheme(valeur);
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex flex-col gap-2.5">
        <TitreSection>Taille des caractères</TitreSection>
        <ChoixSegmente
          libelle="Taille des caractères"
          valeur={taille}
          onChange={changerTaille}
          options={[
            {
              id: "standard",
              libelle: "Standard",
              visuel: (
                <span aria-hidden="true" className="text-[20px] font-extrabold">
                  A
                </span>
              ),
            },
            {
              id: "grands",
              libelle: "Grands",
              visuel: (
                <span aria-hidden="true" className="text-[28px] font-extrabold">
                  A
                </span>
              ),
            },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <TitreSection>Apparence</TitreSection>
        <ChoixSegmente
          libelle="Apparence"
          valeur={theme}
          onChange={changerTheme}
          options={[
            { id: "clair", libelle: "Clair", icone: "light_mode" },
            { id: "sombre", libelle: "Sombre", icone: "dark_mode" },
          ]}
        />
      </div>
      {erreur && (
        <p role="alert" className="text-body-md text-error">
          {erreur}
        </p>
      )}
    </div>
  );
}
