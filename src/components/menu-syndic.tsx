"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { Bouton, classesBouton } from "./bouton";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";
import { retenirLeFocus } from "./retenir-le-focus";

/**
 * Rubriques de l'espace syndic, par groupe : une seule liste pour le menu déplié, le rail et le
 * tiroir du mobile. `compteur` : ce que compte la pastille, dit aux lecteurs d'écran après le nombre.
 */
const RUBRIQUES = [
  {
    id: "tableau-de-bord",
    href: "/syndic/tableau-de-bord",
    icone: "monitoring",
    libelle: "Tableau de bord",
    groupe: "Suivi",
  },
  {
    id: "residents",
    href: "/syndic/residents",
    icone: "group",
    libelle: "Résidents",
    groupe: "Résidence",
    compteur: "en attente",
  },
  {
    id: "membres",
    href: "/syndic/membres",
    icone: "shield_person",
    libelle: "Membres du syndic",
    groupe: "Résidence",
  },
  {
    id: "moderation",
    href: "/syndic/moderation",
    icone: "visibility_off",
    libelle: "Modération",
    groupe: "Résidence",
    compteur: "à relire",
  },
  {
    id: "annonces",
    href: "/syndic/annonces",
    icone: "campaign",
    libelle: "Annonces",
    groupe: "Contenus",
  },
  {
    id: "espaces-communs",
    href: "/syndic/espaces-communs",
    icone: "meeting_room",
    libelle: "Espaces communs",
    groupe: "Contenus",
  },
  {
    id: "reglement",
    href: "/syndic/reglement",
    icone: "menu_book",
    libelle: "Règlement intérieur",
    groupe: "Contenus",
  },
  {
    id: "mon-syndic",
    href: "/syndic/mon-syndic",
    icone: "support_agent",
    libelle: "Mon syndic",
    groupe: "Contenus",
  },
] as const satisfies readonly {
  id: string;
  href: string;
  icone: NomIcone;
  libelle: string;
  groupe: string;
  compteur?: string;
}[];

const GROUPES = ["Suivi", "Résidence", "Contenus"] as const;

export type IdRubriqueSyndic = (typeof RUBRIQUES)[number]["id"];

/** Nombres à signaler à côté des rubriques qui en ont : comptes en attente, activités à relire. */
export type CompteursSyndic = Partial<Record<IdRubriqueSyndic, number>>;

type Props = {
  /** Rubrique courante ; sur un formulaire, celle de sa liste. */
  actif: IdRubriqueSyndic;
  compteurs: CompteursSyndic;
};

/** Choix « menu réduit » retenu dans ce navigateur, dès 80 rem. */
const CLE_REDUIT = "menu-syndic-reduit";

/** Le point de rupture « grand écran » (`--breakpoint-grand`), où le menu est déplié par défaut. */
function surGrandEcran() {
  return window.matchMedia("(min-width: 80rem)").matches;
}

function lireReduit() {
  try {
    return localStorage.getItem(CLE_REDUIT) === "1";
  } catch {
    return false;
  }
}

function retenirReduit(reduit: boolean) {
  try {
    if (reduit) localStorage.setItem(CLE_REDUIT, "1");
    else localStorage.removeItem(CLE_REDUIT);
  } catch {
    // Sans stockage, le choix vaut jusqu'au prochain chargement.
  }
}

/**
 * Script lu pendant l'analyse de la page, avant le premier affichage : il pose `data-reduit` sur
 * le menu qui le contient, pour qu'un menu réduit ne s'affiche pas d'abord déplié. `text/plain`
 * côté navigateur : lors d'une navigation interne, l'état initial du composant fait ce travail.
 */
function ScriptReduit() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `try{if(localStorage.getItem("${CLE_REDUIT}")==="1")document.currentScript.parentElement.setAttribute("data-reduit","")}catch(e){}`,
      }}
    />
  );
}

