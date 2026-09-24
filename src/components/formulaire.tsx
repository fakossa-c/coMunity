"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PropsChamp = ComponentProps<"input"> & {
  libelle: string;
  aide?: string;
};

/** Champ de saisie Warm Commons : 56 px de haut, bordure franche, libellé toujours visible. */
export function Champ({ libelle, aide, id, className, ...props }: PropsChamp) {
  const idAuto = useId();
  const idChamp = id ?? idAuto;
  const idAide = aide ? `${idChamp}-aide` : undefined;
  return (
    <div className={`flex flex-col gap-space-xs ${className ?? ""}`}>
      <label htmlFor={idChamp} className="font-headline text-label-lg">
        {libelle}
      </label>
      <input
        id={idChamp}
        aria-describedby={idAide}
        className="min-h-14 w-full rounded-md border-2 border-border-distinct bg-surface-container-lowest px-4 text-body-lg text-on-surface"
        {...props}
      />
      {aide && (
        <p id={idAide} className="text-body-md text-on-surface-variant">
          {aide}
        </p>
      )}
    </div>
  );
}

type PropsChampListe = ComponentProps<"select"> & { libelle: string };

/** Liste déroulante native, à l'allure d'un `Champ`. */
export function ChampListe({
  libelle,
  id,
  className,
  ...props
}: PropsChampListe) {
  const idAuto = useId();
  const idChamp = id ?? idAuto;
  return (
    <div className={`flex flex-col gap-space-xs ${className ?? ""}`}>
      <label htmlFor={idChamp} className="font-headline text-label-lg">
        {libelle}
      </label>
      <select
        id={idChamp}
        className="min-h-14 w-full rounded-md border-2 border-border-distinct bg-surface-container-lowest px-4 text-body-lg text-on-surface"
        {...props}
      />
    </div>
  );
}

const styles = {
  principal:
    "bg-inverse-surface text-on-primary hover:bg-on-surface disabled:opacity-70",
  danger: "bg-error text-on-error hover:bg-on-error-container",
  contour:
    "border-2 border-inverse-surface bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
};

type PropsBouton = ComponentProps<"button"> & {
  variante?: keyof typeof styles;
};

export function Bouton({
  variante = "principal",
  className,
  ...props
}: PropsBouton) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-14 items-center justify-center gap-space-xs rounded-lg px-space-md font-headline text-label-lg transition-transform active:translate-y-0.5 ${styles[variante]} ${className ?? ""}`}
      {...props}
    />
  );
}

/** Bouton d'envoi d'un formulaire, désactivé pendant l'envoi. */
export function BoutonEnvoi({
  children,
  enCours,
  ...props
}: PropsBouton & { enCours: string }) {
  const { pending } = useFormStatus();
  return (
    <Bouton type="submit" disabled={pending} {...props}>
      {pending ? enCours : children}
    </Bouton>
  );
}

/**
 * Zone où s'affiche le résultat d'une action. Elle existe avant le message,
 * pour que les lecteurs d'écran l'annoncent quand il apparaît.
 */
export function Annonce({
  message,
  erreur = false,
}: {
  message: ReactNode;
  erreur?: boolean;
}) {
  return (
    <div role={erreur ? "alert" : "status"}>
      {message && (
        <p
          className={`max-w-[65ch] rounded-lg p-space-md text-body-lg ${
            erreur
              ? "bg-error-container text-on-error-container"
              : "bg-secondary-container text-on-secondary-fixed"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
