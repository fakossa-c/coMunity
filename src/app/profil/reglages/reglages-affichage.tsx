"use client";

import { useState, useTransition } from "react";
import { ChoixSegmente } from "@/components/choix-segmente";
import { TitreSection } from "@/components/titre-section";
import type {
  TailleAffichage,
  ThemeAffichage,
} from "@/lib/attributs-affichage";
import type { PageArrivee } from "@/lib/page-arrivee";
import type { Resultat } from "@/lib/resultat";
import { choisirPageArrivee, choisirTaille, choisirTheme } from "./actions";

type Props = {
  taille: TailleAffichage;
  theme: ThemeAffichage;
  /** Réservé à un membre actif du conseil syndical : sans valeur, le choix n'apparaît pas. */
  pageArrivee?: PageArrivee;
};

/**
 * Taille des caractères et thème : le choix s'applique tout de suite sur la racine du document
 * (avant même la réponse du serveur) et est enregistré sur le profil en arrière-plan. La page
 * d'arrivée d'un membre du conseil syndical s'enregistre de la même façon.
 */
export function ReglagesAffichage({
  taille: tailleInitiale,
  theme: themeInitial,
  pageArrivee: pageArriveeInitiale,
}: Props) {
  const [taille, setTaille] = useState(tailleInitiale);
  const [theme, setTheme] = useState(themeInitial);
  const [pageArrivee, setPageArrivee] = useState(pageArriveeInitiale);
  const [erreur, setErreur] = useState<string | null>(null);
  const [, demarrer] = useTransition();

  function appliquer(nom: "data-taille" | "data-theme", valeur: string | null) {
    if (valeur) document.documentElement.setAttribute(nom, valeur);
    else document.documentElement.removeAttribute(nom);
  }

  function enregistrer(action: () => Promise<Resultat>) {
    setErreur(null);
    demarrer(async () => {
      const resultat = await action();
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  function changerTaille(valeur: TailleAffichage) {
    setTaille(valeur);
    appliquer("data-taille", valeur === "grands" ? "grands" : null);
    enregistrer(() => choisirTaille(valeur));
  }

  function changerTheme(valeur: ThemeAffichage) {
    setTheme(valeur);
    appliquer("data-theme", valeur === "sombre" ? "sombre" : null);
    enregistrer(() => choisirTheme(valeur));
  }

  function changerPageArrivee(valeur: PageArrivee) {
    setPageArrivee(valeur);
    enregistrer(() => choisirPageArrivee(valeur));
  }

  return (
    <div className="flex flex-col gap-bloc">
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
      {pageArrivee && (
        <div className="flex flex-col gap-2.5">
          <TitreSection>Page d&apos;arrivée</TitreSection>
          <ChoixSegmente
            libelle="Page d'arrivée"
            valeur={pageArrivee}
            onChange={changerPageArrivee}
            options={[
              {
                id: "tableau_de_bord",
                libelle: "Tableau de bord",
                icone: "monitoring",
              },
              { id: "accueil", libelle: "Accueil", icone: "home" },
            ]}
          />
          <p className="text-body-md text-on-surface-variant">
            La page qui s&apos;ouvre après la connexion.
          </p>
        </div>
      )}
      {erreur && (
        <p role="alert" className="text-body-md text-error">
          {erreur}
        </p>
      )}
    </div>
  );
}
