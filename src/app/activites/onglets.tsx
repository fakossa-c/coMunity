import { BarreFiltres } from "@/components/barre-filtres";
import { Icone } from "@/components/icone";
import type { NomIcone } from "@/components/icones";
import { Onglets } from "@/components/onglets";

export type OngletActivites = "je_participe" | "j_organise" | "archivees";

export type CompteursActivites = Record<OngletActivites, number>;

const s = (nombre: number) => (nombre > 1 ? "s" : "");

/** Les trois segments, dans l'ordre : libellé, pictogramme et phrase qui résume le segment ouvert. */
const SEGMENTS: {
  id: OngletActivites;
  libelle: string;
  icone: NomIcone;
  resume: (nombre: number) => string;
}[] = [
  {
    id: "je_participe",
    libelle: "Je participe",
    icone: "event_available",
    resume: (n) =>
      n === 0 ? "Aucune activité à venir" : `${n} activité${s(n)} à venir`,
  },
  {
    id: "j_organise",
    libelle: "J'organise",
    icone: "edit",
    resume: (n) =>
      n === 0
        ? "Aucune activité que vous organisez"
        : `${n} activité${s(n)} que vous organisez`,
  },
  {
    id: "archivees",
    libelle: "Archivées",
    icone: "history",
    resume: (n) =>
      n === 0
        ? "Aucune activité archivée"
        : `${n} activité${s(n)} archivée${s(n)}, organisée${s(n)} ou suivie${s(n)}`,
  },
];

/** L'onglet demandé par l'adresse : « Je participe » par défaut, pour toute autre valeur. */
export function ongletDemande(valeur: string | undefined): OngletActivites {
  return SEGMENTS.find(({ id }) => id === valeur)?.id ?? "je_participe";
}

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
  const segmentActif = SEGMENTS.find(({ id }) => id === actif) ?? SEGMENTS[0];
  return (
    <BarreFiltres
      avant={
        <div className="flex flex-wrap items-center justify-between gap-x-space-md gap-y-space-sm">
          <Onglets
            libelleGroupe="Mes activités"
            actif={actif}
            onglets={SEGMENTS.map(({ id, libelle, icone }) => ({
              id,
              libelle,
              icone,
              href: `/activites?onglet=${id}`,
              compteur: compteurs[id],
            }))}
          />
          <p className="hidden items-center gap-2 text-body-lg text-on-surface-variant desktop:flex">
            <Icone nom={segmentActif.icone} taille={24} />
            {segmentActif.resume(compteurs[actif])}
          </p>
        </div>
      }
    />
  );
}
