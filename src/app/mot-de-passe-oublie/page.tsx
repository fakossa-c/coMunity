import type { Metadata } from "next";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { FormulaireMotDePasseOublie } from "./formulaire";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOublie() {
  return (
    <EcranSecondaire
      retour={{ href: "/connexion", libelle: "Connexion" }}
      avecCompte={false}
    >
      <div className="max-w-md">
        <TitrePage
          titre="Mot de passe oublié"
          sousTitre="Saisissez votre email : vous recevrez un lien pour choisir un nouveau mot de passe."
        />
        <FormulaireMotDePasseOublie />
      </div>
    </EcranSecondaire>
  );
}
