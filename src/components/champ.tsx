"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Icone } from "./icone";

const saisie =
  "min-h-champ w-full min-w-0 flex-1 rounded-md bg-transparent px-4 font-body text-body-lg text-on-surface";

/** Ce qu'affiche un compteur de caractères : « 12 / 50 caractères ». */
export type CompteurCaracteres = { longueur: number; max: number };

type PropsCadre = {
  id: string;
  libelle: string;
  aide?: string;
  /** Compteur de caractères, sous le champ, à la place de l'aide. */
  compteur?: CompteurCaracteres;
  erreur?: string;
  className?: string;
  /** Contenu de la boîte : la saisie, et le bouton d'affichage d'un mot de passe. */
  children: ReactNode;
};

/** Libellé au-dessus, boîte de 56 px, aide puis erreur en dessous. */
function Cadre({
  id,
  libelle,
  aide,
  compteur,
  erreur,
  className,
  children,
}: PropsCadre) {
  return (
    <div className={`flex flex-col gap-space-xs ${className ?? ""}`}>
      <label htmlFor={id} className="font-headline text-label-lg">
        {libelle}
      </label>
      {/*
       * Écart au design system : la boîte est bordée en `outline` (contraste 4,4:1 sur blanc)
       * plutôt qu'avec le filet de carte à 18 %, trop pâle pour repérer un champ (WCAG 1.4.11, 3:1).
       */}
      <div
        className={`flex items-center rounded-md border-[1.5px] bg-fond-carte text-on-surface ${erreur ? "border-error" : "border-outline"}`}
      >
        {children}
      </div>
      {compteur ? (
        <p
          id={`${id}-aide`}
          className={`text-body-md ${compteur.longueur > compteur.max ? "text-error" : "text-on-surface-variant"}`}
        >
          {compteur.longueur} / {compteur.max} caractères
        </p>
      ) : (
        aide && (
          <p id={`${id}-aide`} className="text-body-md text-on-surface-variant">
            {aide}
          </p>
        )
      )}
      {erreur && (
        <p
          id={`${id}-erreur`}
          role="alert"
          className="font-headline text-label-lg text-error"
        >
          {erreur}
        </p>
      )}
    </div>
  );
}

/** Attributs qui relient la saisie à son aide et à son erreur. */
function liaisons(id: string, decrit: boolean, erreur?: string) {
  const decrite = [decrit && `${id}-aide`, erreur && `${id}-erreur`].filter(
    Boolean,
  );
  return {
    id,
    "aria-describedby": decrite.length > 0 ? decrite.join(" ") : undefined,
    "aria-invalid": erreur ? true : undefined,
  };
}

type PropsChamp = ComponentProps<"input"> & {
  libelle: string;
  /** Texte d'aide sous le champ : « Au moins 6 caractères. » */
  aide?: string;
  /** Compteur de caractères sous le champ, pour un texte court à longueur limitée. */
  compteur?: CompteurCaracteres;
  /** Erreur propre à ce champ, affichée sous lui et annoncée. */
  erreur?: string;
  /** Mot de passe : masqué, avec un bouton « Afficher / Masquer ». */
  secret?: boolean;
};

export function Champ({
  libelle,
  aide,
  compteur,
  erreur,
  secret = false,
  id,
  type = "text",
  className,
  ...props
}: PropsChamp) {
  const idAuto = useId();
  const idChamp = id ?? idAuto;
  const [visible, setVisible] = useState(false);

  return (
    <Cadre
      id={idChamp}
      libelle={libelle}
      aide={aide}
      compteur={compteur}
      erreur={erreur}
      className={className}
    >
      <input
        {...liaisons(idChamp, Boolean(aide ?? compteur), erreur)}
        type={secret ? (visible ? "text" : "password") : type}
        className={saisie}
        {...props}
      />
      {secret && (
        <button
          type="button"
          aria-pressed={visible}
          aria-controls={idChamp}
          onClick={() => setVisible(!visible)}
          className="m-0.5 flex min-h-cible shrink-0 items-center gap-1.5 rounded-md px-3 font-headline text-label-sm text-on-surface-variant hover:bg-surface-container-low"
        >
          <Icone nom={visible ? "visibility_off" : "visibility"} taille={22} />
          {visible ? "Masquer" : "Afficher"}
          <span className="sr-only"> : {libelle}</span>
        </button>
      )}
    </Cadre>
  );
}

type PropsChampListe = ComponentProps<"select"> & {
  libelle: string;
  aide?: string;
  erreur?: string;
};

/** Liste fermée : liste déroulante native, à l'allure d'un `Champ`. */
export function ChampListe({
  libelle,
  aide,
  erreur,
  id,
  className,
  ...props
}: PropsChampListe) {
  const idAuto = useId();
  const idChamp = id ?? idAuto;
  return (
    <Cadre
      id={idChamp}
      libelle={libelle}
      aide={aide}
      erreur={erreur}
      className={className}
    >
      <select
        {...liaisons(idChamp, Boolean(aide), erreur)}
        className={`${saisie} cursor-pointer`}
        {...props}
      />
    </Cadre>
  );
}

type PropsChampTexte = ComponentProps<"textarea"> & {
  libelle: string;
  aide?: string;
  compteur?: CompteurCaracteres;
  erreur?: string;
};

/** Texte sur plusieurs lignes, à l'allure d'un `Champ` : mot d'accueil, conseils pratiques. */
export function ChampTexte({
  libelle,
  aide,
  compteur,
  erreur,
  id,
  rows = 3,
  className,
  ...props
}: PropsChampTexte) {
  const idAuto = useId();
  const idChamp = id ?? idAuto;
  return (
    <Cadre
      id={idChamp}
      libelle={libelle}
      aide={aide}
      compteur={compteur}
      erreur={erreur}
      className={className}
    >
      <textarea
        {...liaisons(idChamp, Boolean(aide ?? compteur), erreur)}
        rows={rows}
        className={`${saisie} resize-y py-3`}
        {...props}
      />
    </Cadre>
  );
}
