import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import type { CentreInteret } from "@/lib/centres-interet";
import { lireSession } from "@/lib/session";
import { clientSession } from "@/lib/supabase/serveur";
import { TitrePage } from "@/components/titre-page";
import { MesInterets } from "./mes-interets";

export const metadata: Metadata = { title: "Mes intérêts" };

export default async function PageMesInterets() {
  const session = await lireSession();
  if (!session) redirect("/connexion?suivant=%2Fprofil%2Finterets");

  const supabase = await clientSession();
  const { data } = await supabase
    .from("centre_interet")
    .select("id, libelle")
    .order("cree_le");

  return (
    <EcranSecondaire retour={{ href: "/profil", libelle: "Profil" }}>
      <div className="flex max-w-xl flex-col gap-bloc desktop:max-w-none">
        <TitrePage
          journal
          titre="Mes intérêts"
          sousTitre="Ce qui vous plaît, en quelques mots : jardinage, jeux de société, cuisine…"
        />
        <MesInterets interets={(data ?? []) as CentreInteret[]} />
      </div>
    </EcranSecondaire>
  );
}
