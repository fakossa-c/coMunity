import Link from "next/link";
import {
  decouperConsignes,
  libelleCapacite,
  lienFicheEspace,
  lienProposerIci,
  type EspaceCommun,
} from "@/lib/espaces-communs";
import { heure } from "@/lib/partage-activite";
import { texteAlternatifEspace } from "@/lib/photo-espace-commun";
import { classesBouton } from "./bouton";
import { ConsignesRepliables } from "./consignes-repliables";
import { EmplacementPhoto } from "./emplacement-photo";
import { EquipementsEspace } from "./equipements-espace";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Props = {
  espace: EspaceCommun;
  /** L'adresse de la photo, signée ; absente, la fiche n'a pas d'image. */
  photo?: string;
  /** Les autres espaces de la résidence, proposés sous la fiche. */
  autres?: EspaceCommun[];
};

type Caracteristique = { icone: NomIcone; libelle: string; valeur: string };

/** « Bâtiment A · rez-de-chaussée » : où se trouve l'espace ; vide sans l'un ni l'autre. */
function emplacement(espace: EspaceCommun) {
  return [espace.batiment, espace.localisation].filter(Boolean).join(" · ");
}

const CARTE =
  "rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-space-md desktop:p-8";

/**
 * Fiche d'un espace commun, sous Ma copro : photo en tête, nom et emplacement, ses
 * caractéristiques et ses consignes repliables, et à côté (sous la fiche sur mobile, collante sur
 * ordinateur) la carte « Utiliser cet espace » avec « Proposer une activité ici ». Un champ non
 * renseigné n'a ni ligne ni carte.
 */
export function FicheEspaceCommun({ espace, photo, autres = [] }: Props) {
  const lieu = emplacement(espace);
  const consignes = decouperConsignes(espace.consignes);
  const caracteristiques = [
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
      {photo && (
        <EmplacementPhoto
          src={photo}
          alt={texteAlternatifEspace(espace.nom)}
          arrondi
          immediate
          className="h-[220px]! desktop:h-[380px]! desktop:rounded-flottante!"
        />
      )}

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
              <h2
                id="titre-caracteristiques"
                className="font-headline text-headline-sm font-extrabold text-on-surface"
              >
                Caractéristiques
              </h2>
              <dl className="mt-space-md flex flex-col gap-space-md">
                {caracteristiques.map(({ icone, libelle, valeur }) => (
                  <Ligne key={libelle} icone={icone} libelle={libelle}>
                    {valeur}
                  </Ligne>
                ))}
                {aDesEquipements && (
                  <Ligne icone="chair" libelle="Équipements">
                    <EquipementsEspace equipements={espace.equipements} />
                  </Ligne>
                )}
              </dl>
            </section>
          )}

          {consignes.visibles.length > 0 && (
            <section aria-labelledby="titre-consignes" className={CARTE}>
              <h2
                id="titre-consignes"
                className="mb-space-sm font-headline text-headline-sm font-extrabold text-on-surface"
              >
                Consignes
              </h2>
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
          <h2
            id="titre-utiliser"
            className="font-headline text-headline-sm font-extrabold text-on-surface"
          >
            Utiliser cet espace
          </h2>
          {espace.contact && (
            <Aparte icone="support_agent" titre="Contact">
              {espace.contact}
            </Aparte>
          )}
          <Aparte icone="event_available">
            Pour utiliser cet espace, proposez une activité : vous choisirez la
            date et l&apos;heure.
          </Aparte>
          {espace.heure_fin_max && (
            <Aparte icone="schedule">
              Les activités s&apos;y terminent au plus tard à{" "}
              {heure(espace.heure_fin_max)}.
            </Aparte>
          )}
          <Link
            href={lienProposerIci(espace.id)}
            className={`${classesBouton("action", true)} py-3`}
          >
            <Icone nom="add" taille={24} />
            Proposer une activité ici
          </Link>
        </aside>
      </div>

      {autres.length > 0 && (
        <section
          aria-labelledby="titre-autres"
          className="flex flex-col gap-space-md"
        >
          <h2
            id="titre-autres"
            className="font-headline text-headline-sm font-extrabold text-on-surface"
          >
            Autres espaces et biens communs
          </h2>
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
                  {emplacement(autre) && (
                    <span className="text-body-md [overflow-wrap:anywhere] text-on-surface-variant">
                      {emplacement(autre)}
                    </span>
                  )}
                </div>
                <span className="text-primary">
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
function Ligne({
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
function Aparte({
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
