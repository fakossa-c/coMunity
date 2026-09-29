import { libelleCapacite, type EspaceCommun } from "@/lib/espaces-communs";
import { EquipementsEspace } from "./equipements-espace";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

/**
 * Les espaces communs dans Ma copro, tels que le conseil syndical les a définis : une carte par
 * espace (bordure de carte, sans ombre), sous son nom. Un champ non renseigné n'apparaît pas.
 */
export function EspacesCommunsCopro({ espaces }: { espaces: EspaceCommun[] }) {
  if (espaces.length === 0)
    return (
      <p className="max-w-[65ch] text-body-lg text-on-surface-variant">
        Le conseil syndical n&apos;a pas encore défini d&apos;espace commun.
      </p>
    );

  return (
    <ul aria-label="Espaces communs" className="flex flex-col gap-space-sm">
      {espaces.map((espace) => (
        <FicheEspace key={espace.id} espace={espace} />
      ))}
    </ul>
  );
}

type Ligne = { icone: NomIcone; libelle: string; valeur: string };

function FicheEspace({ espace }: { espace: EspaceCommun }) {
  const emplacement = [espace.batiment, espace.localisation]
    .filter(Boolean)
    .join(" · ");
  const lignes: (Ligne | false | null)[] = [
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
    <li className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-4">
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
            <div key={libelle} className="flex items-start gap-space-sm">
              <span className="text-texte-date">
                <Icone nom={icone} taille={24} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <dt className="text-body-md text-on-surface-variant">
                  {libelle}
                </dt>
                <dd className="max-w-[65ch] text-body-lg [overflow-wrap:anywhere] whitespace-pre-line text-on-surface">
                  {valeur}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
