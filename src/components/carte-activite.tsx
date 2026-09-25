import Link from "next/link";
import {
  categoriesActivite,
  type CategorieActivite,
} from "@/lib/categories-activite";
import type { EtiquetteActivite } from "@/lib/etiquettes-activite";
import { cheminFiche, estPassee } from "@/lib/partage-activite";
import { EtatActivite, type StatutActivite } from "./etat-activite";
import { EtiquettesActivite } from "./etiquette";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";
import { Jauge } from "./jauge";

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
};

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

export function CarteActivite({ activite }: { activite: Activite }) {
  const annulee = activite.statut === "annulee";
  const inscrit = activite.mes_accompagnants != null && !annulee;
  return (
    <article className="relative flex flex-col gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)]">
      <div className="flex items-start gap-space-sm">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
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
          J&apos;y vais
        </p>
      )}
    </article>
  );
}
