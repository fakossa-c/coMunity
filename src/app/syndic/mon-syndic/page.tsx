import type { Metadata } from "next";
import Link from "next/link";
import { classesBouton } from "@/components/bouton";
import { EcranSecondaire } from "@/components/cadre";
import { Annonce } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { lireFichesSyndic } from "@/lib/lecture-fiches-syndic";
import { accesSyndic } from "../acces";
import { ListeFiches } from "./liste-fiches";

const RETOUR = { href: "/syndic", libelle: "Espace syndic" };

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
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const { fait, nom } = await searchParams;
  const fiches = await lireFichesSyndic();
  const confirmation = fait && nom ? CONFIRMATIONS[fait]?.(nom) : undefined;

  return (
    <EcranSecondaire retour={RETOUR}>
      <TitrePage
        titre="Mon syndic"
        sousTitre="Les personnes du syndic que les résidents voient dans Mon syndic, avec leur photo, leur téléphone et leur e-mail."
      />
      <div className="flex flex-col gap-space-lg">
        <Annonce message={confirmation} />
        {fiches.length === 0 ? (
          <p className="max-w-[65ch] text-body-lg text-on-surface-variant">
            Aucune fiche pour le moment : ajoutez la première, les résidents la
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
        <Link
          href="/syndic/mon-syndic/nouvelle"
          className={classesBouton("action", true)}
        >
          <Icone nom="add" taille={24} />
          Ajouter une fiche
        </Link>
      </div>
    </EcranSecondaire>
  );
}
