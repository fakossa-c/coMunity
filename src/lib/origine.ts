/** Ce que la requête dit d'elle-même : en-têtes Host (ou X-Forwarded-Host) et X-Forwarded-Proto. */
export type Requete = { hote: string | null; protocole: string | null };

/** Variables système que Vercel expose au serveur. */
export type Environnement = {
  VERCEL_ENV?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
};

/**
 * L'origine des liens partagés. En production, toujours le domaine de production : un lien
 * collé dans WhatsApp ne doit mener ni vers un alias, ni vers un domaine tiré d'un en-tête
 * falsifié. Ailleurs (preview, poste local), celle sous laquelle on voit l'app.
 */
export function origineDe(requete: Requete, env: Environnement) {
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const hote = requete.hote ?? "localhost:3000";
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(hote);
  return `${requete.protocole ?? (local ? "http" : "https")}://${hote}`;
}
