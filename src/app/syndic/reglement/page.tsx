import type { Metadata } from "next";
import Link from "next/link";
import { classesBouton } from "@/components/bouton";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { Annonce } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { lireReglement } from "@/lib/lecture-reglement";
import { dateReglement } from "@/lib/reglement";
import { accesSyndic, RETOUR_ACCUEIL } from "../acces";
import { ListeSections } from "./liste-sections";

export const metadata: Metadata = { title: "Règlement intérieur" };

type Props = {
  searchParams: Promise<{ fait?: string; titre?: string }>;
};

const CONFIRMATIONS: Record<string, (titre: string) => string> = {
  ajoutee: (titre) => `« ${titre} » est ajoutée au règlement intérieur.`,
  enregistree: (titre) => `« ${titre} » est enregistrée.`,
  supprimee: (titre) => `« ${titre} » est supprimée.`,
};

export default async function ReglementInterieurSyndic({
  searchParams,
}: Props) {
  const { refus } = await accesSyndic("/syndic/reglement");
  if (refus)
    return <EcranSecondaire retour={RETOUR_ACCUEIL}>{refus}</EcranSecondaire>;

  const { fait, titre } = await searchParams;
  const { sections, misAJourLe } = await lireReglement();
  const confirmation = fait && titre ? CONFIRMATIONS[fait]?.(titre) : undefined;
  // La date ne se dit que s'il y a des sections à dater.
  const miseAJour = sections.length > 0 ? misAJourLe : null;

  return (
    <EcranSyndic rubrique="reglement">
      <TitrePage
        titre="Règlement intérieur"
        sousTitre="Les règles de vie de la résidence, que les résidents lisent dans Ma copro, section par section."
      />
      {/* Sur ordinateur, une colonne de 960 px au plus, « Nouvelle section » en tête ; sur mobile,
          « Ajouter une section » reste sous la liste. */}
      <div className="flex flex-col gap-space-lg desktop:max-w-[60rem]">
        <Annonce message={confirmation} />
        <div
          // Sans date, la ligne n'existe que sur ordinateur, pour le bouton.
          className={
            miseAJour
              ? "desktop:flex desktop:items-center desktop:justify-between desktop:gap-8"
              : "hidden desktop:flex desktop:justify-end"
          }
        >
          {miseAJour && (
            <p className="text-body-md text-on-surface-variant">
              {`Mis à jour le ${dateReglement(miseAJour)}`}
            </p>
          )}
          <div className="hidden shrink-0 desktop:ml-auto desktop:block">
            <Link
              href="/syndic/reglement/nouvelle"
              className={classesBouton("action")}
            >
              <Icone nom="add" taille={24} />
              Nouvelle section
            </Link>
          </div>
        </div>
        {sections.length === 0 ? (
          <p className="max-w-[65ch] text-body-lg text-on-surface-variant">
            Aucune section pour le moment : ajoutez la première, les résidents
            la liront dans Ma copro.
          </p>
        ) : (
          <ListeSections
            sections={sections.map(({ id, titre }) => ({ id, titre }))}
          />
        )}
        <div className="desktop:hidden">
          <Link
            href="/syndic/reglement/nouvelle"
            className={classesBouton("action", true)}
          >
            <Icone nom="add" taille={24} />
            Ajouter une section
          </Link>
        </div>
      </div>
    </EcranSyndic>
  );
}
