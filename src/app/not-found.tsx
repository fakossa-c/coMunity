import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

export const metadata: Metadata = { title: "Page introuvable" };

export default function PageIntrouvable() {
  return (
    <EcranSecondaire retour={{ href: "/", destination: "Accueil" }}>
      <TitrePage
        titre="Page introuvable"
        sousTitre="Cette page n'existe pas."
      />
      <Bientot
        icone="home"
        message="Elle a peut-être été déplacée. Retrouvez les activités et les annonces depuis l'Accueil."
      />
    </EcranSecondaire>
  );
}
