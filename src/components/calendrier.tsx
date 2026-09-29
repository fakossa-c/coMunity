"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  debutDeSemaine,
  finDeSemaine,
  jourDecale,
  libelleJour,
  libelleMois,
  moisDe,
  moisDecale,
  semainesDuMois,
} from "@/lib/calendrier";
import { BoutonRond } from "./bouton-rond";
import { AideChamp, ErreurChamp } from "./champ";
import { Icone } from "./icone";

type Props = {
  /** Le nom du champ, lu par le lecteur d'écran : « Date ». */
  libelle: string;
  /** Le jour choisi, `AAAA-MM-JJ`, ou `""` avant tout choix. */
  valeur: string;
  onChange: (date: string) => void;
  /** Le jour d'aujourd'hui, `AAAA-MM-JJ` : les jours d'avant sont grisés. */
  aujourdhui: string;
  aide?: string;
  /** Erreur propre au champ, affichée sous le calendrier et annoncée. */
  erreur?: string;
  className?: string;
};

const JOURS = [
  { court: "L", long: "lundi" },
  { court: "M", long: "mardi" },
  { court: "M", long: "mercredi" },
  { court: "J", long: "jeudi" },
  { court: "V", long: "vendredi" },
  { court: "S", long: "samedi" },
  { court: "D", long: "dimanche" },
];

/**
 * Le calendrier du mois, dans la page : un jour se choisit du bout du doigt (cibles de 44 px), la
 * semaine commence le lundi. Au clavier, les flèches passent d'un jour à l'autre, Début et Fin
 * mènent au lundi et au dimanche de la semaine ; le jour choisi est annoncé.
 */
