import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { amorcerSyndic } from "../../scripts/amorcer-syndic.mjs";
import { lireSupabaseLocal } from "../../scripts/supabase-local.mjs";

const local = lireSupabaseLocal();

export const MOT_DE_PASSE = "mot-de-passe-de-test";

export function nouvelEmail(prefixe: string) {
  return `${prefixe}-${randomUUID().slice(0, 8)}@exemple.fr`;
}

function clientAdmin() {
  return createClient(local.url, local.cleSecrete, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Un membre du syndic créé par le script d'amorçage. */
export async function nouveauSyndic() {
  const email = nouvelEmail("syndic");
  const utilisateur = await amorcerSyndic({
    url: local.url,
    cleSecrete: local.cleSecrete,
    email,
    motDePasse: MOT_DE_PASSE,
  });
  return { id: utilisateur.id, email };
}

/** Un résident, validé sauf mention contraire. */
export async function nouveauResident(
  statut: "en_attente" | "valide" | "refuse" | "retire" = "valide",
) {
  const admin = clientAdmin();
  const email = nouvelEmail("resident");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: MOT_DE_PASSE,
    email_confirm: true,
  });
  if (error) throw error;
  const profil = await admin.from("profil").insert({
    id: data.user.id,
    email,
    role: "resident",
    statut,
    prenom: "Danielle",
    batiment: "B",
    etage: 2,
  });
  if (profil.error) throw profil.error;
  return { id: data.user.id, email };
}

/** Le code de résidence en vigueur, lu comme le fait le serveur. */
export async function codeResidence(): Promise<string> {
  const { data, error } = await clientAdmin()
    .from("residence")
    .select("code")
    .single();
  if (error) throw error;
  return data.code;
}

/** Supprime les comptes créés pendant un test, invités compris. */
export async function supprimerComptes(emails: string[]) {
  const admin = clientAdmin();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const aSupprimer = data.users.filter((u) => emails.includes(u.email ?? ""));
  await Promise.all(aSupprimer.map((u) => admin.auth.admin.deleteUser(u.id)));
}

/**
 * Attend l'email reçu par `destinataire` dans la boîte locale de Supabase
 * et renvoie le chemin du lien qu'il contient (sans l'origine, pour le rejouer sur le serveur de test).
 */
export async function lienRecu(destinataire: string) {
  const recherche = `${local.urlBoiteMail}/api/v1/search?query=${encodeURIComponent(`to:"${destinataire}"`)}`;
  for (let essai = 0; essai < 40; essai++) {
    const { messages } = await (await fetch(recherche)).json();
    if (messages.length > 0) {
      const message = await (
        await fetch(`${local.urlBoiteMail}/api/v1/message/${messages[0].ID}`)
      ).json();
      const lien = /href="([^"]*token_hash[^"]*)"/.exec(message.HTML)?.[1];
      if (!lien) throw new Error(`Aucun lien dans l'email : ${message.HTML}`);
      const url = new URL(lien.replaceAll("&amp;", "&"));
      return url.pathname + url.search;
    }
    await new Promise((resoudre) => setTimeout(resoudre, 250));
  }
  throw new Error(`Aucun email reçu par ${destinataire}`);
}
