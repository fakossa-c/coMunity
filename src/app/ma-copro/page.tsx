import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

export const metadata: Metadata = { title: "Ma copro" };

export default function MaCopro() {
  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <TitrePage
        titre="Ma copro"
        sousTitre="Résidence, conseil syndical, documents"
      />
      <Bientot icone="apartment" />
    </EcranSecondaire>
  );
}
