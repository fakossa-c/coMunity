import type { Metadata } from "next";
import Link from "next/link";
import { classesBouton } from "@/components/bouton";
import { EcranSecondaire } from "@/components/cadre";
import { EquipementsEspace } from "@/components/equipements-espace";
import { Annonce } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { TitreSection } from "@/components/titre-section";
import {
  libelleCapacite,
  libelleHeureFinMax,
  type EspaceCommun,
} from "@/lib/espaces-communs";
import { lireEspacesCommuns, lireHeureCalme } from "@/lib/regles-residence";
import { accesSyndic } from "../acces";
import { HeureCalme } from "./heure-calme";

const RETOUR = { href: "/syndic", libelle: "Espace syndic" };

export const metadata: Metadata = { title: "Espaces communs" };

type Props = {
  searchParams: Promise<{ fait?: string; nom?: string }>;
};

const CONFIRMATIONS: Record<string, (nom: string) => string> = {
  ajoute: (nom) => `« ${nom} » est ajouté aux espaces communs.`,
  enregistre: (nom) => `« ${nom} » est enregistré.`,
  supprime: (nom) => `« ${nom} » est supprimé.`,
};

export default async function EspacesCommuns({ searchParams }: Props) {
  const { refus } = await accesSyndic("/syndic/espaces-communs");
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const { fait, nom } = await searchParams;
  const [espaces, heureCalme] = await Promise.all([
    lireEspacesCommuns(),
    lireHeureCalme(),
  ]);
  const confirmation = fait && nom ? CONFIRMATIONS[fait]?.(nom) : undefined;

  return (
    <EcranSecondaire retour={RETOUR}>
      <TitrePage
        titre="Espaces communs"
        sousTitre="Les lieux où les voisins se retrouvent, avec leurs règles, et l'heure de calme de la résidence."
      />
      <div className="flex flex-col gap-space-lg">
        <Annonce message={confirmation} />

        <HeureCalme actuelle={heureCalme?.slice(0, 5) ?? ""} />

        <section className="flex flex-col gap-space-sm">
          <TitreSection>
            {espaces.length === 0
              ? "Aucun espace commun"
              : espaces.length === 1
                ? "1 espace commun"
                : `${espaces.length} espaces communs`}
          </TitreSection>
          {espaces.length === 0 ? (
            <p className="text-body-lg text-on-surface-variant">
              Ajoutez la salle commune, la cour ou le jardin : les voisins les
              choisiront en proposant une activité.
            </p>
          ) : (
            <ul
              aria-label="Espaces communs"
              className="flex flex-col gap-space-md"
            >
              {espaces.map((espace) => (
                <CarteEspace key={espace.id} espace={espace} />
              ))}
            </ul>
          )}
          <Link
            href="/syndic/espaces-communs/nouveau"
            className={classesBouton("action", true)}
          >
            <Icone nom="add" taille={24} />
            Ajouter un espace commun
          </Link>
        </section>
      </div>
    </EcranSecondaire>
  );
}

/** Un espace commun dans la liste : son nom, ses règles en une ligne, ses badges, « Modifier ». */
function CarteEspace({ espace }: { espace: EspaceCommun }) {
  const regles = [
    espace.batiment,
    libelleCapacite(espace.capacite),
    espace.heure_fin_max && libelleHeureFinMax(espace.heure_fin_max),
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-4">
      <div className="flex items-start gap-space-sm">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fond-action text-texte-action">
          <Icone nom="meeting_room" taille={24} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-headline text-label-lg [overflow-wrap:anywhere] text-on-surface">
            {espace.nom}
          </span>
          <span className="text-body-md text-on-surface-variant">
            {regles.join(" · ")}
          </span>
        </div>
        <Link
          href={`/syndic/espaces-communs/${espace.id}`}
          className={classesBouton("fantome")}
        >
          <Icone nom="edit" taille={22} />
          Modifier
          <span className="sr-only"> : {espace.nom}</span>
        </Link>
      </div>
      <EquipementsEspace equipements={espace.equipements} />
    </li>
  );
}
