"use client";

import { useState, useTransition } from "react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { Annonce } from "@/components/formulaire";
import type { Resultat } from "@/lib/resultat";
import { reglerHeureCalme } from "./actions";

/** Le réglage de l'heure de calme de la résidence : un champ heure et son bouton. */
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
      className="flex flex-col gap-space-md"
    >
      <Annonce message={resultat?.ok && resultat.message} />
      <Annonce message={resultat?.ok === false && resultat.message} erreur />
      <div className="flex flex-col gap-space-md desktop:flex-row desktop:items-end">
        <Champ
          libelle="Heure de calme"
          name="heure_calme"
          type="time"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          aide="Une activité qui finit plus tard reçoit un avertissement de l'assistant."
          required
          className="flex-1"
        />
        <Bouton
          type="submit"
          variante="contour"
          icone="bedtime"
          disabled={enCours}
          className="desktop:mb-[34px]"
        >
          {enCours ? "Enregistrement…" : "Enregistrer l'heure"}
        </Bouton>
      </div>
    </form>
  );
}
