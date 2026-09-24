import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { clientSession } from "@/lib/supabase/serveur";
import { FormulaireActivite } from "./formulaire-activite";

export const metadata: Metadata = { title: "Proposer" };

export default async function Proposer() {
  const supabase = await clientSession();
  const { data: peutParticiper } = await supabase.rpc("peut_participer");

  return (
    <EcranSecondaire retour={{ href: "/activites", libelle: "Activités" }}>
      <TitrePage
        titre="Proposer"
        sousTitre="Lancez une activité avec vos voisins"
      />
      {peutParticiper ? (
        <FormulaireActivite />
      ) : (
        <Bientot
          icone="add_circle"
          message="Vous pourrez proposer une activité dès que votre compte sera validé par le syndic."
        />
      )}
    </EcranSecondaire>
  );
}
