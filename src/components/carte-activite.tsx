import Link from "next/link";
import {
  categoriesActivite,
  couleurDe,
  pictogrammeDe,
  type CategorieActivite,
} from "@/lib/categories-activite";
import {
  etiquettesCocheesDuGroupe,
  type EtiquetteActivite,
} from "@/lib/etiquettes-activite";
import {
  estComplete,
  libelleStatutInscription,
} from "@/lib/inscription-activite";
import { estMiseDeCote } from "@/lib/decision-moderation";
import { adressePhoto } from "@/lib/fiche-activite";
import {
  cheminFiche,
  estPassee,
  horaire,
  jourLong,
} from "@/lib/partage-activite";
import { classesBouton } from "./bouton";
import { EtatActivite, type StatutActivite } from "./etat-activite";
import { EtiquettesActivite } from "./etiquette";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";
import { Jauge } from "./jauge";
import { StatutInscription } from "./statut-inscription";
import { TiroirDetails } from "./tiroir-details";
import { VisuelActivite } from "./visuel-activite";

export type Activite = {
  id: string;
  identifiant_public: string;
  titre: string;
  categorie: CategorieActivite;
  pictogramme: string;
  date_activite: string;
  heure_debut: string;
  lieu: string;
  /** `null` : pas de limite de participants. Absente : la jauge ne s'affiche pas sur la carte. */
  capacite_max?: number | null;
  places_prises?: number;
  /** Accompagnants de la personne connectée ; `null` ou absent si elle n'est pas inscrite. */
  mes_accompagnants?: number | null;
  /** Étiquettes cochées par l'organisateur ; absentes, la carte n'en montre aucune. */
  etiquettes?: EtiquetteActivite[];
  /** Absent, la carte ne montre aucun état. */
  statut?: StatutActivite;
  /** `null` ou absent : pas de minimum de participants, donc rien à confirmer. */
  capacite_min?: number | null;
  /** Chemin de la première photo dans le bucket `activites` ; `null` ou absent : le pictogramme tient lieu de photo. */
  photo?: string | null;
};

/** Une activité de l'Accueil : sa carte donne son horaire, heure de fin comprise. */
export type ActiviteDuJour = Activite & { heure_fin: string };

/**
 * Annulée, l'activité ne compte plus ses inscrits comme participants. En relecture ou masquée,
 * elle n'est pas ouverte aux inscriptions : `fermee`.
 */
function etatInscription(activite: Activite) {
  const annulee = activite.statut === "annulee";
  const fermee = annulee || estMiseDeCote(activite.statut);
  return {
    fermee,
    inscrit: activite.mes_accompagnants != null && !annulee,
  };
}

const FORMAT_DATE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** « mardi 12 octobre à 10h00 » (les secondes de `heure_debut` sont ignorées). */
function dateEtHeure(activite: Activite) {
  const date = FORMAT_DATE.format(
    new Date(`${activite.date_activite}T00:00:00`),
  );
  const heure = activite.heure_debut.slice(0, 5).replace(":", "h");
  return `${date} à ${heure}`;
}

type Props =
  | { activite: Activite; detailsDepliables?: false; aLaUne?: false }
  /**
   * Accueil : sous l'intertitre de son jour, la carte ne garde que l'horaire ; horaire, lieu et
   * étiquettes passent dans le tiroir « Détails », puis « Voir la fiche » et « Je participe ».
   */
  | { activite: ActiviteDuJour; detailsDepliables: true; aLaUne?: false }
  /**
   * Bloc « À la une » en tête de l'Accueil : visuel à gauche et texte à droite sur ordinateur,
   * empilés sur mobile.
   */
  | { activite: ActiviteDuJour; aLaUne: true; detailsDepliables?: false };

