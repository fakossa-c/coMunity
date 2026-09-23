import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { TitrePage } from "@/components/titre-page";

export const metadata: Metadata = { title: "Proposer" };

export default function Proposer() {
  return (
    <>
      <TitrePage
        titre="Proposer"
        sousTitre="Lancez une activité avec vos voisins"
      />
      <Bientot icone="add_circle" />
    </>
  );
}
