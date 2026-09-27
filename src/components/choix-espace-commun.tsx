"use client";

import { useId, type ReactNode } from "react";
import { resumeEspace, type EspaceCommun } from "@/lib/espaces-communs";
import { LIEU_LIBRE } from "@/lib/proposition-activite";
import { EquipementsEspace } from "./equipements-espace";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Props = {
  espaces: EspaceCommun[];
  /** L'identifiant de l'espace choisi, `LIEU_LIBRE` pour « Autre », `""` avant tout choix. */
  valeur: string;
  onChange: (valeur: string) => void;
  erreur?: string;
};

/**
 * Le choix du lieu d'une activité : les espaces communs de la résidence, avec leur capacité,
 * leur heure limite et leurs badges, puis « Autre » en fin de liste pour un lieu libre. Chaque
 * option est une carte ; choisie, elle passe au pêche plein avec sa pastille radio remplie.
 */
export function ChoixEspaceCommun({
  espaces,
  valeur,
  onChange,
  erreur,
}: Props) {
  const nom = useId();
  const idErreur = `${nom}-erreur`;

  return (
    <fieldset
      aria-describedby={erreur ? idErreur : undefined}
      className="flex flex-col gap-space-sm"
    >
      <legend className="mb-space-xs font-headline text-label-lg">
        Où se tient l&apos;activité ?
      </legend>
      {espaces.map((espace) => (
        <Option
          key={espace.id}
          nom={nom}
          valeur={espace.id}
          choisie={valeur === espace.id}
          onChange={onChange}
          icone="meeting_room"
          titre={espace.nom}
          detail={resumeEspace(espace)}
        >
          <EquipementsEspace equipements={espace.equipements} />
        </Option>
      ))}
      <Option
        nom={nom}
        valeur={LIEU_LIBRE}
        choisie={valeur === LIEU_LIBRE}
        onChange={onChange}
        icone="edit_location_alt"
        titre="Autre"
        detail="Chez vous, ailleurs dans la résidence ou dans le quartier."
      />
      {erreur && (
        <p
          id={idErreur}
          role="alert"
          className="font-headline text-label-lg text-error"
        >
          {erreur}
        </p>
      )}
    </fieldset>
  );
}

function Option({
  nom,
  valeur,
  choisie,
  onChange,
  icone,
  titre,
  detail,
  children,
}: {
  nom: string;
  valeur: string;
  choisie: boolean;
  onChange: (valeur: string) => void;
  icone: NomIcone;
  titre: string;
  detail: string;
  /** Sous la carte, hors du libellé : les badges de l'espace. */
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative flex flex-col gap-space-xs rounded-md p-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
        choisie
          ? "bg-fond-action text-texte-action"
          : "border-[1.5px] border-bordure-carte bg-fond-carte text-on-surface"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-space-sm">
        <input
          type="radio"
          name={nom}
          value={valeur}
          checked={choisie}
          onChange={() => onChange(valeur)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <Icone
          nom={choisie ? "radio_button_checked" : "radio_button_unchecked"}
          taille={24}
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5 font-headline text-label-lg [overflow-wrap:anywhere]">
            <Icone nom={icone} taille={22} />
            {titre}
          </span>
          <span
            className={`text-body-md ${choisie ? "" : "text-on-surface-variant"}`}
          >
            {detail}
          </span>
        </span>
      </label>
      {/* Aligné sous le libellé : la pastille radio (24 px) et son écart. */}
      {children && (
        <div className="pl-[calc(24px+var(--spacing-space-sm))]">
          {children}
        </div>
      )}
    </div>
  );
}
