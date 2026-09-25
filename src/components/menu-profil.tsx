"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { seDeconnecter } from "@/app/connexion/actions";
import { Bouton } from "./bouton";
import { BoutonRond } from "./bouton-rond";
import { EnTeteProfil } from "./en-tete-profil";
import type { NomIcone } from "./icones";
import { LigneMenu } from "./ligne-menu";

export type Rubrique = {
  href: string;
  icone: NomIcone;
  titre: string;
  detail?: string;
};

type Props = {
  initiale: string;
  nom: string;
  adresse?: string;
  rubriques: Rubrique[];
};

/** Glissement vers le bas, en px, au-delà duquel la feuille se ferme. */
const SEUIL_FERMETURE = 90;

/**
 * Avatar marine et menu du profil qu'il ouvre : feuille du bas modale, qui se ferme par
 * « Fermer », par le voile, par Échap ou en la faisant glisser vers le bas.
 * Le focus reste dans la feuille, puis revient à l'avatar.
 */
export function MenuProfil({ initiale, nom, adresse, rubriques }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const avatar = useRef<HTMLButtonElement>(null);
  const feuille = useRef<HTMLDialogElement>(null);
  const glissement = useRef<{ depart: number; ecart: number } | null>(null);

  function ouvrir() {
    feuille.current?.showModal();
    setOuvert(true);
  }

  function fermer() {
    feuille.current?.close();
  }

  /** Échap passe aussi par ici : le navigateur ferme la feuille lui-même. */
  function quandFermee() {
    setOuvert(false);
    avatar.current?.focus();
  }

  /** Le voile appartient à la feuille : un clic dessus a la feuille elle-même pour cible. */
  function fermerSurLeVoile(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) fermer();
  }

  function retenirLeFocus(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key !== "Tab") return;
    const cibles = [
      ...e.currentTarget.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      ),
    ];
    const premiere = cibles[0];
    const derniere = cibles[cibles.length - 1];
    if (e.shiftKey && document.activeElement === premiere) {
      e.preventDefault();
      derniere.focus();
    } else if (!e.shiftKey && document.activeElement === derniere) {
      e.preventDefault();
      premiere.focus();
    }
  }

  function commencerGlissement(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    glissement.current = { depart: e.clientY, ecart: 0 };
  }

  function glisser(e: PointerEvent<HTMLDivElement>) {
    if (!glissement.current || !feuille.current) return;
    const ecart = Math.max(0, e.clientY - glissement.current.depart);
    glissement.current.ecart = ecart;
    feuille.current.style.transform = `translateY(${ecart}px)`;
  }

  function finirGlissement() {
    const ecart = glissement.current?.ecart ?? 0;
    glissement.current = null;
    if (feuille.current) feuille.current.style.transform = "";
    if (ecart > SEUIL_FERMETURE) fermer();
  }

  return (
    <>
      <BoutonRond
        ref={avatar}
        variante="marine"
        label="Mon profil"
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        onClick={ouvrir}
      >
        {initiale}
      </BoutonRond>
      <dialog
        ref={feuille}
        aria-label="Menu du profil"
        onClose={quandFermee}
        onClick={fermerSurLeVoile}
        onKeyDown={retenirLeFocus}
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-none w-full max-w-none bg-transparent p-0 text-on-surface backdrop:bg-voile motion-safe:animate-feuille motion-safe:backdrop:animate-voile"
      >
        <div className="mx-auto flex max-h-[90dvh] max-w-xl flex-col overflow-y-auto rounded-t-feuille bg-fond-carte px-margin pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div
            aria-hidden="true"
            onPointerDown={commencerGlissement}
            onPointerMove={glisser}
            onPointerUp={finirGlissement}
            onPointerCancel={finirGlissement}
            className="flex h-cible shrink-0 cursor-grab touch-none items-center justify-center"
          >
            <span className="h-1.5 w-10 rounded-full bg-outline-variant" />
          </div>
          <EnTeteProfil
            taille="compact"
            initiale={initiale}
            nom={nom}
            adresse={adresse}
          />
          <nav
            aria-label="Rubriques du profil"
            className="mt-space-md flex flex-col gap-2"
          >
            {rubriques.map((rubrique) => (
              <LigneMenu
                key={rubrique.href}
                variante="feuille"
                onClick={fermer}
                {...rubrique}
              />
            ))}
            <form action={seDeconnecter}>
              <LigneMenu
                variante="feuille"
                icone="logout"
                titre="Se déconnecter"
                type="submit"
              />
            </form>
          </nav>
          <Bouton
            variante="contour"
            icone="close"
            pleineLargeur
            className="mt-space-md shrink-0"
            onClick={fermer}
          >
            Fermer
          </Bouton>
        </div>
      </dialog>
    </>
  );
}
