import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { TitrePage } from "@/components/titre-page";

export const metadata: Metadata = { title: "Mon Événement" };

export default function MonEvenement() {
  return (
    <>
      <TitrePage
        titre="Mon Événement"
        sousTitre="Les activités auxquelles vous participez et celles que vous organisez"
      />
      <Bientot
        icone="event_available"
        message="Cette rubrique ouvrira bientôt."
      />
    </>
  );
}
