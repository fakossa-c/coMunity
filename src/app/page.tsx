import { AideInstallation } from "@/components/aide-installation";
import { Bientot } from "@/components/bientot";
import { EcranPrincipal } from "@/components/cadre";
import { CarteActivite, type Activite } from "@/components/carte-activite";
import { TitrePage } from "@/components/titre-page";
import { clientSession } from "@/lib/supabase/serveur";

const MESSAGE_VIDE =
  "Aucune activité n'est prévue pour le moment. Les prochaines propositions des voisins et du conseil syndical apparaîtront ici.";

export default async function Activites() {
  const supabase = await clientSession();
  const { data: peutConsulter } = await supabase.rpc("peut_consulter");

  return (
    <EcranPrincipal onglet="accueil">
      <TitrePage
        titre="Activités"
        sousTitre="Découvrez et participez à la vie de la résidence"
      />
      <AideInstallation />
      {peutConsulter ? (
        <Catalogue />
      ) : (
        <Bientot icone="diversity_3" message={MESSAGE_VIDE} />
      )}
    </EcranPrincipal>
  );
}

async function Catalogue() {
  const supabase = await clientSession();
  const { data, error } = await supabase.rpc("catalogue_activites");
  if (error)
    throw new Error(`Catalogue des activités illisible : ${error.message}`);
  const activites = data as Activite[];

  if (activites.length === 0) {
    return <Bientot icone="diversity_3" message={MESSAGE_VIDE} />;
  }

  return (
    <ul aria-label="Activités à venir" className="flex flex-col gap-space-sm">
      {activites.map((activite) => (
        <li key={activite.id}>
          <CarteActivite activite={activite} />
        </li>
      ))}
    </ul>
  );
}
