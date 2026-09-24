"use server";

import { revalidatePath } from "next/cache";
import { clientAdmin, clientSession } from "@/lib/supabase/serveur";
import type { Resultat } from "@/lib/resultat";

export type Membre = { id: string; email: string };

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invite un collègue. L'invitation est d'abord enregistrée au nom de la personne connectée :
 * la base refuse si elle n'est pas membre du syndic. Ensuite seulement, l'email part.
 */
export async function inviterCollegue(email: string): Promise<Resultat> {
  const adresse = email.trim().toLowerCase();
  if (!FORMAT_EMAIL.test(adresse)) {
    return {
      ok: false,
      message:
        "Saisissez une adresse email complète, par exemple prenom.nom@exemple.fr.",
    };
  }

  const supabase = await clientSession();
  const invitation = await supabase
    .from("invitation_syndic")
    .insert({ email: adresse });
  // 23505 : une invitation précédente attend encore ; on renvoie l'email.
  if (invitation.error && invitation.error.code !== "23505") {
    return {
      ok: false,
      message:
        invitation.error.code === "42501"
          ? "Seuls les membres du syndic peuvent inviter un collègue."
          : "L'invitation n'a pas pu être enregistrée. Réessayez dans un instant.",
    };
  }

  const { error } = await clientAdmin().auth.admin.inviteUserByEmail(adresse);
  if (error) {
    await supabase.from("invitation_syndic").delete().eq("email", adresse);
    return {
      ok: false,
      message:
        error.code === "email_exists"
          ? `${adresse} a déjà un compte sur la plateforme : cette adresse ne peut pas être invitée.`
          : "L'email d'invitation n'a pas pu partir. Réessayez dans un instant.",
    };
  }

  revalidatePath("/syndic/membres");
  return {
    ok: true,
    message: `Invitation envoyée à ${adresse}. Votre collègue apparaît dans la liste et pourra se connecter dès que son mot de passe sera choisi.`,
  };
}

export async function retirerMembre(membre: Membre): Promise<Resultat> {
  const supabase = await clientSession();
  const { error } = await supabase.rpc("retirer_membre_syndic", {
    membre: membre.id,
  });
  if (error) {
    const messages: Record<string, string> = {
      "42501": "Seuls les membres du syndic peuvent retirer un accès.",
      P0001: "Vous ne pouvez pas retirer votre propre accès.",
      P0002: `${membre.email} n'a déjà plus accès à l'espace syndic.`,
    };
    return {
      ok: false,
      message:
        messages[error.code] ??
        "Le retrait n'a pas abouti. Réessayez dans un instant.",
    };
  }

  revalidatePath("/syndic/membres");
  return { ok: true, message: `Accès retiré à ${membre.email}.` };
}
