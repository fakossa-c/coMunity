export type Requete = { hote: string | null; protocole: string | null };

export type Environnement = {
  VERCEL_ENV?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
};

export function origineDe(requete: Requete, env: Environnement): string {
  throw new Error(`à écrire : ${requete.hote} ${env.VERCEL_ENV}`);
}