function ListeRubriques({
  actif,
  compteurs,
  onChoisir,
}: Props & { onChoisir?: () => void }) {
  // Le menu et le tiroir posent chacun leur liste dans la page : des identifiants propres à chacune.
  const prefixe = useId();
  return (
    <div className="flex flex-col gap-5 rail:gap-3">
      {GROUPES.map((groupe, rang) => (
        <div
          key={groupe}
          className={
            rang > 0 ? "rail:border-t rail:border-filet rail:pt-3" : undefined
          }
        >
          <p
            id={`${prefixe}-${rang}`}
            className="mb-1.5 px-4 font-headline text-label-sm text-on-surface-variant rail:sr-only"
          >
            {groupe}
          </p>
          <ul
            aria-labelledby={`${prefixe}-${rang}`}
            className="flex flex-col gap-1"
          >
            {RUBRIQUES.filter((rubrique) => rubrique.groupe === groupe).map(
              (rubrique) => {
                const estActif = rubrique.id === actif;
                const nombre = compteurs[rubrique.id] ?? 0;
                // Le nombre fait partie du nom de la ligne, le rail n'ayant que la pastille.
                const nom =
                  nombre > 0 && "compteur" in rubrique
                    ? `${rubrique.libelle}, ${nombre} ${rubrique.compteur}`
                    : undefined;
                return (
                  <li key={rubrique.id}>
                    <Link
                      href={rubrique.href}
                      aria-current={estActif ? "page" : undefined}
                      aria-label={nom}
                      onClick={onChoisir}
                      className={`relative flex min-h-cible items-center gap-3 rounded-full px-4 py-2 font-headline text-label-lg transition-colors duration-(--duree-courte) ease-journal rail:mx-auto rail:w-14 rail:justify-center rail:px-0 ${estActif ? "bg-fond-action font-extrabold text-texte-action" : "font-bold text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}
                    >
                      <Icone nom={rubrique.icone} plein={estActif} />
                      <span className="min-w-0 flex-1 break-words rail:sr-only">
                        {rubrique.libelle}
                      </span>
                      {nombre > 0 && (
                        <span
                          aria-hidden="true"
                          className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-fond-syndic px-2 text-label-sm text-texte-syndic rail:absolute rail:-top-1 rail:-right-1 rail:h-6 rail:min-w-6 rail:px-1.5"
                        >
                          {nombre}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              },
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Menu « Espace syndic » sur ordinateur, collé au bord gauche de toutes les pages de l'espace
 * syndic. Dès 80 rem, il est déplié (296 px) ; « Réduire le menu » le ramène à un rail de
 * pictogrammes (80 px) et « Déplier le menu » le rouvre, choix retenu dans le navigateur. De 64
 * à 80 rem, il est en rail ; « Déplier le menu » l'ouvre par-dessus le contenu, refermé par
 * Échap, un clic à côté ou le choix d'une rubrique, sans rien retenir. Absent sous 64 rem, où
 * `TiroirSyndic` le remplace.
 */
export function MenuSyndic({ actif, compteurs }: Props) {
  const [reduit, setReduit] = useState(
    () => typeof window !== "undefined" && lireReduit(),
  );
  const [ouvert, setOuvert] = useState(false);
  const menu = useRef<HTMLElement>(null);
  const boutonReduire = useRef<HTMLButtonElement>(null);
  const boutonDeplier = useRef<HTMLButtonElement>(null);

  // Ouvert par-dessus le contenu : Échap, un clic à côté, le focus qui en sort ou un
  // redimensionnement le referment.
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (cible: EventTarget | null) =>
      !menu.current?.contains(cible as Node);
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      flushSync(() => setOuvert(false));
      boutonDeplier.current?.focus();
    };
    const surClic = (e: PointerEvent) => {
      if (dehors(e.target)) setOuvert(false);
    };
    const surFocus = (e: FocusEvent) => {
      if (dehors(e.target)) setOuvert(false);
    };
    const fermer = () => setOuvert(false);
    document.addEventListener("keydown", surTouche);
    document.addEventListener("pointerdown", surClic);
    document.addEventListener("focusin", surFocus);
    window.addEventListener("resize", fermer);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.removeEventListener("pointerdown", surClic);
      document.removeEventListener("focusin", surFocus);
      window.removeEventListener("resize", fermer);
    };
  }, [ouvert]);

  /** Le bouton cliqué disparaît : le focus passe à celui qui le remplace. */
  function basculer(
    changer: () => void,
    suivant: RefObject<HTMLButtonElement | null>,
  ) {
    flushSync(changer);
    suivant.current?.focus();
  }

  function deplier() {
    basculer(() => {
      if (!surGrandEcran()) return setOuvert(true);
      setReduit(false);
      retenirReduit(false);
    }, boutonReduire);
  }

  function reduire() {
    basculer(() => {
      if (!surGrandEcran()) return setOuvert(false);
      setReduit(true);
      retenirReduit(true);
    }, boutonDeplier);
  }

  return (
    <aside
      ref={menu}
      data-menu-syndic=""
      data-reduit={reduit ? "" : undefined}
      data-ouvert={ouvert ? "" : undefined}
      suppressHydrationWarning
      className="group/menu relative z-30 hidden w-rail-syndic shrink-0 desktop:block grand:w-menu-syndic grand:rail:w-rail-syndic"
    >
      <ScriptReduit />
      <div className="sticky top-0 flex max-h-dvh w-menu-syndic flex-col gap-5 overflow-x-hidden overflow-y-auto rounded-r-flottante bg-surface-container-low px-3 pt-5 pb-8 group-data-ouvert/menu:shadow-flottante grand:group-data-ouvert/menu:shadow-none rail:w-rail-syndic">
        <div className="flex min-h-cible items-center justify-between gap-2 pl-4 rail:justify-center rail:pl-0">
          <p className="font-headline text-headline-sm text-on-surface rail:sr-only">
            Espace syndic
          </p>
          <button
            ref={boutonReduire}
            type="button"
            onClick={reduire}
            title="Réduire le menu"
            className="flex size-cible shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface rail:hidden"
          >
            <Icone nom="left_panel_close" />
            <span className="sr-only">Réduire le menu</span>
          </button>
          <button
            ref={boutonDeplier}
            type="button"
            onClick={deplier}
            title="Déplier le menu"
            className="hidden size-cible shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface rail:flex"
          >
            <Icone nom="left_panel_open" />
            <span className="sr-only">Déplier le menu</span>
          </button>
        </div>
        <nav aria-label="Espace syndic">
          <ListeRubriques
            actif={actif}
            compteurs={compteurs}
            onChoisir={() => setOuvert(false)}
          />
        </nav>
      </div>
    </aside>
  );
}

/**
 * Sur mobile, bouton « Espace syndic » en tête de page, qui ouvre les mêmes rubriques dans un
 * tiroir à gauche, avec voile. Il se ferme par « Fermer », Échap, le voile ou le choix d'une
 * rubrique ; le focus reste dans le tiroir, puis revient au bouton.
 */
export function TiroirSyndic({ actif, compteurs }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);
  const tiroir = useRef<HTMLDialogElement>(null);

  function ouvrir() {
    tiroir.current?.showModal();
    setOuvert(true);
  }

  function fermer() {
    tiroir.current?.close();
  }

  function quandFerme() {
    setOuvert(false);
    bouton.current?.focus();
  }

  /** Le voile appartient au tiroir : un clic dessus a le tiroir lui-même pour cible. */
  function fermerSurLeVoile(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) fermer();
  }

  return (
    <div className="mb-space-md desktop:hidden">
      <button
        ref={bouton}
        type="button"
        aria-label="Menu de l'espace syndic"
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        onClick={ouvrir}
        className={`${classesBouton("contour")} h-cible gap-2 px-5`}
      >
        <Icone nom="menu" />
        Espace syndic
      </button>
      <dialog
        ref={tiroir}
        aria-label="Menu de l'espace syndic"
        onClose={quandFerme}
        onClick={fermerSurLeVoile}
        onKeyDown={retenirLeFocus}
        className="fixed inset-y-0 right-auto left-0 m-0 h-dvh max-h-none w-[min(20rem,88vw)] max-w-none bg-transparent p-0 text-on-surface backdrop:bg-voile motion-safe:animate-tiroir motion-safe:backdrop:animate-voile"
      >
        <div className="flex h-full flex-col gap-space-md overflow-x-hidden overflow-y-auto rounded-r-feuille bg-fond-carte px-3 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <p className="px-4 font-headline text-headline-sm text-on-surface">
            Espace syndic
          </p>
          <nav aria-label="Espace syndic" className="flex-1">
            <ListeRubriques
              actif={actif}
              compteurs={compteurs}
              onChoisir={fermer}
            />
          </nav>
          <Bouton
            variante="contour"
            icone="close"
            pleineLargeur
            aria-label="Fermer le menu"
            className="shrink-0"
            onClick={fermer}
          >
            Fermer
          </Bouton>
        </div>
      </dialog>
    </div>
  );
}
