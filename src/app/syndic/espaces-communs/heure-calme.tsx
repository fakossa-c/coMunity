"use client";

import { useState, useTransition } from "react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { Annonce } from "@/components/formulaire";
import type { Resultat } from "@/lib/resultat";
import { reglerHeureCalme } from "./actions";

/**
 * Le réglage de l'heure de calme de la résidence : un champ heure et son bouton ; sur ordinateur,
 * dans une carte au-dessus de la grille des espaces communs.
 */
export function HeureCalme({ actuelle }: { actuelle: string }) {
  const [valeur, setValeur] = useState(actuelle);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => setResultat(await reglerHeureCalme(valeur)));
      }}
      className="flex flex-col gap-space-md desktop:rounded-lg desktop:bg-fond-carte desktop:p-8 desktop:shadow-douce desktop:[&>div:empty]:hidden"
    >
      <Annonce message={resultat?.ok && resultat.message} />
      <Annonce message={resultat?.ok === false && resultat.message} erreur />
      <div className="flex flex-col items-start gap-space-md desktop:flex-row desktop:items-center desktop:gap-8">
        <Champ
          libelle="Heure de calme"
          name="heure_calme"
          type="time"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          aide="Une activité qui finit plus tard reçoit un avertissement de l'assistant."
          required
          className="w-full desktop:max-w-lg"
        />
        <Bouton
          type="submit"
          variante="contour"
          icone="bedtime"
          disabled={enCours}
        >
          {enCours ? "Enregistrement…" : "Enregistrer l'heure"}
        </Bouton>
      </div>
    </form>
  );
}
