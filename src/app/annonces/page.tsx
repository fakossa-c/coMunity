import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { EcranPrincipal } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

export const metadata: Metadata = { title: "Annonces" };

export default function Annonces() {
  return (
    <EcranPrincipal onglet="annonces">
      <TitrePage
        titre="Annonces"
        sousTitre="Les informations du conseil syndical"
      />
      <Bientot icone="campaign" />
    </EcranPrincipal>
  );
}
