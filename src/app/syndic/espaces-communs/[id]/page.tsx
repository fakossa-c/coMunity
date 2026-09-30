import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import {
  COLONNES_ESPACE,
  saisieDepuisEspace,
  type EspaceCommun,
} from "@/lib/espaces-communs";
import { lireUrlsMediasEspace } from "@/lib/regles-residence";
import { clientSession } from "@/lib/supabase/serveur";
import { accesSyndic } from "../../acces";
import { ColonneFormulaire } from "../../colonne-formulaire";
import { FormulaireEspace } from "../formulaire-espace";

const RETOUR = {
  href: "/syndic/espaces-communs",
  destination: "Espaces communs",
};

export const metadata: Metadata = { title: "Modifier un espace commun" };

type Props = { params: Promise<{ id: string }> };

export default async function ModifierEspaceCommun({ params }: Props) {
  const { id } = await params;
  const { refus } = await accesSyndic(`/syndic/espaces-communs/${id}`);
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const supabase = await clientSession();
  const { data: espace } = await supabase
    .from("espace_commun")
    .select(COLONNES_ESPACE)
    .eq("id", id)
    .maybeSingle<EspaceCommun>();
  if (!espace) notFound();
  const medias = await lireUrlsMediasEspace(espace);

  return (
    <EcranSyndic
      rubrique="espaces-communs"
      retour={RETOUR}
      actionDansLeFormulaire
    >
      <ColonneFormulaire>
        <TitrePage titre="Modifier un espace commun" sousTitre={espace.nom} />
        <FormulaireEspace
          espace={{
            id: espace.id,
            saisie: saisieDepuisEspace(espace),
            photos: medias.photos,
            plan: medias.plan,
          }}
        />
      </ColonneFormulaire>
    </EcranSyndic>
  );
}