export function CarteActivite(props: Props) {
  if (props.aLaUne) return <CarteALaUne activite={props.activite} />;
  if (props.detailsDepliables) return <CarteDuJour activite={props.activite} />;
  const { activite } = props;
  const { inscrit } = etatInscription(activite);
  const couleur = couleurDe(activite.categorie);
  return (
    <article className="relative flex flex-col gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)]">
      <div className="flex items-start gap-space-sm">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-full ${couleur.fond} ${couleur.encre}`}
        >
          <Icone nom={activite.pictogramme as NomIcone} className="size-7" />
        </span>
        <div className="min-w-0">
          <span className="block text-body-md text-on-surface-variant">
            {categoriesActivite[activite.categorie].libelle}
          </span>
          <h2 className="font-headline text-headline-sm text-on-surface">
            {/* Toute la carte ouvre la fiche : le lien s'étend sur elle. */}
            <Link
              href={cheminFiche(activite.identifiant_public)}
              className="after:absolute after:inset-0 after:rounded-lg"
            >
              {activite.titre}
            </Link>
          </h2>
        </div>
      </div>
      <p className="flex items-center gap-space-xs text-body-lg text-on-surface-variant">
        <Icone nom="calendar_today" className="size-5 shrink-0" />
        {dateEtHeure(activite)}
      </p>
      <p className="flex items-center gap-space-xs text-body-lg text-on-surface-variant">
        <Icone nom="location_on" className="size-5 shrink-0" />
        {activite.lieu}
      </p>
      {activite.places_prises != null && (
        <Jauge
          capaciteMax={activite.capacite_max ?? null}
          placesPrises={activite.places_prises}
        />
      )}
      {activite.statut && (
        <EtatActivite
          statut={activite.statut}
          capaciteMin={activite.capacite_min ?? null}
          placesPrises={activite.places_prises ?? 0}
          passee={estPassee(activite.date_activite)}
        />
      )}
      {activite.etiquettes && (
        <EtiquettesActivite etiquettes={activite.etiquettes} />
      )}
      {inscrit && (
        <p className="flex items-center gap-space-xs font-headline text-body-bold text-primary">
          <Icone nom="check_circle" plein taille={20} />
          Vous participez
        </p>
      )}
    </article>
  );
}

/** La carte d'une activité dans l'Accueil, où les activités sont groupées par jour. */
function CarteDuJour({ activite }: { activite: ActiviteDuJour }) {
  const { fermee, inscrit } = etatInscription(activite);
  const complete = estComplete({
    capaciteMax: activite.capacite_max ?? null,
    placesPrises: activite.places_prises ?? 0,
  });
  const creneau = horaire(activite.heure_debut, activite.heure_fin);
  const etiquettes = activite.etiquettes ?? [];
  const accessibilite = etiquettesCocheesDuGroupe(etiquettes, "accessibilite");
  const pourQui = etiquettesCocheesDuGroupe(etiquettes, "pour_qui");
  const fiche = cheminFiche(activite.identifiant_public);
  const couleur = couleurDe(activite.categorie);

  return (
    <article className="flex survol-eleve flex-col overflow-hidden rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest shadow-[0_3px_0_0_rgba(24,34,48,0.08)]">
      <VisuelActivite
        pictogramme={activite.pictogramme as NomIcone}
        categorie={activite.categorie}
        photo={activite.photo ? adressePhoto(activite.photo) : null}
        enCarte
      />
      <div className="flex flex-col gap-space-sm px-4 pt-4 pb-[18px]">
        <p className="flex items-center gap-1.5 text-body-md text-on-surface-variant">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${couleur.fond} ${couleur.encre}`}
          >
            <Icone nom={pictogrammeDe(activite.categorie)} taille={22} />
          </span>
          {categoriesActivite[activite.categorie].libelle}
        </p>
        <p className="font-headline text-label-lg text-texte-date">{creneau}</p>
        <h3 className="font-headline text-headline-md text-on-surface">
          <Link href={fiche} className="rounded-sm">
            {activite.titre}
          </Link>
        </h3>
        {activite.places_prises != null && (
          <Jauge
            capaciteMax={activite.capacite_max ?? null}
            placesPrises={activite.places_prises}
          />
        )}
        {activite.statut && (
          <EtatActivite
            statut={activite.statut}
            capaciteMin={activite.capacite_min ?? null}
            placesPrises={activite.places_prises ?? 0}
            passee={false}
          />
        )}
        <TiroirDetails>
          <div className="flex flex-col gap-space-sm">
            <p className="flex items-center gap-space-xs text-body-lg text-on-surface">
              <Icone nom="schedule" className="size-5 shrink-0" />
              {creneau}
            </p>
            <p className="flex items-center gap-space-xs text-body-lg text-on-surface">
              <Icone nom="location_on" className="size-5 shrink-0" />
              {activite.lieu}
            </p>
            {accessibilite.length > 0 && (
              <GroupeEtiquettes
                titre="Accessibilité"
                etiquettes={accessibilite}
              />
            )}
            {pourQui.length > 0 && (
              <GroupeEtiquettes titre="Pour qui" etiquettes={pourQui} />
            )}
          </div>
        </TiroirDetails>
        {inscrit ? (
          <StatutInscription>
            {libelleStatutInscription(activite.mes_accompagnants ?? 0)}
          </StatutInscription>
        ) : (
          <div className="flex flex-wrap gap-space-sm">
            <Link
              href={fiche}
              className={`${classesBouton("contour")} flex-auto`}
            >
              Voir la fiche
            </Link>
            {!fermee && !complete && (
              <Link
                href={fiche}
                className={`${classesBouton("action")} flex-auto`}
              >
                Je participe
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Le bloc « À la une » : la prochaine activité où l'on peut s'inscrire. Sa carte porte la pastille
 * « À la une », le jour et l'horaire, le lieu, la jauge, puis « Je participe » et « Voir la
 * fiche », ou « Vous participez » pour un résident déjà inscrit.
 */
function CarteALaUne({ activite }: { activite: ActiviteDuJour }) {
  const { inscrit } = etatInscription(activite);
  const fiche = cheminFiche(activite.identifiant_public);

  return (
    <article className="grid survol-eleve overflow-hidden rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest shadow-[0_3px_0_0_rgba(24,34,48,0.08)] desktop:grid-cols-[55fr_45fr]">
      <VisuelActivite
        pictogramme={activite.pictogramme as NomIcone}
        categorie={activite.categorie}
        photo={activite.photo ? adressePhoto(activite.photo) : null}
        enCarte
        grand
      />
      <div className="flex flex-col justify-center gap-space-sm px-4 pt-4 pb-[18px] desktop:px-11 desktop:py-9">
        <p className="self-start rounded-full bg-fond-action px-3.5 py-1 font-headline text-label-lg font-extrabold text-texte-action">
          À la une
        </p>
        <p className="font-headline text-label-lg text-texte-date">
          {jourLong(activite.date_activite)} ·{" "}
          {horaire(activite.heure_debut, activite.heure_fin)}
        </p>
        <h2 className="font-headline text-headline-md text-on-surface desktop:text-headline-xl">
          <Link href={fiche} className="rounded-sm">
            {activite.titre}
          </Link>
        </h2>
        <p className="flex items-center gap-space-xs text-body-lg text-on-surface-variant">
          <Icone nom="location_on" className="size-5 shrink-0" />
          {activite.lieu}
        </p>
        {activite.places_prises != null && (
          <Jauge
            capaciteMax={activite.capacite_max ?? null}
            placesPrises={activite.places_prises}
          />
        )}
        {activite.statut && (
          <EtatActivite
            statut={activite.statut}
            capaciteMin={activite.capacite_min ?? null}
            placesPrises={activite.places_prises ?? 0}
            passee={false}
          />
        )}
        <div className="flex flex-wrap items-center gap-space-sm">
          {inscrit ? (
            <>
              <StatutInscription>
                {libelleStatutInscription(activite.mes_accompagnants ?? 0)}
              </StatutInscription>
              <Link href={fiche} className={classesBouton("contour")}>
                Voir la fiche
              </Link>
            </>
          ) : (
            <>
              <Link href={fiche} className={classesBouton("action")}>
                Je participe
              </Link>
              <Link href={fiche} className={classesBouton("contour")}>
                Voir la fiche
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function GroupeEtiquettes({
  titre,
  etiquettes,
}: {
  titre: string;
  etiquettes: EtiquetteActivite[];
}) {
  return (
    <div className="flex flex-col gap-space-xs">
      <p className="font-headline text-label-md text-on-surface-variant">
        {titre}
      </p>
      <EtiquettesActivite etiquettes={etiquettes} />
    </div>
  );
}
