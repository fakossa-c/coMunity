import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bientot } from "@/components/bientot";
import { CarteFicheSyndic } from "@/components/carte-fiche-syndic";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireFichesSyndic } from "@/lib/lecture-fiches-syndic";
import { estSyndicActif, lireSession, statutResident } from "@/lib/session";

export const metadata: Metadata = { title: "Mon syndic" };

export default async function MonSyndic() {
  const session = await lireSession();
  if (!session) redirect("/connexion?suivant=%2Fmon-syndic");

  // Un résident refusé ou retiré ne voit que son message d'état, posé par l'écran.
  const statut = statutResident(session);
  const peutLire =
    estSyndicActif(session) || statut === "valide" || statut === "en_attente";
  const fiches = peutLire ? await lireFichesSyndic() : null;

  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <TitrePage titre="Mon syndic" sousTitre="Contacts et demandes" />
      {fiches === null ? (
        <Bientot
          icone="lock"
          message="Votre compte n'a pas accès à cette rubrique. Si c'est une erreur, adressez-vous à un membre du conseil syndical."
        />
      ) : fiches.length === 0 ? (
        <Bientot
          icone="support_agent"
          message="Personne n'est encore présenté ici. Le conseil syndical ajoutera bientôt les contacts du syndic."
        />
      ) : (
        <ul
          aria-label="Personnes du syndic"
          className="flex flex-col gap-space-md"
        >
          {fiches.map((fiche) => (
            <CarteFicheSyndic key={fiche.id} fiche={fiche} />
          ))}
        </ul>
      )}
    </EcranSecondaire>
  );
}
