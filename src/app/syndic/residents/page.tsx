import type { Metadata } from "next";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { clientSession } from "@/lib/supabase/serveur";
import { accesSyndic } from "../acces";
import { GestionResidents } from "./gestion-residents";

const RETOUR = { href: "/syndic", libelle: "Espace syndic" };

export const metadata: Metadata = { title: "Résidents" };

export default async function Residents() {
  const { refus } = await accesSyndic("/syndic/residents");
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("profil")
    .select("id, email, prenom, nom, statut")
    .eq("role", "resident")
    .in("statut", ["en_attente", "valide"])
    .order("cree_le");
  if (error)
    throw new Error(`Liste des résidents illisible : ${error.message}`);

  const valides = data
    .filter((r) => r.statut === "valide")
    .sort((a, b) =>
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"),
    );

  return (
    <EcranSecondaire retour={RETOUR}>
      <TitrePage
        titre="Résidents"
        sousTitre="Validez les comptes des nouveaux résidents et retirez l'accès de ceux qui quittent la résidence."
      />
      <GestionResidents
        enAttente={data.filter((r) => r.statut === "en_attente")}
        valides={valides}
      />
    </EcranSecondaire>
  );
}
