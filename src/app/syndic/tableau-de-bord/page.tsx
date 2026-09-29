import type { Metadata } from "next";
import Link from "next/link";
import { EcranSecondaire } from "@/components/cadre";
import { classesBouton } from "@/components/bouton";
import { ChiffreCle } from "@/components/chiffre-cle";
import {
  GraphiqueBarres,
  type BarreGraphique,
} from "@/components/graphique-barres";
import { PuceFiltre } from "@/components/puce-filtre";
import { TitrePage } from "@/components/titre-page";
import { TitreSection } from "@/components/titre-section";
import { categoriesActivite } from "@/lib/categories-activite";
import { lireTableauDeBord } from "@/lib/lecture-tableau-de-bord";
import { cheminFiche, jourLong } from "@/lib/partage-activite";
import {
  libelleNombreRetours,
  libelleNoteMoyenne,
} from "@/lib/retour-activite";
import {
  PERIODES,
  barresDeRemplissage,
  clePeriode,
  libelleMois,
  libelleNombreActivites,
  libelleNombreParticipants,
  libellePeriode,
  libelleTaux,
  meilleureBarre,
  partActivitesResidents,
  periodeDe,
  texteValeurBarre,
  type Barre,
  type DimensionRemplissage,
  type LigneClassement,
  type LigneRemplissage,
} from "@/lib/tableau-de-bord";
import { accesSyndic } from "../acces";

const RETOUR = { href: "/syndic", libelle: "Espace syndic" };

export const metadata: Metadata = { title: "Tableau de bord" };

type Props = { searchParams: Promise<{ periode?: string }> };

