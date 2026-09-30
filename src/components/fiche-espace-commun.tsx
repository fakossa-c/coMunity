import Link from "next/link";
import {
  decouperConsignes,
  emplacementEspace,
  libelleCapacite,
  libelleDimensions,
  libelleHauteur,
  lienFicheEspace,
  lienProposerIci,
  type EspaceCommun,
} from "@/lib/espaces-communs";
import { heure } from "@/lib/partage-activite";
import { texteAlternatifPlan } from "@/lib/photo-espace-commun";
import { classesBouton } from "./bouton";
import { ConsignesRepliables } from "./consignes-repliables";
import { EmplacementPhoto } from "./emplacement-photo";
import { EquipementsEspace } from "./equipements-espace";
import { GaleriePhotos } from "./galerie-photos";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";
import { TitreSection } from "./titre-section";

type Props = {
  espace: EspaceCommun;
  /** Les adresses signées des photos, dans l'ordre ; vide, la fiche n'a pas d'image en tête. */
  photos?: string[];
  /** L'adresse signée du plan de situation ; absente, la fiche n'a pas de plan. */
  plan?: string;
  /** Les autres espaces de la résidence, proposés sous la fiche. */
  autres?: EspaceCommun[];
};

type Caracteristique = { icone: NomIcone; libelle: string; valeur: string };

const CARTE =
  "rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-space-md desktop:p-8";

/**
 * Fiche d'un espace commun, sous Ma copro : galerie de photos en tête (vignettes à droite sur
 * ordinateur), nom et emplacement, ses caractéristiques (dimensions, hauteur sous plafond,
 * capacité, horaires, équipements) et ses consignes repliables, et à côté (sous la fiche sur
 * mobile, collante sur ordinateur) la carte « Utiliser cet espace » avec « Proposer une activité
 * ici » puis le plan de situation. Un champ non renseigné n'a ni ligne ni carte.
 */
