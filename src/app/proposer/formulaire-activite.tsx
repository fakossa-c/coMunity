"use client";

import { useState, useTransition } from "react";
import { Champ, ChampListe } from "@/components/champ";
import { Annonce, BoutonEnvoi } from "@/components/formulaire";
import {
  categoriesActivite,
  categoriesActiviteListe,
  pictogrammeDe,
  type CategorieActivite,
} from "@/lib/categories-activite";
import type { Resultat } from "@/lib/resultat";
import { publier } from "./actions";

const CATEGORIE_INITIALE = categoriesActiviteListe[0];

export function FormulaireActivite() {
  const [categorie, setCategorie] =
    useState<CategorieActivite>(CATEGORIE_INITIALE);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();

  function envoyer(donnees: FormData) {
    const titre = String(donnees.get("titre") ?? "");
    const dateActivite = String(donnees.get("date_activite") ?? "");
    const heureDebut = String(donnees.get("heure_debut") ?? "");
    const heureFin = String(donnees.get("heure_fin") ?? "");
    const lieu = String(donnees.get("lieu") ?? "");
    const description = String(donnees.get("description") ?? "");

    if (heureFin <= heureDebut) {
      setResultat({
        ok: false,
        message: "L'heure de fin doit être après l'heure de début.",
      });
      return;
    }

    // Publiée, l'activité mène à son écran de partage : seul un échec revient ici.
    demarrer(async () => {
      const issue = await publier({
        titre,
        categorie,
        pictogramme: pictogrammeDe(categorie),
        description,
        date_activite: dateActivite,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        lieu,
      });
      setResultat(issue);
    });
  }

  return (
    <form action={envoyer} className="flex flex-col gap-space-lg">
      <Annonce message={resultat?.ok === false && resultat.message} erreur />

      <Champ
        libelle="Titre de l'activité"
        name="titre"
        maxLength={50}
        required
        aide="50 caractères maximum."
      />

      <ChampListe
        libelle="Catégorie"
        value={categorie}
        onChange={(e) => setCategorie(e.target.value as CategorieActivite)}
      >
        {categoriesActiviteListe.map((clef) => (
          <option key={clef} value={clef}>
            {categoriesActivite[clef].libelle}
          </option>
        ))}
      </ChampListe>

      <div className="flex flex-col gap-space-xs">
        <label htmlFor="description" className="font-headline text-label-lg">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="w-full rounded-md border-2 border-border-distinct bg-surface-container-lowest p-4 text-body-lg text-on-surface"
        />
      </div>

      <Champ libelle="Date" name="date_activite" type="date" required />

      <div className="flex flex-col gap-space-md desktop:flex-row">
        <Champ
          libelle="Heure de début"
          name="heure_debut"
          type="time"
          required
          className="flex-1"
        />
        <Champ
          libelle="Heure de fin"
          name="heure_fin"
          type="time"
          required
          className="flex-1"
        />
      </div>

      <Champ
        libelle="Lieu"
        name="lieu"
        required
        aide="Par exemple : cour intérieure, salle commune."
      />

      <BoutonEnvoi enCours="Publication…" disabled={enCours}>
        Publier l&apos;activité
      </BoutonEnvoi>
    </form>
  );
}
