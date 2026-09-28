import { BarreFiltres } from "@/components/barre-filtres";
import { Onglets as OngletsDS } from "@/components/onglets";
import { PuceFiltre } from "@/components/puce-filtre";

/**
 * Onglets « J'y vais / J'organise » et puces « À venir / Passées » de l'onglet Activités.
 * « J'y vais » à venir (#8) et passées (#15), « J'organise » à venir et passées (#12).
 * Conformes au design system (#74) : soulignement terre cuite pour l'onglet actif, puces pêche
 * pleines avec pictogramme et coche, le tout collé en haut de l'écran.
 */
export function Onglets({
  onglet,
  puce,
}: {
  onglet: "j_y_vais" | "j_organise";
  puce: "a_venir" | "passees";
}) {
  return (
    <BarreFiltres
      variante="liste"
      avant={
        <OngletsDS
          libelleGroupe="Mes activités"
          actif={onglet}
          onglets={[
            {
              id: "j_y_vais",
              libelle: "J'y vais",
              href: "/activites?onglet=j_y_vais",
            },
            {
              id: "j_organise",
              libelle: "J'organise",
              href: "/activites?onglet=j_organise",
            },
          ]}
        />
      }
    >
      <PuceFiltre
        selectionnee={puce === "a_venir"}
        icone="event"
        href={`/activites?onglet=${onglet}&puce=a_venir`}
      >
        À venir
      </PuceFiltre>
      <PuceFiltre
        selectionnee={puce === "passees"}
        icone="history"
        href={`/activites?onglet=${onglet}&puce=passees`}
      >
        Passées
      </PuceFiltre>
    </BarreFiltres>
  );
}
