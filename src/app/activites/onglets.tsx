import { BarreFiltres } from "@/components/barre-filtres";
import { Icone } from "@/components/icone";
import type { NomIcone } from "@/components/icones";
import { Onglets } from "@/components/onglets";

export type OngletActivites = "je_participe" | "j_organise" | "archivees";

export type CompteursActivites = Record<OngletActivites, number>;

/** L'onglet demandé par l'adresse : « Je participe » par défaut, pour toute autre valeur. */
export function ongletDemande(valeur: string | undefined): OngletActivites {
  return valeur === "j_organise" || valeur === "archivees"
    ? valeur
    : "je_participe";
}

/** « 5 activités à venir », « 1 activité que vous organisez » : la phrase sous les segments. */
function resume(onglet: OngletActivites, nombre: number) {
  const s = nombre > 1 ? "s" : "";
  if (nombre === 0) {
    return {
      je_participe: "Aucune activité à venir",
      j_organise: "Aucune activité que vous organisez",
      archivees: "Aucune activité archivée",
    }[onglet];
  }
  return {
    je_participe: `${nombre} activité${s} à venir`,
    j_organise: `${nombre} activité${s} que vous organisez`,
    archivees: `${nombre} activité${s} archivée${s}, organisée${s} ou suivie${s}`,
  }[onglet];
}

const pictogrammeDuResume: Record<OngletActivites, NomIcone> = {
  je_participe: "event_available",
  j_organise: "edit",
  archivees: "history",
};

/**
 * Segments « Je participe / J'organise / Archivées » de l'onglet Activités, chacun avec son
 * compteur, collés en haut de l'écran. Sur ordinateur, une phrase à droite résume le segment
 * ouvert. Ils remplacent les onglets « J'y vais / J'organise » et les puces « À venir / Passées ».
 */
export function SegmentsActivites({
  actif,
  compteurs,
}: {
  actif: OngletActivites;
  compteurs: CompteursActivites;
}) {
  return (
    <BarreFiltres
      avant={
        <div className="flex flex-wrap items-center justify-between gap-x-space-md gap-y-space-sm">
          <Onglets
            libelleGroupe="Mes activités"
            actif={actif}
            onglets={[
              {
                id: "je_participe",
                libelle: "Je participe",
                href: "/activites?onglet=je_participe",
                icone: "event_available",
                compteur: compteurs.je_participe,
              },
              {
                id: "j_organise",
                libelle: "J'organise",
                href: "/activites?onglet=j_organise",
                icone: "edit",
                compteur: compteurs.j_organise,
              },
              {
                id: "archivees",
                libelle: "Archivées",
                href: "/activites?onglet=archivees",
                icone: "history",
                compteur: compteurs.archivees,
              },
            ]}
          />
          <p className="hidden items-center gap-2 text-body-lg text-on-surface-variant desktop:flex">
            <Icone nom={pictogrammeDuResume[actif]} taille={24} />
            {resume(actif, compteurs[actif])}
          </p>
        </div>
      }
    />
  );
}