export function Calendrier({
  libelle,
  valeur,
  onChange,
  aujourdhui,
  aide,
  erreur,
  className,
}: Props) {
  const id = useId();
  const depart = valeur && valeur >= aujourdhui ? valeur : aujourdhui;
  const [mois, setMois] = useState(moisDe(valeur || aujourdhui));
  // Le jour qui reçoit le focus quand on entre dans la grille (un seul jour à la fois).
  const [jourFocalise, setJourFocalise] = useState(depart);
  const [annonce, setAnnonce] = useState("");
  const table = useRef<HTMLTableElement>(null);
  // Le jour à focaliser après le rendu qui l'affiche, quand le clavier change de mois.
  const focusAPoser = useRef<string | null>(null);

  const semaines = semainesDuMois(mois);
  const premierJourChoisissable = semaines
    .flat()
    .find((jour): jour is string => jour !== null && jour >= aujourdhui);
  const jourTabulable =
    moisDe(jourFocalise) === mois && jourFocalise >= aujourdhui
      ? jourFocalise
      : premierJourChoisissable;
  const moisPrecedentPasse = mois <= moisDe(aujourdhui);

  useEffect(() => {
    if (!focusAPoser.current) return;
    table.current
      ?.querySelector<HTMLButtonElement>(`[data-jour="${focusAPoser.current}"]`)
      ?.focus();
    focusAPoser.current = null;
  }, [mois, jourFocalise]);

  function choisir(jour: string) {
    setJourFocalise(jour);
    setAnnonce(`${libelleJour(jour)} sélectionné`);
    onChange(jour);
  }

  function allerAuMois(decalage: number) {
    setMois((actuel) => moisDecale(actuel, decalage));
  }

  function surTouche(e: KeyboardEvent<HTMLTableElement>) {
    const jour = (e.target as HTMLElement).dataset.jour;
    if (!jour) return;
    const cible = {
      ArrowLeft: jourDecale(jour, -1),
      ArrowRight: jourDecale(jour, 1),
      ArrowUp: jourDecale(jour, -7),
      ArrowDown: jourDecale(jour, 7),
      Home: debutDeSemaine(jour),
      End: finDeSemaine(jour),
    }[e.key];
    if (!cible) return;
    e.preventDefault();
    // Jamais avant aujourd'hui : les flèches s'arrêtent au premier jour choisissable, Début
    // mène à ce jour quand le lundi est passé.
    const atteint = e.key === "Home" && cible < aujourdhui ? aujourdhui : cible;
    if (atteint < aujourdhui || atteint === jour) return;
    focusAPoser.current = atteint;
    setJourFocalise(atteint);
    setMois(moisDe(atteint));
  }

  return (
    <div className={`flex max-w-md flex-col gap-space-xs ${className ?? ""}`}>
      <span id={`${id}-libelle`} className="font-headline text-label-lg">
        {libelle}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-libelle`}
        aria-describedby={
          [aide && `${id}-aide`, erreur && `${id}-erreur`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`rounded-md border-[1.5px] bg-fond-carte py-3 text-on-surface ${erreur ? "border-error" : "border-outline"}`}
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <BoutonRond
            label="Mois précédent"
            aria-disabled={moisPrecedentPasse}
            onClick={() => !moisPrecedentPasse && allerAuMois(-1)}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            <span className="-scale-x-100">
              <Icone nom="chevron_right" />
            </span>
          </BoutonRond>
          <p
            aria-live="polite"
            className="text-center font-headline text-headline-sm"
          >
            {libelleMois(mois)}
          </p>
          <BoutonRond
            label="Mois suivant"
            icone="chevron_right"
            onClick={() => allerAuMois(1)}
          />
        </div>
        <table
          ref={table}
          onKeyDown={surTouche}
          className="w-full table-fixed border-collapse"
        >
          <thead>
            <tr>
              {JOURS.map(({ court, long }) => (
                <th
                  key={long}
                  scope="col"
                  className="pb-1 text-center font-headline text-label-sm text-on-surface-variant"
                >
                  <abbr title={long} className="no-underline">
                    {court}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semaines.map((semaine) => (
              <tr key={semaine.find(Boolean)}>
                {semaine.map((jour, i) => (
                  <td key={jour ?? `vide-${i}`} className="p-0 py-0.5">
                    {jour && (
                      <Jour
                        jour={jour}
                        choisi={jour === valeur}
                        estAujourdhui={jour === aujourdhui}
                        passe={jour < aujourdhui}
                        tabulable={jour === jourTabulable}
                        onChoisir={() => choisir(jour)}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p role="status" className="sr-only">
          {annonce}
        </p>
      </div>
      {aide && <AideChamp id={id}>{aide}</AideChamp>}
      {erreur && <ErreurChamp id={id}>{erreur}</ErreurChamp>}
    </div>
  );
}

function Jour({
  jour,
  choisi,
  estAujourdhui,
  passe,
  tabulable,
  onChoisir,
}: {
  jour: string;
  choisi: boolean;
  estAujourdhui: boolean;
  passe: boolean;
  tabulable: boolean;
  onChoisir: () => void;
}) {
  // Choisi : pêche plein, contour et graisse en plus (jamais la couleur seule). Aujourd'hui :
  // contour terre cuite.
  const apparence = choisi
    ? "border-2 border-contour-action bg-fond-action font-extrabold text-texte-action"
    : estAujourdhui
      ? "border-2 border-texte-date font-bold text-texte-date hover:bg-surface-container-low"
      : "border-2 border-transparent hover:bg-surface-container-low";
  return (
    <button
      type="button"
      data-jour={jour}
      disabled={passe}
      tabIndex={tabulable ? 0 : -1}
      aria-pressed={choisi}
      aria-current={estAujourdhui ? "date" : undefined}
      aria-label={`${libelleJour(jour)}${estAujourdhui ? ", aujourd'hui" : ""}`}
      onClick={onChoisir}
      className={`mx-auto flex min-h-11 min-w-11 items-center justify-center rounded-full font-headline text-body-lg disabled:cursor-not-allowed disabled:opacity-40 ${apparence}`}
    >
      {Number(jour.slice(8))}
    </button>
  );
}
