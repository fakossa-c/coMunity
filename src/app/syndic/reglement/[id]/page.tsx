import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { clientSession } from "@/lib/supabase/serveur";
import { accesSyndic } from "../../acces";
import { ColonneFormulaire } from "../../colonne-formulaire";
import { FormulaireSection } from "../formulaire-section";

const RETOUR = {
  href: "/syndic/reglement",
  destination: "Règlement intérieur",
};

export const metadata: Metadata = { title: "Modifier une section" };

type Props = { params: Promise<{ id: string }> };

export default async function ModifierSection({ params }: Props) {
  const { id } = await params;
  const { refus } = await accesSyndic(`/syndic/reglement/${id}`);
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const supabase = await clientSession();
  const { data: section } = await supabase
    .from("section_reglement")
    .select("id, titre, texte")
    .eq("id", id)
    .maybeSingle();
  if (!section) notFound();

  return (
    <EcranSyndic rubrique="reglement" retour={RETOUR} actionDansLeFormulaire>
      <ColonneFormulaire>
        <TitrePage titre="Modifier une section" sousTitre={section.titre} />
        <FormulaireSection
          section={{
            id: section.id,
            saisie: { titre: section.titre, texte: section.texte },
          }}
        />
      </ColonneFormulaire>
    </EcranSyndic>
  );
}
