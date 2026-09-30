"use client";

import { useId, useRef, useState } from "react";
import { compresserImage } from "@/lib/compression-image";
import { texteAlternatifPlan } from "@/lib/photo-espace-commun";
import { Bouton } from "./bouton";
import { EmplacementPhoto } from "./emplacement-photo";

/**
 * Le plan de situation d'un espace commun dans le formulaire : déjà enregistré (`chemin`) ou choisi
 * à l'instant, déjà compressé et prêt à partir (`fichier`). `apercu` est l'adresse qui l'affiche,
 * vide quand celle d'un plan enregistré n'a pas pu être signée.
 */
export type PlanEspaceSaisie = {
  apercu: string;
  chemin?: string;
  fichier?: Blob;
};

type Props = {
  plan: PlanEspaceSaisie | null;
  /** Le nom saisi, repris dans le texte alternatif de l'aperçu. */
  nom: string;
  onChoisir: (plan: PlanEspaceSaisie) => void;
  onRetirer: () => void;
};

/**
 * Le choix du plan de situation d'un espace commun, facultatif : compressé dans le navigateur dès
 * qu'il est choisi, envoyé à l'enregistrement du formulaire. Choisir un autre plan remplace le
 * premier ; « Retirer le plan » le supprime.
 */
export function ChampPlanEspace({ plan, nom, onChoisir, onRetirer }: Props) {
  const id = useId();
  // Changer la clé vide le sélecteur : rechoisir la même image après l'avoir retirée déclenche `onChange`.
  const [cleSelecteur, setCleSelecteur] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  // Reçoit le focus quand « Retirer le plan » disparaît avec le plan : le lecteur d'écran lit le nouvel état.
  const etat = useRef<HTMLParagraphElement>(null);

  async function choisir(fichier: File | undefined) {
    if (!fichier) return;
    setErreur("");
    setEnCours(true);
    try {
      const compresse = await compresserImage(fichier);
      onChoisir({ apercu: URL.createObjectURL(compresse), fichier: compresse });
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Cette image n'a pas pu être lue.",
      );
    }
    setCleSelecteur((cle) => cle + 1);
    setEnCours(false);
  }

  return (
    <fieldset className="flex flex-col gap-space-sm">
      <legend className="font-headline text-label-lg">Plan de situation</legend>
      <p id={`${id}-aide`} className="text-body-md text-on-surface-variant">
        Facultatif. Une image du plan qui montre où se trouve l&apos;espace
        commun : les voisins la voient sur sa fiche, dans Ma copro.
      </p>
      <p
        ref={etat}
        tabIndex={-1}
        role="status"
        className="font-headline text-body-bold outline-none"
      >
        {enCours
          ? "Préparation du plan…"
          : plan
            ? "Un plan"
            : "Aucun plan pour l'instant."}
      </p>
      {plan && (
        <EmplacementPhoto
          src={plan.apercu || undefined}
          alt={texteAlternatifPlan(nom.trim() || "cet espace commun")}
          arrondi
        />
      )}
      <div className="flex flex-col gap-space-xs">
        <label htmlFor={id} className="font-headline text-label-lg">
          {plan ? "Remplacer le plan" : "Ajouter un plan"}
        </label>
        <input
          key={cleSelecteur}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={`${id}-aide`}
          disabled={enCours}
          onChange={(e) => choisir(e.target.files?.[0])}
          className="min-h-champ w-full rounded-md border-[1.5px] border-outline bg-fond-carte px-4 py-2 font-body text-body-lg text-on-surface file:mr-3 file:min-h-cible file:cursor-pointer file:rounded-full file:border-0 file:bg-fond-action file:px-4 file:font-headline file:text-label-lg file:text-texte-action disabled:opacity-50"
        />
      </div>
      {plan && (
        <div>
          <Bouton
            variante="fantome"
            icone="close"
            iconeTaille={22}
            onClick={() => {
              onRetirer();
              etat.current?.focus();
            }}
            disabled={enCours}
          >
            Retirer le plan
          </Bouton>
        </div>
      )}
      {erreur && (
        <p role="alert" className="font-headline text-label-lg text-error">
          {erreur}
        </p>
      )}
    </fieldset>
  );
}
