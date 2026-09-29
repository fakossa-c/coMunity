"use client";

import { useId, useState, useTransition } from "react";
import {
  libelleReponses,
  type AffichageSondage,
  type Sondage as DonneesSondage,
} from "@/lib/sondages";
import type { Resultat } from "@/lib/resultat";
import { Bouton } from "./bouton";
import { Annonce as Message } from "./formulaire";
import { Icone } from "./icone";

type Props = {
  question: DonneesSondage["question"];
  options: DonneesSondage["options"];
  /** La date limite en jour et mois : « 30 octobre ». */
  echeance: string;
  /** Ce que la personne voit : voter, lire, ou les résultats. */
  affichage: AffichageSondage;
  /** Enregistre la réponse : `choix` est le rang de l'option, à partir de 1. */
  onVoter: (choix: number) => Promise<Resultat>;
};

const ligne =
  "relative flex min-h-bouton w-full items-center gap-space-sm overflow-hidden rounded-md border-[1.5px] px-4 text-left text-body-lg text-on-surface desktop:rounded-[18px] desktop:border-transparent desktop:px-5";

/**
 * Sondage à choix unique, à placer dans une `CarteAnnonce` : les options de 56 px, le bouton
 * « Envoyer ma réponse » désactivé tant que rien n'est choisi, puis les résultats en barres
 * vertes avec le choix de la personne coché. Un compte qui ne peut pas répondre lit les options.
 * Sur ordinateur (cadre Journal), les options n'ont plus de contour : la teinte de fond et le
 * pictogramme marquent le choix.
 */
export function Sondage({
  question,
  options,
  echeance,
  affichage,
  onVoter,
}: Props) {
  const [enVote, setEnVote] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const clos = affichage.etat === "resultats" && affichage.clos;

  function enregistrer(choix: number) {
    setErreur(null);
    return onVoter(choix).then((resultat) => {
      if (resultat.ok) {
        setConfirmation(resultat.message);
        setEnVote(false);
      } else setErreur(resultat.message);
    });
  }

  return (
    <div className="flex flex-col gap-space-sm rounded-lg bg-surface-container-low p-space-md desktop:p-6">
      {affichage.etat === "vote" ||
      (affichage.etat === "resultats" && enVote) ? (
        <Vote
          question={question}
          options={options}
          enregistrer={enregistrer}
          erreur={erreur}
        />
      ) : (
        <>
          <p className="font-headline text-body-bold text-on-surface">
            {question}
          </p>
          {affichage.etat === "resultats" ? (
            <Resultats options={options} affichage={affichage} />
          ) : (
            <ul className="flex flex-col gap-space-xs">
              {options.map((libelle, rang) => (
                <li
                  key={rang}
                  className={`${ligne} border-outline bg-fond-carte`}
                >
                  {libelle}
                </li>
              ))}
            </ul>
          )}
          {affichage.etat === "lecture" && (
            <p className="text-body-md text-on-surface-variant">
              Vous pourrez répondre quand le conseil syndical aura validé votre
              compte.
            </p>
          )}
          {affichage.etat === "resultats" && affichage.peutVoter && (
            <Bouton
              variante="contour"
              pleineLargeur
              onClick={() => setEnVote(true)}
            >
              Répondre au sondage
            </Bouton>
          )}
        </>
      )}
      <Message message={confirmation} />
      <p className="text-body-md text-on-surface-variant">
        {affichage.etat === "resultats" &&
          `${libelleReponses(affichage.reponses)} · `}
        {clos ? `Sondage terminé le ${echeance}` : `Jusqu'au ${echeance}`}
      </p>
    </div>
  );
}

function Vote({
  question,
  options,
  enregistrer,
  erreur,
}: {
  question: string;
  options: string[];
  enregistrer: (choix: number) => Promise<void>;
  erreur: string | null;
}) {
  const nom = useId();
  const [choix, setChoix] = useState<number | null>(null);
  const [enCours, demarrer] = useTransition();

  return (
    <form
      className="flex flex-col gap-space-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (choix !== null) demarrer(() => enregistrer(choix));
      }}
    >
      <fieldset className="flex flex-col gap-space-xs">
        <legend className="mb-space-sm font-headline text-body-bold text-on-surface">
          {question}
        </legend>
        {options.map((libelle, rang) => {
          const actif = choix === rang + 1;
          return (
            <label
              key={rang}
              className={`${ligne} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus desktop:transition-colors desktop:duration-(--duree-courte) desktop:ease-journal ${
                actif
                  ? "border-primary bg-fond-action text-texte-action"
                  : "border-outline bg-fond-carte"
              }`}
            >
              <input
                type="radio"
                name={nom}
                value={rang + 1}
                checked={actif}
                onChange={() => setChoix(rang + 1)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <span
                className={actif ? "text-primary" : "text-on-surface-variant"}
              >
                <Icone
                  nom={
                    actif ? "radio_button_checked" : "radio_button_unchecked"
                  }
                  taille={24}
                />
              </span>
              {libelle}
            </label>
          );
        })}
      </fieldset>
      <Message message={erreur} erreur />
      <Bouton type="submit" pleineLargeur disabled={choix === null || enCours}>
        {enCours ? "Envoi…" : "Envoyer ma réponse"}
      </Bouton>
    </form>
  );
}

function Resultats({
  options,
  affichage,
}: {
  options: string[];
  affichage: Extract<AffichageSondage, { etat: "resultats" }>;
}) {
  return (
    <ul
      aria-label="Résultats du sondage"
      className="flex flex-col gap-space-xs"
    >
      {options.map((libelle, rang) => {
        const choisi = affichage.choix === rang + 1;
        const part = affichage.pourcentages[rang];
        return (
          <li
            key={rang}
            className={`${ligne} justify-between ${
              choisi ? "border-primary" : "border-outline"
            } bg-fond-carte`}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-secondary-fixed-dim sombre:bg-secondary-container"
              style={{ width: `${part}%` }}
            />
            <span className="relative flex items-center gap-space-xs">
              {choisi && (
                <span className="text-primary">
                  <Icone nom="check_circle" plein taille={24} />
                  <span className="sr-only">Votre choix : </span>
                </span>
              )}
              {libelle}
            </span>
            <span className="relative font-headline text-body-bold">
              {part} %
            </span>
          </li>
        );
      })}
    </ul>
  );
}
