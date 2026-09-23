// Lit l'URL et les clés du Supabase local (`npx supabase start`).
// Utilisé par les tests de base et par `npm run env:local`, qui écrit .env.local.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const cliSupabase = createRequire(import.meta.url).resolve(
  "supabase/dist/supabase.js",
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url, cleAnonyme, cleSecrete } = lireSupabaseLocal();
  writeFileSync(
    ".env.local",
    `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${cleAnonyme}\nSUPABASE_SECRET_KEY=${cleSecrete}\n`,
  );
  console.log(".env.local écrit pour le Supabase local.");
}
