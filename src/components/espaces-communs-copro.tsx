import Link from "next/link";
import {
  emplacementEspace,
  libelleCapacite,
  lienFicheEspace,
  type EspaceCommun,
} from "@/lib/espaces-communs";
import { texteAlternatifEspace } from "@/lib/photo-espace-commun";
import { classesBouton } from "./bouton";
import { EmplacementPhoto } from "./emplacement-photo";
import { EquipementsEspace } from "./equipements-espace";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

/**
 * Les espaces communs dans Ma copro, tels que le conseil syndical les a définis : une carte par
 * espace (bordure de carte sur mobile, ombre douce sur ordinateur, où elles se rangent sur deux
 * colonnes), sous son nom. Toute la carte mène à la fiche de l'espace. Un champ non renseigné
 * n'apparaît pas. `photos` donne l'adresse de la photo de chaque espace qui en a une, par identifiant d'espace ;
 * sans adresse, la carte n'a pas d'image.
 */
export function EspacesCommunsCopro({
  espaces,
  photos = {},
}: {
  espaces: EspaceCommun[];
  photos?: Record<string, string>;
}) {
  if (espaces.length === 0)
    return (
      <p className="max-w-[65ch] text-body-lg text-on-surface-variant">
        Le conseil syndical n&apos;a pas encore défini d&apos;espace commun.
      </p>
    );

  return (
    <ul
      aria-label="Espaces communs"
      className="flex flex-col gap-space-sm desktop:grid desktop:grid-cols-2 desktop:items-start desktop:gap-7"
    >
      {espaces.map((espace) => (
        <FicheEspace
          key={espace.id}
          espace={espace}
          photo={photos[espace.id]}
        />
      ))}
    </ul>
  );
}

type Ligne = { icone: NomIcone; libelle: string; valeur: string };

function FicheEspace({
  espace,
  photo,
}: {
  espace: EspaceCommun;
  photo?: string;
}) {
  const emplacement = emplacementEspace(espace);
  const lignes: (Ligne | false)[] = [
    !!espace.horaires_acces && {
      icone: "schedule",
      libelle: "Horaires d'accès",
      valeur: espace.horaires_acces,
    },
    !!espace.contact && {
      icone: "call",
      libelle: "Contact",
      valeur: espace.contact,
    },
    espace.capacite !== null && {
      icone: "groups",
      libelle: "Capacité",
      valeur: libelleCapacite(espace.capacite),
    },
    !!espace.consignes && {
      icone: "menu_book",
      libelle: "Consignes",
      valeur: espace.consignes,
    },
  ];
  const renseignees = lignes.filter((l): l is Ligne => !!l);

  return (
    <li className="relative flex survol-eleve flex-col gap-space-sm rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-4">
      {photo && (
        <EmplacementPhoto
          src={photo}
          alt={texteAlternatifEspace(espace.nom)}
          arrondi
        />
      )}
      <div className="flex items-start gap-space-sm">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fond-action text-texte-action">
          <Icone nom="meeting_room" taille={24} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-headline text-label-lg [overflow-wrap:anywhere] text-on-surface">
            {espace.nom}
          </h3>
          {emplacement && (
            <span className="text-body-md [overflow-wrap:anywhere] text-on-surface-variant">
              {emplacement}
            </span>
          )}
        </div>
      </div>
      {espace.description && (
        <p className="max-w-[65ch] text-body-lg [overflow-wrap:anywhere] text-on-surface">
          {espace.description}
        </p>
      )}
      <EquipementsEspace equipements={espace.equipements} />
      {renseignees.length > 0 && (
        <dl className="flex flex-col gap-space-sm">
          {renseignees.map(({ icone, libelle, valeur }) => (
            <div
              key={libelle}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-space-sm"
            >
              <dt className="col-span-2 grid grid-cols-subgrid items-center text-body-md text-on-surface-variant">
                <span className="text-texte-date">
                  <Icone nom={icone} taille={24} />
                </span>
                {libelle}
              </dt>
              <dd className="col-start-2 max-w-[65ch] text-body-lg [overflow-wrap:anywhere] whitespace-pre-line text-on-surface">
                {valeur}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {/* Toute la carte est cliquable : le lien s'étend sur elle, le focus la cerne. */}
      <Link
        href={lienFicheEspace(espace.id)}
        className={`${classesBouton("contour")} gap-space-xs self-start after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:-outline-offset-3 focus-visible:after:outline-focus`}
      >
        Voir le détail
        <span className="sr-only"> : {espace.nom}</span>
        <Icone nom="chevron_right" taille={24} />
      </Link>
    </li>
  );
}
