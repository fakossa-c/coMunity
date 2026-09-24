import type { Metadata } from "next";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { clientSession } from "@/lib/supabase/serveur";
import { accesSyndic } from "../acces";
import { GestionMembres } from "./gestion-membres";

const RETOUR = { href: "/syndic", libelle: "Espace syndic" };

export const metadata: Metadata = { title: "Membres du syndic" };

export default async function MembresDuSyndic() {
  const { session, refus } = await accesSyndic("/syndic/membres");
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const supabase = await clientSession();
  const { data: membres, error } = await supabase
    .from("profil")
    .select("id, email")
    .eq("role", "syndic")
    .eq("statut", "valide")
    .order("email");
  if (error) throw new Error(`Liste des membres illisible : ${error.message}`);

  return (
    <EcranSecondaire retour={RETOUR}>
      <TitrePage
        titre="Membres du syndic"
        sousTitre="Invitez un collègue par email ou retirez l'accès d'un membre qui quitte l'équipe."
      />
      <GestionMembres membres={membres} idMoi={session.id} />
    </EcranSecondaire>
  );
}
