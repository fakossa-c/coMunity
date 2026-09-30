import Link from "next/link";
import type { RoleArchive } from "@/lib/mes-activites";
import { cheminFiche, jourLong } from "@/lib/partage-activite";
import { classesBouton } from "./bouton";
import type { Activite } from "./carte-activite";
import { Etiquette } from "./etiquette";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Props = {
  /** `mon_retour_note` : la note de l'avis déjà donné ; absente ou `null`, l'avis reste à donner. */
  activite: Activite & { mon_retour_note?: number | null };
  role: RoleArchive;
};

/** « 9 participants », accompagnants compris. */
function libelleParticipants(nombre: number) {
  if (nombre === 0) return "Aucun participant";
  return nombre === 1 ? "1 participant" : `${nombre} participants`;
}

/** Cinq étoiles dont `note` pleines, dites « Votre avis : 4 sur 5 » au lecteur d'écran. */
function NoteDonnee({ note }: { note: number }) {
  return (
    <p className="text-body-md">
      <span
        aria-hidden="true"
        className="text-headline-sm tracking-widest text-tertiary-container"
      >
        {"★".repeat(note)}
        <span className="text-outline-variant">{"★".repeat(5 - note)}</span>
      </span>
      <span className="sr-only">Votre avis : {note} sur 5</span>
    </p>
  );
}

/**
 * Une activité passée dans « Archivées » : pictogramme, titre (lien vers la fiche), jour et lieu,
 * puis le rôle du résident : « Organisée par vous » avec le nombre de participants et
 * « Dupliquer », ou « Vous y avez participé » avec « Donner mon avis » (le formulaire d'avis est
 * sur la fiche), ou, l'avis déjà donné, les étoiles données à la place du bouton. Une activité
 * organisée puis annulée le dit à la place du nombre de participants.
 */
export function LigneArchivee({ activite, role }: Props) {
  const organisee = role === "organisee";
  const annulee = activite.statut === "annulee";
  const fiche = cheminFiche(activite.identifiant_public);

  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-space-sm gap-y-space-sm rounded-md px-3 py-4 transition-colors duration-(--duree-courte) ease-journal desktop:grid-cols-[auto_minmax(0,1fr)_auto] desktop:gap-x-5 desktop:px-5 desktop:hover:bg-surface-container-low">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant desktop:size-14">
        <Icone nom={activite.pictogramme as NomIcone} className="size-7" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-headline text-headline-sm text-on-surface">
          <Link href={fiche} className="rounded-sm">
            {activite.titre}
          </Link>
        </h2>
        <p className="text-body-md text-on-surface-variant">
          {jourLong(activite.date_activite)} · {activite.lieu}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {organisee ? (
            <Etiquette ton="peche" icone="edit">
              Organisée par vous
            </Etiquette>
          ) : (
            <Etiquette ton="vert" icone="event_available">
              Vous y avez participé
            </Etiquette>
          )}
          {annulee && (
            <Etiquette ton="erreur" icone="event_busy">
              Annulée
            </Etiquette>
          )}
        </div>
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-x-space-sm gap-y-2 desktop:col-span-1">
        {organisee ? (
          <>
            {!annulee && (
              <span className="text-body-md text-on-surface-variant">
                {libelleParticipants(activite.places_prises ?? 0)}
              </span>
            )}
            <Link
              href={`/proposer?copie=${activite.identifiant_public}`}
              className={classesBouton("contour")}
            >
              <Icone nom="content_copy" taille={24} />
              Dupliquer
              <span className="sr-only"> {activite.titre}</span>
            </Link>
          </>
        ) : activite.mon_retour_note != null ? (
          <NoteDonnee note={activite.mon_retour_note} />
        ) : (
          <Link href={fiche} className={classesBouton("contour")}>
            Donner mon avis
            <span className="sr-only"> sur {activite.titre}</span>
          </Link>
        )}
      </div>
    </article>
  );
}
