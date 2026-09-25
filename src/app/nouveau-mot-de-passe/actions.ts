"use server";

import { redirect } from "next/navigation";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import { identiteSaisie, refusIdentite, type Identite } from "@/lib/nom-complet";
import type { ErreurFormulaire } from "@/lib/resultat";
import {
  accueilDe,
  doitCompleterProfil,
  lireProfil,
  lireSession,
} from "@/lib/session";
import { clientSession } from "@/lib/supabase/serveur";

export type EtatMotDePasse = ErreurFormulaire<
  "prenom" | "nom" | "mot-de-passe" | "confirmation"
> & {
  /** Change à chaque envoi refusé : le formulaire repart de la saisie renvoyée. */
  essai: number;
  saisie?: Identite;
};

export async function enregistrerMotDePasse(
  etat: EtatMotDePasse,
  donnees: FormData,
): Promise<EtatMotDePasse> {
  // Le collègue invité, qui n'a encore ni prénom ni nom, les saisit ici avec son mot de passe.
  const identite = doitCompleterProfil(await lireSession())
    ? identiteSaisie(donnees)
    : null;
  const refus = (erreur: Omit<EtatMotDePasse, "essai" | "saisie">) => ({
    ...erreur,
    essai: etat.essai + 1,
    saisie: identite ?? undefined,
  });

  const identiteRefusee = identite && refusIdentite(identite);
  if (identiteRefusee) return refus(identiteRefusee);

  const motDePasse = String(donnees.get("mot-de-passe") ?? "");
  const confirmation = String(donnees.get("confirmation") ?? "");
  if (motDePasse.length < LONGUEUR_MINIMALE_MOT_DE_PASSE) {
    return refus({
      erreur: `Choisissez un mot de passe d'au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
      champ: "mot-de-passe",
    });
  }
  if (motDePasse !== confirmation) {
    return refus({
      erreur: "Les deux mots de passe ne sont pas identiques.",
      champ: "confirmation",
    });
  }

  const supabase = await clientSession();
  const { data, error } = await supabase.auth.updateUser({
    password: motDePasse,
  });
  if (error?.code === "same_password") {
    return refus({
      erreur: "Choisissez un mot de passe différent de l'ancien.",
      champ: "mot-de-passe",
    });
  }
  if (error?.code === "weak_password") {
    return refus({
      erreur: `Ce mot de passe est trop faible : au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
      champ: "mot-de-passe",
    });
  }
  if (error) {
    return refus({
      erreur:
        "Le mot de passe n'a pas pu être enregistré. Redemandez un lien depuis « Mot de passe oublié ? ».",
    });
  }

  // En cas d'échec, l'écran de complétion redemandera le prénom et le nom à la page suivante.
  if (identite) await supabase.rpc("completer_profil", identite);

  redirect(await accueilDe(await lireProfil(supabase, data.user.id)));
}
