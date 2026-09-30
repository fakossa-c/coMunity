import type { Metadata } from "next";
import Link from "next/link";
import { classesBouton } from "@/components/bouton";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { CarteEspaceCommun } from "@/components/carte-espace-commun";
import { Annonce } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { TitreSection } from "@/components/titre-section";
import { lireEspacesCommuns, lireHeureCalme } from "@/lib/regles-residence";
import { accesSyndic, RETOUR_ACCUEIL } from "../acces";
import { HeureCalme } from "./heure-calme";

export const metadata: Metadata = { title: "Espaces communs" };

type Props = {
  searchParams: Promise<{ fait?: string; nom?: string }>;
};

const CONFIRMATIONS: Record<string, (nom: string) => string> = {
  ajoute: (nom) => `« ${nom} » est ajouté aux espaces communs.`,
  enregistre: (nom) => `« ${nom} » est enregistré.`,
  supprime: (nom) => `« ${nom} » est supprimé.`,
};

export default async function EspacesCommuns({ searchParams }: Props) {
  const { refus } = await accesSyndic("/syndic/espaces-communs");
  if (refus)
    return <EcranSecondaire retour={RETOUR_ACCUEIL}>{refus}</EcranSecondaire>;

  const { fait, nom } = await searchParams;
  const [espaces, heureCalme] = await Promise.all([
    lireEspacesCommuns(),
    lireHeureCalme(),
  ]);
  const confirmation = fait && nom ? CONFIRMATIONS[fait]?.(nom) : undefined;

  return (
    <EcranSyndic rubrique="espaces-communs">
      <div className="desktop:flex desktop:items-start desktop:justify-between desktop:gap-8">
        <TitrePage
          titre="Espaces communs"
          sousTitre="Les lieux où les voisins se retrouvent, avec leurs règles, et l'heure de calme de la résidence."
        />
        {/* Sur ordinateur, le bouton d'ajout est en tête ; sur mobile, il reste sous la liste. */}
        <div className="hidden shrink-0 desktop:mt-2.5 desktop:block">
          <Link
            href="/syndic/espaces-communs/nouveau"
            className={classesBouton("action")}
          >
            <Icone nom="add" taille={24} />
            Nouvel espace
          </Link>
        </div>
      </div>
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
              Ajoutez la salle commune, la cour ou le jardin : les voisins les
              choisiront en proposant une activité.
            </p>
          ) : (
            <ul
              aria-label="Espaces communs"
              className="flex flex-col gap-space-md desktop:grid desktop:grid-cols-3 desktop:gap-6"
            >
              {espaces.map((espace) => (
                <CarteEspaceCommun
                  key={espace.id}
                  espace={espace}
                  href={`/syndic/espaces-communs/${espace.id}`}
                />
              ))}
            </ul>
          )}
          <div className="desktop:hidden">
            <Link
              href="/syndic/espaces-communs/nouveau"
              className={classesBouton("action", true)}
            >
              <Icone nom="add" taille={24} />
              Ajouter un espace commun
            </Link>
          </div>
        </section>
      </div>
    </EcranSyndic>
  );
}
