import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { nomFiche, saisieDepuisFiche } from "@/lib/fiche-syndic";
import {
  lireComptesReliables,
  lireFichesSyndic,
} from "@/lib/lecture-fiches-syndic";
import { accesSyndic } from "../../acces";
import { FormulaireFiche } from "../formulaire-fiche";

const RETOUR = { href: "/syndic/mon-syndic", libelle: "Annuler" };

export const metadata: Metadata = { title: "Modifier une fiche" };

type Props = { params: Promise<{ id: string }> };

export default async function ModifierFiche({ params }: Props) {
  const { id } = await params;
  const { refus } = await accesSyndic(`/syndic/mon-syndic/${id}`);
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const fiche = (await lireFichesSyndic()).find((f) => f.id === id);
  if (!fiche) notFound();

  return (
    <EcranSecondaire retour={RETOUR} actionDansLeFormulaire>
      <TitrePage titre="Modifier une fiche" sousTitre={nomFiche(fiche)} />
      <FormulaireFiche
        comptes={await lireComptesReliables(fiche.compte_id)}
        fiche={{
          id: fiche.id,
          saisie: saisieDepuisFiche(fiche),
          photoChemin: fiche.photo_chemin,
          photoUrl: fiche.photo_url,
        }}
      />
    </EcranSecondaire>
  );
}
