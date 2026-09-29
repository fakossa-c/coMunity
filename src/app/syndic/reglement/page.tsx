import type { Metadata } from "next";
import Link from "next/link";
import { classesBouton } from "@/components/bouton";
import { EcranSecondaire } from "@/components/cadre";
import { Annonce } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { lireReglement } from "@/lib/lecture-reglement";
import { dateReglement } from "@/lib/reglement";
import { accesSyndic } from "../acces";
import { ListeSections } from "./liste-sections";

const RETOUR = { href: "/syndic", libelle: "Espace syndic" };

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
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const { fait, titre } = await searchParams;
  const { sections, misAJourLe } = await lireReglement();
  const confirmation = fait && titre ? CONFIRMATIONS[fait]?.(titre) : undefined;

  return (
    <EcranSecondaire retour={RETOUR}>
      <TitrePage
        titre="Règlement intérieur"
        sousTitre="Les règles de vie de la résidence, que les résidents lisent dans Ma copro, section par section."
      />
      <div className="flex flex-col gap-space-lg">
        <Annonce message={confirmation} />
        {sections.length === 0 ? (
          <p className="max-w-[65ch] text-body-lg text-on-surface-variant">
            Aucune section pour le moment : ajoutez la première, les résidents
            la liront dans Ma copro.
          </p>
        ) : (
          <>
            {misAJourLe && (
              <p className="text-body-md text-on-surface-variant">
                {`Mis à jour le ${dateReglement(misAJourLe)}`}
              </p>
            )}
            <ListeSections
              sections={sections.map(({ id, titre }) => ({ id, titre }))}
            />
          </>
        )}
        <Link
          href="/syndic/reglement/nouvelle"
          className={classesBouton("action", true)}
        >
          <Icone nom="add" taille={24} />
          Ajouter une section
        </Link>
      </div>
    </EcranSecondaire>
  );
}
