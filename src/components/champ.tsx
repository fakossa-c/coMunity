"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Icone } from "./icone";

/*
 * Écart au design system : la boîte du champ est bordée en `outline` (contraste 4,4:1 sur blanc)
 * plutôt qu'avec le filet de carte à 18 %, trop pâle pour repérer un champ (WCAG 1.4.11, 3:1).
 */
const boite =
  "flex items-center rounded-md border-[1.5px] bg-fond-carte text-on-surface";
const saisie =
  "min-h-champ w-full min-w-0 flex-1 rounded-md bg-transparent px-4 font-body text-body-lg text-on-surface";

type PropsCadre = {
  id: string;
  libelle: string;
  aide?: string;
  erreur?: string;
  className?: string;
  children: ReactNode;
};

/** Libellé au-dessus, boîte de 56 px, aide puis erreur en dessous. */
function Cadre({ id, libelle, aide, erreur, className, children }: PropsCadre) {
  return (
    <div className={`flex flex-col gap-space-xs ${className ?? ""}`}>
      <label htmlFor={id} className="font-headline text-label-lg">
        {libelle}
      </label>
      {children}
      {aide && (
        <p id={`${id}-aide`} className="text-body-md text-on-surface-variant">
          {aide}
        </p>
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

/** Identifiants des textes qui décrivent le champ : son aide, puis son erreur. */
function descriptions(id: string, aide?: string, erreur?: string) {
  const ids = [aide && `${id}-aide`, erreur && `${id}-erreur`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

type PropsChamp = ComponentProps<"input"> & {
  libelle: string;
  /** Texte d'aide sous le champ : « Au moins 6 caractères. » */
  aide?: string;
  /** Erreur propre à ce champ, affichée sous lui et annoncée. */
  erreur?: string;
  /** Mot de passe : masqué, avec un bouton « Afficher / Masquer ». */
  secret?: boolean;
};

export function Champ({
  libelle,
  aide,
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
      erreur={erreur}
      className={className}
    >
      <div className={`${boite} ${erreur ? "border-error" : "border-outline"}`}>
        <input
          id={idChamp}
          type={secret ? (visible ? "text" : "password") : type}
          aria-describedby={descriptions(idChamp, aide, erreur)}
          aria-invalid={erreur ? true : undefined}
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
            <Icone
              nom={visible ? "visibility_off" : "visibility"}
              taille={22}
            />
            {visible ? "Masquer" : "Afficher"}
            <span className="sr-only"> : {libelle}</span>
          </button>
        )}
      </div>
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
      <div className={`${boite} ${erreur ? "border-error" : "border-outline"}`}>
        <select
          id={idChamp}
          aria-describedby={descriptions(idChamp, aide, erreur)}
          aria-invalid={erreur ? true : undefined}
          className={`${saisie} cursor-pointer`}
          {...props}
        />
      </div>
    </Cadre>
  );
}
