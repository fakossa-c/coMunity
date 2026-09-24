import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

export const metadata: Metadata = { title: "Mon syndic" };

export default function MonSyndic() {
  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <TitrePage titre="Mon syndic" sousTitre="Contacts et demandes" />
      <Bientot icone="support_agent" />
    </EcranSecondaire>
  );
}
