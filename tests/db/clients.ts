import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, inject } from "vitest";
import { amorcerSyndic } from "../../scripts/amorcer-syndic.mjs";

const sansSession = {
  auth: { persistSession: false, autoRefreshToken: false },
};

/** Un client sans session : ce que voit une personne qui ouvre un lien sans être connectée. */
export function clientVisiteur() {
  const { url, cleAnonyme } = inject("supabase");
  return createClient(url, cleAnonyme, sansSession);
}

/** Le client du serveur, qui contourne les politiques RLS : réservé à la préparation des tests. */
export function clientAdmin() {
  const { url, cleSecrete } = inject("supabase");
  return createClient(url, cleSecrete, sansSession);
}

export type Compte = { id: string; email: string; client: SupabaseClient };

const MOT_DE_PASSE = "mot-de-passe-de-test";
const comptesCrees: string[] = [];

afterAll(async () => {
  const admin = clientAdmin();
  await Promise.all(comptesCrees.map((id) => admin.auth.admin.deleteUser(id)));
  comptesCrees.length = 0;
});

/** Une adresse jamais utilisée, pour que les tests ne se marchent pas dessus. */
export function nouvelEmail(prefixe: string) {
  return `${prefixe}-${randomUUID().slice(0, 8)}@exemple.fr`;
}

/** Retient un compte créé hors des helpers, pour le supprimer en fin de fichier. */
export function aSupprimer(id: string) {
  comptesCrees.push(id);
}

/** Un membre du syndic, créé comme le fait le script d'amorçage, et connecté. */
export async function nouveauSyndic(): Promise<Compte> {
  const { url, cleSecrete } = inject("supabase");
  const email = nouvelEmail("syndic");
  const utilisateur = await amorcerSyndic({
    url,
    cleSecrete,
    email,
    motDePasse: MOT_DE_PASSE,
  });
  aSupprimer(utilisateur.id);
  return { id: utilisateur.id, email, client: await connecter(email) };
}

/** Un résident validé, connecté. */
export async function nouveauResident(): Promise<Compte> {
  const admin = clientAdmin();
  const email = nouvelEmail("resident");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: MOT_DE_PASSE,
    email_confirm: true,
  });
  if (error) throw error;
  aSupprimer(data.user.id);
  const insertion = await admin
    .from("profil")
    .insert({ id: data.user.id, email, role: "resident", statut: "valide" });
  if (insertion.error) throw insertion.error;
  return { id: data.user.id, email, client: await connecter(email) };
}

export async function connecter(email: string, motDePasse = MOT_DE_PASSE) {
  const client = clientVisiteur();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: motDePasse,
  });
  if (error) throw error;
  return client;
}
