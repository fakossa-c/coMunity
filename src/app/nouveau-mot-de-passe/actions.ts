"use server";

import { redirect } from "next/navigation";
import {
  refusMotDePasseAuth,
  refusNouveauMotDePasse,
} from "@/lib/mot-de-passe";
import {
  identiteSaisie,
  refusIdentite,
  type Identite,
} from "@/lib/nom-complet";
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
  const motDePasseRefuse = refusNouveauMotDePasse(motDePasse, confirmation);
  if (motDePasseRefuse) return refus(motDePasseRefuse);

  const supabase = await clientSession();
  const { data, error } = await supabase.auth.updateUser({
    password: motDePasse,
  });
  const refusAuth = refusMotDePasseAuth(error?.code, "l'ancien");
  if (refusAuth) return refus(refusAuth);
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