export default async function TableauDeBord({ searchParams }: Props) {
  const { refus } = await accesSyndic("/syndic/tableau-de-bord");
  if (refus)
    return (
      <EcranSecondaire retour={RETOUR} pleineLargeur>
        {refus}
      </EcranSecondaire>
    );

  const { periode: demandee } = await searchParams;
  const cle = clePeriode(demandee);
  const periode = periodeDe(cle, new Date());
  const { synthese, remplissage, classement, parMois } =
    await lireTableauDeBord(periode);

  const partResidents = partActivitesResidents(synthese);
  const sansActivite = synthese.nombre_activites === 0;

  return (
    <EcranSecondaire retour={RETOUR} pleineLargeur>
      <TitrePage
        titre="Tableau de bord"
        sousTitre="Ce qui fait vivre la résidence, d'après les activités publiées qui ont eu lieu sur la période."
      />

      <div className="flex flex-col gap-space-lg">
        <section
          aria-labelledby="periode"
          className="flex flex-col gap-space-sm"
        >
          <TitreSection id="periode">Période</TitreSection>
          <nav aria-labelledby="periode">
            <ul className="flex flex-wrap gap-space-sm">
              {PERIODES.map((p) => (
                <li key={p.cle}>
                  <PuceFiltre
                    href={`/syndic/tableau-de-bord?periode=${p.cle}`}
                    selectionnee={p.cle === cle}
                  >
                    {p.libelle}
                  </PuceFiltre>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-body-md text-on-surface-variant">
            {libellePeriode(periode)}
          </p>
        </section>

        <section
          aria-labelledby="chiffres"
          className="flex flex-col gap-space-sm"
        >
          <TitreSection id="chiffres">En chiffres</TitreSection>
          <dl className="grid gap-space-md sm:grid-cols-2 desktop:grid-cols-4">
            <ChiffreCle
              libelle="Activités"
              valeur={synthese.nombre_activites}
              precision={
                partResidents === null
                  ? "Aucune activité n'a eu lieu sur la période."
                  : `${partResidents} % proposées par des résidents, ${synthese.activites_par_conseil} par le conseil syndical.`
              }
            />
            <ChiffreCle
              libelle="Inscriptions"
              valeur={synthese.nombre_inscriptions}
              precision="Une par résident et par activité."
            />
            <ChiffreCle
              libelle="Participants distincts"
              valeur={synthese.nombre_participants}
              precision="Résidents différents inscrits à au moins une activité."
            />
            <ChiffreCle
              libelle="Résidents validés"
              valeur={synthese.residents_valides}
              precision={
                <>
                  {synthese.residents_en_attente === 0
                    ? "Aucun compte en attente."
                    : `${synthese.residents_en_attente} ${synthese.residents_en_attente === 1 ? "compte attend" : "comptes attendent"} une validation.`}{" "}
                  <Link
                    href="/syndic/residents"
                    className="font-bold underline underline-offset-2"
                  >
                    Voir les résidents
                  </Link>
                </>
              }
            />
          </dl>
        </section>

        <section
          aria-labelledby="par-mois"
          className="flex flex-col gap-space-sm"
        >
          <TitreSection id="par-mois">Mois par mois</TitreSection>
          <GraphiqueBarres
            titre="Participants distincts par mois"
            resume={resumeParMois(parMois)}
            maximum={Math.max(1, ...parMois.map((m) => m.nombre_participants))}
            barres={parMois.map((m) => ({
              cle: m.mois,
              libelle: libelleMois(m.mois),
              valeur: m.nombre_participants,
              texteValeur: libelleNombreParticipants(m.nombre_participants),
              detail: libelleNombreActivites(m.nombre_activites),
            }))}
          />
        </section>

        <section
          aria-labelledby="remplissage"
          className="flex flex-col gap-space-sm"
        >
          <TitreSection id="remplissage">Ce qui remplit le mieux</TitreSection>
          <p className="max-w-[65ch] text-body-md text-on-surface-variant">
            Le remplissage d&apos;une activité est la part de ses places prises,
            accompagnants compris. Une activité sans limite de places n&apos;en
            a pas : elle compte dans le nombre d&apos;activités, pas dans le
            taux.
          </p>
          <div className="grid gap-space-md desktop:grid-cols-3">
            <GraphiqueRemplissage
              titre="Par catégorie"
              lignes={remplissage}
              dimension="categorie"
            />
            <GraphiqueRemplissage
              titre="Par jour de la semaine"
              lignes={remplissage}
              dimension="jour"
            />
            <GraphiqueRemplissage
              titre="Par tranche horaire"
              lignes={remplissage}
              dimension="creneau"
            />
          </div>
        </section>

        <section
          aria-labelledby="classement"
          className="flex flex-col gap-space-sm"
        >
          <TitreSection id="classement">
            Activités les mieux notées
          </TitreSection>
          {classement.length === 0 ? (
            <p className="text-body-lg text-on-surface-variant">
              {sansActivite
                ? "Aucune activité n'a eu lieu sur la période."
                : "Aucune activité de la période n'a reçu de retour pour le moment."}
            </p>
          ) : (
            <ol className="grid gap-space-md desktop:grid-cols-2">
              {classement.map((ligne, rang) => (
                <ActiviteClassee
                  key={ligne.identifiant_public}
                  ligne={ligne}
                  rang={rang + 1}
                />
              ))}
            </ol>
          )}
        </section>
      </div>
    </EcranSecondaire>
  );
}

/** La phrase qui donne l'essentiel du graphique mensuel, pour qui ne voit pas les barres. */
function resumeParMois(
  parMois: { mois: string; nombre_participants: number }[],
) {
  const meilleur = parMois.reduce<(typeof parMois)[number] | null>(
    (acc, m) =>
      m.nombre_participants > (acc?.nombre_participants ?? 0) ? m : acc,
    null,
  );
  if (!meilleur) return "Aucun participant sur la période.";
  return `Le plus de participants distincts : ${libelleMois(meilleur.mois)}, ${libelleNombreParticipants(meilleur.nombre_participants).toLowerCase()}.`;
}

function versBarreGraphique(barre: Barre): BarreGraphique {
  return {
    cle: barre.cle,
    libelle: barre.libelle,
    valeur: barre.taux,
    texteValeur: texteValeurBarre(barre),
    detail:
      barre.nombreActivites > 0
        ? libelleNombreActivites(barre.nombreActivites)
        : undefined,
  };
}

function GraphiqueRemplissage({
  titre,
  lignes,
  dimension,
}: {
  titre: string;
  lignes: LigneRemplissage[];
  dimension: DimensionRemplissage;
}) {
  const barres = barresDeRemplissage(lignes, dimension);
  const meilleure = meilleureBarre(barres);
  return (
    <GraphiqueBarres
      titre={titre}
      resume={
        meilleure
          ? `Meilleur remplissage moyen : ${meilleure.libelle}, ${libelleTaux(meilleure.taux)}.`
          : "Aucune activité à places limitées sur la période."
      }
      maximum={100}
      barres={barres.map(versBarreGraphique)}
    />
  );
}

function ActiviteClassee({
  ligne,
  rang,
}: {
  ligne: LigneClassement;
  rang: number;
}) {
  return (
    <li className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-space-md">
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <div>
          <h3 className="font-headline text-headline-sm font-extrabold text-on-surface">
            <span className="text-primary">{rang}.</span>{" "}
            <Link
              href={cheminFiche(ligne.identifiant_public)}
              className="underline underline-offset-2"
            >
              {ligne.titre}
            </Link>
          </h3>
          <p className="text-body-md text-on-surface-variant">
            {categoriesActivite[ligne.categorie].libelle} ·{" "}
            {jourLong(ligne.date_activite)} · {ligne.places_prises}{" "}
            {ligne.places_prises === 1 ? "place prise" : "places prises"}
          </p>
        </div>
        <p className="font-headline text-label-lg text-on-surface">
          {libelleNoteMoyenne(ligne.note_moyenne)}
          <span className="font-normal text-on-surface-variant">
            {" "}
            · {libelleNombreRetours(ligne.nombre_retours)}
          </span>
        </p>
      </div>
      <details className="rounded-md bg-surface-container-low px-space-sm">
        <summary className="min-h-cible cursor-pointer py-3 font-headline text-label-lg text-on-surface">
          Lire {ligne.nombre_retours === 1 ? "le retour" : "les retours"}
        </summary>
        <ul className="flex flex-col gap-space-sm pb-space-sm">
          {ligne.commentaires.map((retour, i) => (
            <li key={i} className="text-body-md text-on-surface">
              <span className="font-bold">{retour.note} / 5</span>
              {" : "}
              {retour.commentaire}
            </li>
          ))}
        </ul>
      </details>
      <div>
        <Link
          href={`/proposer?copie=${ligne.identifiant_public}`}
          className={classesBouton("contour")}
        >
          Utiliser comme modèle
        </Link>
      </div>
    </li>
  );
}
