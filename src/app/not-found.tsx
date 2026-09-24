import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

export const metadata: Metadata = { title: "Page introuvable" };

export default function PageIntrouvable() {
  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <TitrePage
        titre="Page introuvable"
        sousTitre="Cette adresse ne mène à aucune page de l'app."
      />
      <Bientot
        icone="home"
        message="La page a peut-être été déplacée. Retrouvez les activités et les annonces depuis l'accueil."
      />
    </EcranSecondaire>
  );
}
