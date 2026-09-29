import type { Metadata } from "next";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { saisieCopie } from "@/lib/annonces";
import { lireAnnonce } from "@/lib/lecture-annonces";
import { accesSyndic } from "../../acces";
import { FormulaireAnnonce } from "../formulaire-annonce";

const RETOUR = { href: "/syndic/annonces", libelle: "Annuler" };

export const metadata: Metadata = { title: "Publier une annonce" };

type Props = { searchParams: Promise<{ copie?: string }> };

export default async function PublierUneAnnonce({ searchParams }: Props) {
  const { copie } = await searchParams;
  const { refus } = await accesSyndic("/syndic/annonces/nouvelle");
  if (refus)
    return (
      <EcranSecondaire retour={RETOUR} pleineLargeur>
        {refus}
      </EcranSecondaire>
    );

  const original = copie ? await lireAnnonce(copie) : null;

  return (
    <EcranSecondaire retour={RETOUR} actionDansLeFormulaire pleineLargeur>
      <TitrePage
        titre="Publier une annonce"
        sousTitre={
          original
            ? `Copie de « ${original.titre} » : ajustez ce qui change, puis publiez.`
            : "Les résidents la liront dans l'onglet Annonces, et vous pourrez partager son lien."
        }
      />
      <FormulaireAnnonce
        annonce={original ? { saisie: saisieCopie(original) } : undefined}
      />
    </EcranSecondaire>
  );
}
