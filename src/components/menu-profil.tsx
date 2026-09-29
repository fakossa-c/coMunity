"use client";

import {
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type SyntheticEvent,
} from "react";
import { seDeconnecter } from "@/app/connexion/actions";
import { Bouton } from "./bouton";
import { BoutonRond } from "./bouton-rond";
import { EnTeteProfil } from "./en-tete-profil";
import type { NomIcone } from "./icones";
import { LigneMenu } from "./ligne-menu";
import { retenirLeFocus } from "./retenir-le-focus";

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

/** Durée de la sortie du menu déroulant, en ms : celle de `--animate-menu-sortie`. */
const DUREE_SORTIE = 300;

/** Écart, en px, entre l'avatar et le menu déroulant. */
const ECART_MENU = 12;

/** Le point de rupture ordinateur de l'application (`--breakpoint-desktop`). */
function surOrdinateur() {
  return window.matchMedia("(min-width: 64rem)").matches;
}

/**
 * Avatar marine et menu du profil qu'il ouvre. Sur mobile, une feuille du bas modale, qui se
 * ferme par « Fermer », par le voile, par Échap ou en la faisant glisser vers le bas. Sur
 * ordinateur, la même boîte de dialogue est un menu déroulant sous l'avatar, animé à l'ouverture
 * et à la fermeture, sans « Fermer » ni poignée : Échap ou un clic à côté le referme.
 * Le focus reste dans le menu, puis revient à l'avatar.
 */
export function MenuProfil({ initiale, nom, adresse, rubriques }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const avatar = useRef<HTMLButtonElement>(null);
  const feuille = useRef<HTMLDialogElement>(null);
  const glissement = useRef<{ depart: number; ecart: number } | null>(null);

  function ouvrir() {
    const dialogue = feuille.current;
    if (!dialogue || !avatar.current) return;
    if (surOrdinateur()) {
      const cadre = avatar.current.getBoundingClientRect();
      dialogue.style.setProperty(
        "--menu-haut",
        `${cadre.bottom + ECART_MENU}px`,
      );
      dialogue.style.setProperty(
        "--menu-droite",
        `${document.documentElement.clientWidth - cadre.right}px`,
      );
    }
    dialogue.showModal();
    setOuvert(true);
  }

  function fermer() {
    const dialogue = feuille.current;
    if (!dialogue?.open || dialogue.dataset.sortie !== undefined) return;
    const animer =
      surOrdinateur() &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animer) {
      dialogue.close();
      return;
    }
    dialogue.dataset.sortie = "";
    setTimeout(() => {
      delete dialogue.dataset.sortie;
      dialogue.close();
    }, DUREE_SORTIE);
  }

  /** Sur ordinateur, Échap laisse le menu jouer sa sortie avant de se fermer. */
  function surEchap(e: SyntheticEvent<HTMLDialogElement>) {
    if (!surOrdinateur()) return;
    e.preventDefault();
    fermer();
  }

  /** La fermeture, quelle qu'en soit la cause, rend le focus à l'avatar. */
  function quandFermee() {
    setOuvert(false);
    avatar.current?.focus();
  }

  /** Le voile appartient à la feuille : un clic dessus a la feuille elle-même pour cible. */
  function fermerSurLeVoile(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) fermer();
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
        className="transition-transform duration-(--duree-courte) ease-journal desktop:hover:scale-[1.07]"
      >
        {initiale}
      </BoutonRond>
      <dialog
        ref={feuille}
        aria-label="Menu du profil"
        onClose={quandFermee}
        onCancel={surEchap}
        onClick={fermerSurLeVoile}
        onKeyDown={retenirLeFocus}
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-none w-full max-w-none bg-transparent p-0 text-on-surface backdrop:bg-voile motion-safe:animate-feuille motion-safe:backdrop:animate-voile desktop:inset-auto desktop:top-(--menu-haut) desktop:right-(--menu-droite) desktop:w-85 desktop:origin-top-right desktop:overflow-visible desktop:backdrop:bg-transparent desktop:motion-safe:animate-menu desktop:motion-safe:backdrop:animate-none desktop:motion-safe:data-sortie:animate-menu-sortie"
      >
        <div className="mx-auto flex max-h-[90dvh] max-w-xl flex-col overflow-y-auto rounded-t-feuille bg-fond-carte px-margin pb-[calc(1.25rem+env(safe-area-inset-bottom))] desktop:mx-0 desktop:max-h-none desktop:max-w-none desktop:rounded-[1.75rem] desktop:p-3 desktop:shadow-flottante">
          <div
            aria-hidden="true"
            onPointerDown={commencerGlissement}
            onPointerMove={glisser}
            onPointerUp={finirGlissement}
            onPointerCancel={finirGlissement}
            className="flex h-cible shrink-0 cursor-grab touch-none items-center justify-center desktop:hidden"
          >
            <span className="h-1.5 w-10 rounded-full bg-outline-variant" />
          </div>
          <div className="desktop:px-3 desktop:pt-3 desktop:pb-3.5">
            <EnTeteProfil
              taille="compact"
              initiale={initiale}
              nom={nom}
              adresse={adresse}
            />
          </div>
          <nav
            aria-label="Rubriques du profil"
            className="mt-space-md flex flex-col gap-2 desktop:mt-0"
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
            className="mt-space-md shrink-0 desktop:hidden"
            onClick={fermer}
          >
            Fermer
          </Bouton>
        </div>
      </dialog>
    </>
  );
}
