import { AideInstallation } from "@/components/aide-installation";
import { Bientot } from "@/components/bientot";
import { TitrePage } from "@/components/titre-page";

export default function Activites() {
  return (
    <>
      <TitrePage
        titre="Activités"
        sousTitre="Découvrez et participez à la vie de la résidence"
      />
      <AideInstallation />
      <Bientot
        icone="diversity_3"
        message="Aucune activité n'est prévue pour le moment. Les prochaines propositions des voisins et du syndic apparaîtront ici."
      />
    </>
  );
}
