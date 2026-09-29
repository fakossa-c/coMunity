import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { ReglementInterieur } from "@/components/reglement-interieur";
import { TitrePage } from "@/components/titre-page";
import { lireReglement } from "@/lib/lecture-reglement";
import { estSyndicActif, lireSession, statutResident } from "@/lib/session";

export const metadata: Metadata = { title: "Ma copro" };

export default async function MaCopro() {
  const session = await lireSession();
  if (!session) redirect("/connexion?suivant=%2Fma-copro");

  // Un résident refusé ou retiré ne voit que son message d'état, posé par l'écran.
  const statut = statutResident(session);
  const peutLire =
    estSyndicActif(session) || statut === "valide" || statut === "en_attente";
  const reglement = peutLire ? await lireReglement() : null;

  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <TitrePage
        titre="Ma copro"
        sousTitre="Le règlement intérieur de la résidence"
      />
      {reglement ? (
        <ReglementInterieur {...reglement} />
      ) : (
        <Bientot
          icone="lock"
          message="Votre compte n'a pas accès à cette rubrique. Si c'est une erreur, adressez-vous à un membre du conseil syndical."
        />
      )}
    </EcranSecondaire>
  );
}
