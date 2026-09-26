"use server";

import { redirect } from "next/navigation";
import { cheminInterne } from "@/lib/chemin-interne";
import {
  identiteSaisie,
  refusIdentite,
  type Identite,
} from "@/lib/nom-complet";
import type { ErreurFormulaire } from "@/lib/resultat";
import { accueilDe, lireSession } from "@/lib/session";
import { clientSession } from "@/lib/supabase/serveur";

export type EtatCompletion = ErreurFormulaire<"prenom" | "nom"> & {
  /** Change à chaque envoi refusé : le formulaire repart de la saisie renvoyée. */
  essai: number;
  saisie?: Identite;
};

export async function completerProfil(
  etat: EtatCompletion,
  donnees: FormData,
): Promise<EtatCompletion> {
  const saisie = identiteSaisie(donnees);
  const essai = etat.essai + 1;
  const refus = refusIdentite(saisie);
  if (refus) return { ...refus, essai, saisie };

  const supabase = await clientSession();
  const { error } = await supabase.rpc("completer_profil", saisie);
  // P0002 : le profil était déjà complet, par exemple après un double envoi.
  if (error && error.code !== "P0002") {
    return {
      erreur:
        "Votre prénom et votre nom n'ont pas pu être enregistrés. Réessayez dans un instant.",
      essai,
      saisie,
    };
  }

  redirect(
    await accueilDe(await lireSession(), cheminInterne(donnees.get("suivant"))),
  );
}
