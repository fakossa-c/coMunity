import type { Metadata } from "next";
import Link from "next/link";
import { classesBouton } from "@/components/bouton";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { Annonce } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { lireFichesSyndic } from "@/lib/lecture-fiches-syndic";
import { accesSyndic, RETOUR_ACCUEIL } from "../acces";
import { ListeFiches } from "./liste-fiches";

export const metadata: Metadata = { title: "Mon syndic" };

type Props = {
  searchParams: Promise<{ fait?: string; nom?: string }>;
};

const CONFIRMATIONS: Record<string, (nom: string) => string> = {
  ajoutee: (nom) => `La fiche de ${nom} est ajoutée à Mon syndic.`,
  enregistree: (nom) => `La fiche de ${nom} est enregistrée.`,
  supprimee: (nom) => `La fiche de ${nom} est supprimée.`,
};

export default async function MonSyndicSyndic({ searchParams }: Props) {
  const { refus } = await accesSyndic("/syndic/mon-syndic");
  if (refus)
    return <EcranSecondaire retour={RETOUR_ACCUEIL}>{refus}</EcranSecondaire>;

  const { fait, nom } = await searchParams;
  const fiches = await lireFichesSyndic();
  const confirmation = fait && nom ? CONFIRMATIONS[fait]?.(nom) : undefined;

  return (
    <EcranSyndic rubrique="mon-syndic">
      <TitrePage
        titre="Mon syndic"
        sousTitre="Les contacts du syndic que les résidents retrouvent dans Mon syndic."
      />
      {/* Sur ordinateur, une colonne de 960 px au plus, « Nouvelle fiche » en tête, à droite ; sur
          mobile, « Ajouter une fiche » reste sous la liste. */}
      <div className="flex flex-col gap-space-lg desktop:max-w-[60rem]">
        <Annonce message={confirmation} />
        <div className="hidden desktop:flex desktop:justify-end">
          <Link
            href="/syndic/mon-syndic/nouvelle"
            className={classesBouton("action")}
          >
            <Icone nom="add" taille={24} />
            Nouvelle fiche
          </Link>
        </div>
        {fiches.length === 0 ? (
          <p className="max-w-[65ch] text-body-lg text-on-surface-variant">
            Aucune fiche pour le moment : ajoutez la première, les résidents la
            liront dans Mon syndic.
          </p>
        ) : (
          <ListeFiches
            fiches={fiches.map(
              ({ id, prenom, nom, photo_url, sur_comunity }) => ({
                id,
                prenom,
                nom,
                photo_url,
                sur_comunity,
              }),
            )}
          />
        )}
        <div className="desktop:hidden">
          <Link
            href="/syndic/mon-syndic/nouvelle"
            className={classesBouton("action", true)}
          >
            <Icone nom="add" taille={24} />
            Ajouter une fiche
          </Link>
        </div>
      </div>
    </EcranSyndic>
  );
}
