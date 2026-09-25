import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { BoutonFlottant } from "@/components/bouton-flottant";
import { EcranPrincipal } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

export const metadata: Metadata = { title: "Activités" };

export default function Activites() {
  return (
    <EcranPrincipal
      onglet="activites"
      flottant={<BoutonFlottant href="/proposer">Proposer</BoutonFlottant>}
    >
      <TitrePage
        titre="Activités"
        sousTitre="Vos inscriptions et vos propositions"
      />
      <Bientot icone="diversity_3" />
    </EcranPrincipal>
  );
}