export function FicheEspaceCommun({
  espace,
  photos = [],
  plan,
  autres = [],
}: Props) {
  const lieu = emplacementEspace(espace);
  const consignes = decouperConsignes(espace.consignes);
  const dimensions = libelleDimensions(espace.longueur_m, espace.largeur_m);
  const hauteur = libelleHauteur(espace.hauteur_plafond_m);
  const caracteristiques = [
    dimensions !== null && {
      icone: "straighten",
      libelle: "Dimensions",
      valeur: dimensions,
    },
    hauteur !== null && {
      icone: "height",
      libelle: "Hauteur sous plafond",
      valeur: hauteur,
    },
    espace.capacite !== null && {
      icone: "groups",
      libelle: "Capacité",
      valeur: libelleCapacite(espace.capacite),
    },
    !!espace.horaires_acces && {
      icone: "schedule",
      libelle: "Horaires d'accès",
      valeur: espace.horaires_acces,
    },
  ].filter((ligne): ligne is Caracteristique => !!ligne);
  const aDesEquipements = espace.equipements.length > 0;

  return (
    <article className="flex flex-col gap-space-lg">
      <GaleriePhotos
        photos={photos}
        titre={espace.nom}
        sujet="espace"
        vignettes
        className="h-[220px]! desktop:h-[420px]! desktop:rounded-flottante!"
      />

      <header className="flex flex-col gap-space-sm">
        <h1 className="font-headline text-headline-xl-mobile [overflow-wrap:anywhere] text-on-surface desktop:text-titre-journal">
          {espace.nom}
        </h1>
        {lieu && (
          <p className="flex items-center gap-2 text-body-lg text-on-surface-variant">
            <Icone nom="location_on" taille={22} />
            <span className="[overflow-wrap:anywhere]">{lieu}</span>
          </p>
        )}
        {espace.description && (
          <p className="max-w-[65ch] text-body-lg [overflow-wrap:anywhere] text-on-surface">
            {espace.description}
          </p>
        )}
      </header>

      <div className="grid gap-space-lg desktop:grid-cols-[minmax(0,1fr)_22.5rem] desktop:items-start desktop:gap-12">
        <div className="flex flex-col gap-space-md desktop:gap-6">
          {(caracteristiques.length > 0 || aDesEquipements) && (
            <section aria-labelledby="titre-caracteristiques" className={CARTE}>
              <TitreSection id="titre-caracteristiques">
                Caractéristiques
              </TitreSection>
              <dl className="mt-space-md flex flex-col gap-space-md">
                {caracteristiques.map(({ icone, libelle, valeur }) => (
                  <LigneCaracteristique
                    key={libelle}
                    icone={icone}
                    libelle={libelle}
                  >
                    {valeur}
                  </LigneCaracteristique>
                ))}
                {aDesEquipements && (
                  <LigneCaracteristique icone="chair" libelle="Équipements">
                    <EquipementsEspace equipements={espace.equipements} />
                  </LigneCaracteristique>
                )}
              </dl>
            </section>
          )}

          {consignes.visibles.length > 0 && (
            <section
              aria-labelledby="titre-consignes"
              className={`${CARTE} flex flex-col gap-space-sm`}
            >
              <TitreSection id="titre-consignes">Consignes</TitreSection>
              <ConsignesRepliables
                visibles={consignes.visibles}
                suite={consignes.suite}
              />
            </section>
          )}
        </div>

        <aside
          aria-labelledby="titre-utiliser"
          className="flex flex-col gap-space-md rounded-flottante bg-surface-container-low p-space-md desktop:sticky desktop:top-6 desktop:p-7"
        >
          <TitreSection id="titre-utiliser">Utiliser cet espace</TitreSection>
          {espace.contact && (
            <LigneUtilisation icone="support_agent" titre="Contact">
              {espace.contact}
            </LigneUtilisation>
          )}
          <LigneUtilisation icone="event_available">
            Pour utiliser cet espace, proposez une activité : vous choisirez la
            date et l&apos;heure.
          </LigneUtilisation>
          {espace.heure_fin_max && (
            <LigneUtilisation icone="schedule">
              Les activités s&apos;y terminent au plus tard à{" "}
              {heure(espace.heure_fin_max)}.
            </LigneUtilisation>
          )}
          <Link
            href={lienProposerIci(espace.id)}
            className={`${classesBouton("action", true)} py-3`}
          >
            <Icone nom="add" taille={24} />
            Proposer une activité ici
          </Link>
          {plan && (
            <figure className="mt-space-xs flex flex-col gap-space-xs">
              <EmplacementPhoto
                src={plan}
                alt={texteAlternatifPlan(espace.nom)}
                className="h-[170px]! rounded-lg!"
              />
              <figcaption className="flex items-center justify-between gap-space-sm text-body-md text-on-surface-variant">
                Plan de situation
                <a
                  href={plan}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-headline text-label-lg text-primary underline underline-offset-4"
                >
                  Agrandir le plan
                  <span className="sr-only">
                    {" "}
                    (s&apos;ouvre dans un nouvel onglet)
                  </span>
                </a>
              </figcaption>
            </figure>
          )}
        </aside>
      </div>

      {autres.length > 0 && (
        <section
          aria-labelledby="titre-autres"
          className="flex flex-col gap-space-md"
        >
          <TitreSection id="titre-autres">Autres espaces communs</TitreSection>
          <ul className="grid gap-space-sm desktop:grid-cols-2 desktop:gap-6">
            {autres.map((autre) => (
              <li
                key={autre.id}
                className="relative flex survol-eleve items-center gap-space-sm rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-space-md"
              >
                <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-fond-action text-texte-action">
                  <Icone nom="meeting_room" taille={24} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="font-headline text-label-lg [overflow-wrap:anywhere] text-on-surface">
                    <Link
                      href={lienFicheEspace(autre.id)}
                      className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:-outline-offset-3 focus-visible:after:outline-focus"
                    >
                      {autre.nom}
                    </Link>
                  </h3>
                  {emplacementEspace(autre) && (
                    <span className="text-body-md [overflow-wrap:anywhere] text-on-surface-variant">
                      {emplacementEspace(autre)}
                    </span>
                  )}
                </div>
                <span className="text-on-surface-variant">
                  <Icone nom="chevron_right" taille={24} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

/** Une ligne libellé et valeur des caractéristiques ; côte à côte sur ordinateur. */
function LigneCaracteristique({
  icone,
  libelle,
  children,
}: {
  icone: NomIcone;
  libelle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-space-xs desktop:grid-cols-[13rem_minmax(0,1fr)] desktop:gap-x-4">
      <dt className="flex items-center gap-space-sm font-headline text-body-bold text-on-surface-variant">
        <span className="text-texte-date">
          <Icone nom={icone} taille={24} />
        </span>
        {libelle}
      </dt>
      <dd className="max-w-[65ch] text-body-lg [overflow-wrap:anywhere] text-on-surface">
        {children}
      </dd>
    </div>
  );
}

/** Une ligne de la carte « Utiliser cet espace » : pictogramme, titre facultatif et texte. */
function LigneUtilisation({
  icone,
  titre,
  children,
}: {
  icone: NomIcone;
  titre?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-space-sm">
      <span className="mt-0.5 shrink-0 text-texte-date">
        <Icone nom={icone} taille={24} />
      </span>
      <p className="min-w-0 text-body-lg [overflow-wrap:anywhere] text-on-surface">
        {titre && (
          <>
            <span className="font-headline font-bold">{titre}</span>
            <br />
          </>
        )}
        {children}
      </p>
    </div>
  );
}
