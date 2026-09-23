// Lit l'URL et les clés du Supabase local (`npx supabase start`).
// Utilisé par les tests de base et par `npm run env:local`, qui écrit .env.local.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

// Pas d'import.meta ici : Playwright charge ce module en CommonJS.
const cliSupabase = join(
  process.cwd(),
  "node_modules/supabase/dist/supabase.js",
);

export function lireSupabaseLocal() {
  let sortie;
  try {
    sortie = execFileSync(
      process.execPath,
      [cliSupabase, "status", "--output", "json"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch {
    throw new Error(
      "Le Supabase local ne répond pas. Lancez Docker Desktop puis `npx supabase start`.",
    );
  }
  const statut = JSON.parse(sortie.slice(sortie.indexOf("{")));
  return {
    url: statut.API_URL,
    cleAnonyme: statut.PUBLISHABLE_KEY ?? statut.ANON_KEY,
    cleSecrete: statut.SECRET_KEY ?? statut.SERVICE_ROLE_KEY,
    urlBoiteMail: statut.MAILPIT_URL ?? statut.INBUCKET_URL,
  };
}

if (process.argv[1]?.endsWith("supabase-local.mjs")) {
  const { url, cleAnonyme, cleSecrete } = lireSupabaseLocal();
  writeFileSync(
    ".env.local",
    `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${cleAnonyme}\nSUPABASE_SECRET_KEY=${cleSecrete}\n`,
  );
  console.log(".env.local écrit pour le Supabase local.");
}
