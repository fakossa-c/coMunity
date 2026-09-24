import { AideInstallation } from "@/components/aide-installation";
import { Bientot } from "@/components/bientot";
import { EcranPrincipal } from "@/components/cadre";
import { CarteActivite } from "@/components/carte-activite";
import { TitrePage } from "@/components/titre-page";
import { clientSession } from "@/lib/supabase/serveur";

const MESSAGE_VIDE =
  "Aucune activité n'est prévue pour le moment. Les prochaines propositions des voisins et du syndic apparaîtront ici.";

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
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("activite")
    .select(
      "id, titre, categorie, pictogramme, date_activite, heure_debut, lieu",
    )
    .gte("date_activite", aujourdhui)
    .order("date_activite")
    .order("heure_debut");
  if (error)
    throw new Error(`Catalogue des activités illisible : ${error.message}`);

  if (data.length === 0) {
    return <Bientot icone="diversity_3" message={MESSAGE_VIDE} />;
  }

  return (
    <ul aria-label="Activités à venir" className="flex flex-col gap-space-sm">
      {data.map((activite) => (
        <li key={activite.id}>
          <CarteActivite activite={activite} />
        </li>
      ))}
    </ul>
  );
}
