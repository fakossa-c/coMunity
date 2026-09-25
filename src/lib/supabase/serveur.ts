import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** URL et clé publiable, ou `null` si Supabase n'est pas configuré. */
export function configurationSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && cle ? { url, cle } : null;
}

function configurationExigee() {
  const configuration = configurationSupabase();
  if (!configuration) {
    throw new Error(
      "Supabase n'est pas configuré : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquent.",
    );
  }
  return configuration;
}

/**
 * Client qui agit au nom de la personne connectée : la session vit dans les cookies,
 * et les politiques RLS s'appliquent à ses droits.
 */
export async function clientSession() {
  // Les cookies d'abord : ils rendent la page dynamique, que le build ne tente donc pas de
  // pré-calculer. Une preview, sans variables Supabase, se construit ainsi quand même.
  const magasin = await cookies();
  const { url, cle } = configurationExigee();
  return createServerClient(url, cle, {
    cookies: {
      getAll: () => magasin.getAll(),
      setAll(aEcrire) {
        try {
          for (const { name, value, options } of aEcrire) {
            magasin.set(name, value, options);
          }
        } catch {
          // Appelé pendant le rendu d'une page, où les cookies sont en lecture seule :
          // le proxy renouvelle alors la session à la requête suivante.
        }
      },
    },
  });
}

/**
 * Client qui contourne les politiques RLS. Réservé à ce que Supabase n'ouvre qu'à la clé
 * secrète (envoyer un email d'invitation), toujours après une vérification des droits en base.
 */
export function clientAdmin() {
  const { url } = configurationExigee();
  const cleSecrete = process.env.SUPABASE_SECRET_KEY;
  if (!cleSecrete) {
    throw new Error(
      "SUPABASE_SECRET_KEY manque : les invitations ne peuvent pas partir.",
    );
  }
  return createClient(url, cleSecrete, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Vérifie que `motDePasse` est bien celui du compte `email`, avant un changement d'identifiant.
 * Passe par une connexion à part, sans cookies, refermée aussitôt : la session en cours n'est pas touchée.
 */
export async function verifierMotDePasse(
  email: string,
  motDePasse: string,
): Promise<"correct" | "incorrect" | "indisponible"> {
  const { url, cle } = configurationExigee();
  const client = createClient(url, cle, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: motDePasse,
  });
  if (error) {
    return error.code === "invalid_credentials" ? "incorrect" : "indisponible";
  }
  await client.auth.signOut({ scope: "local" });
  return "correct";
}
