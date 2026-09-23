import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { TitrePage } from "@/components/titre-page";

export const metadata: Metadata = { title: "Voisins & Profil" };

export default function VoisinsProfil() {
  return (
    <>
      <TitrePage
        titre="Voisins & Profil"
        sousTitre="Votre profil et les voisins qui partagent vos centres d'intérêt"
      />
      <Bientot icone="group" />
    </>
  );
}
