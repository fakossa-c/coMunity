import type { Metadata } from "next";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { clientSession } from "@/lib/supabase/serveur";
import { accesSyndic, RETOUR_ACCUEIL } from "../acces";
import { GestionMembres } from "./gestion-membres";

export const metadata: Metadata = { title: "Conseil syndical" };

export default async function MembresDuSyndic() {
  const { session, refus } = await accesSyndic("/syndic/membres");
  if (refus)
    return <EcranSecondaire retour={RETOUR_ACCUEIL}>{refus}</EcranSecondaire>;

  const supabase = await clientSession();
  const { data: membres, error } = await supabase
    .from("profil")
    .select("id, email")
    .eq("role", "syndic")
    .eq("statut", "valide")
    .order("email");
  if (error) throw new Error(`Liste des membres illisible : ${error.message}`);

  return (
    <EcranSyndic rubrique="membres">
      <TitrePage
        titre="Conseil syndical"
        sousTitre="Invitez un membre par email, ou retirez l'accès de celui qui quitte le conseil syndical."
      />
      <GestionMembres membres={membres} idMoi={session.id} />
    </EcranSyndic>
  );
}
