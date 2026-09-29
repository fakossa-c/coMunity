import type { Metadata } from "next";
import Link from "next/link";
import { CONFIRMATIONS, estDecision } from "@/lib/decision-moderation";
import { EcranSecondaire } from "@/components/cadre";
import { EtatActivite } from "@/components/etat-activite";
import { Annonce as Confirmation } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { TitreSection } from "@/components/titre-section";
import {
  lireActivitesAModerer,
  type ActiviteAModerer,
} from "@/lib/moderation-activites";
import { cheminFiche, heure, jourLong } from "@/lib/partage-activite";
import { accesSyndic } from "../acces";
import { DecisionModeration } from "./decision-moderation";

const RETOUR = { href: "/syndic", libelle: "Espace syndic" };

export const metadata: Metadata = { title: "Modération des activités" };

type Props = {
  searchParams: Promise<{ fait?: string; titre?: string }>;
};

export default async function ModerationDesActivites({ searchParams }: Props) {
  const { refus } = await accesSyndic("/syndic/moderation");
  if (refus)
    return (
      <EcranSecondaire retour={RETOUR} pleineLargeur>
        {refus}
      </EcranSecondaire>
    );

  const { fait, titre } = await searchParams;
  const activites = await lireActivitesAModerer();
  const aRelire = activites.filter((a) => a.statut === "en_relecture");
  const masquees = activites.filter((a) => a.statut === "masquee");
  const confirmation =
    titre && estDecision(fait) ? CONFIRMATIONS[fait](titre) : undefined;

  return (
    <EcranSecondaire retour={RETOUR} pleineLargeur>
      <TitrePage
        titre="Modération des activités"
        sousTitre="Relisez les activités mises de côté, puis publiez-les ou refusez-les avec un message pour leur créateur. Depuis la fiche d'une activité, vous pouvez aussi la masquer, la modifier ou l'annuler."
      />
      <div className="flex flex-col gap-space-lg">
        <Confirmation message={confirmation} />
        <Rubrique
          titre="À relire"
          activites={aRelire}
          vide="Aucune activité à relire pour le moment. Les activités sont publiées dès que leur créateur les propose."
        />
        <Rubrique
          titre="Masquées"
          activites={masquees}
          vide="Aucune activité masquée."
        />
      </div>
    </EcranSecondaire>
  );
}

function Rubrique({
  titre,
  activites,
  vide,
}: {
  titre: string;
  activites: ActiviteAModerer[];
  vide: string;
}) {
  return (
    <section className="flex flex-col gap-space-sm">
      <TitreSection>
        {activites.length > 0 ? `${titre} (${activites.length})` : titre}
      </TitreSection>
      {activites.length === 0 ? (
        <p className="text-body-lg text-on-surface-variant">{vide}</p>
      ) : (
        <ul aria-label={titre} className="flex flex-col gap-space-md">
          {activites.map((activite) => (
            <CarteModeration
              key={activite.identifiant_public}
              activite={activite}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CarteModeration({ activite }: { activite: ActiviteAModerer }) {
  const enRelecture = activite.statut === "en_relecture";
  return (
    <li className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)]">
      <EtatActivite
        statut={activite.statut}
        capaciteMin={null}
        placesPrises={0}
        passee={false}
      />
      <h3 className="font-headline text-headline-sm text-on-surface">
        {activite.titre}
      </h3>
      <p className="text-body-md text-on-surface-variant">
        Proposée par {activite.organisateur_nom_affiche ?? "un ancien résident"}{" "}
        · {jourLong(activite.date_activite)} à {heure(activite.heure_debut)} ·{" "}
        {activite.lieu}
      </p>
      {enRelecture ? (
        <p className="text-body-lg text-on-surface">
          Raison : {activite.raison_relecture ?? "non précisée"}
        </p>
      ) : (
        <p className="text-body-lg text-on-surface">
          Message au créateur : {activite.message_moderation ?? "aucun"}
        </p>
      )}
      <Link
        href={cheminFiche(activite.identifiant_public)}
        className="inline-flex min-h-cible items-center gap-1.5 self-start font-headline text-label-lg text-primary underline"
      >
        <Icone nom="visibility" taille={22} />
        Voir la fiche
        <span className="sr-only"> : {activite.titre}</span>
      </Link>
      <DecisionModeration
        identifiant={activite.identifiant_public}
        titre={activite.titre}
        statut={activite.statut}
        surLaListe
      />
    </li>
  );
}
