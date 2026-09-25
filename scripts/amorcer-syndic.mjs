// Crée le premier membre du syndic : les suivants arrivent par invitation depuis l'espace syndic.
// Usage : npm run syndic:amorcer -- <email> <mot-de-passe> <prénom> <nom>
// Lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY dans l'environnement (ou .env.local).
import { createClient } from "@supabase/supabase-js";

const USAGE =
  "Usage : npm run syndic:amorcer -- <email> <mot-de-passe> <prénom> <nom>";

/**
 * Crée un compte confirmé et lui donne le rôle syndic.
 * @param {{ url: string, cleSecrete: string, email: string, motDePasse: string, prenom: string, nom: string }} parametres
 */
export async function amorcerSyndic({
  url,
  cleSecrete,
  email,
  motDePasse,
  prenom,
  nom,
}) {
  const identite = { prenom: prenom?.trim(), nom: nom?.trim() };
  if (!identite.prenom || !identite.nom) {
    throw new Error("Le prénom et le nom du membre du syndic sont obligatoires.");
  }

  const admin = createClient(url, cleSecrete, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  });
  if (error) throw new Error(`Compte non créé : ${error.message}`);

  const profil = await admin.from("profil").insert({
    id: data.user.id,
    email: data.user.email,
    role: "syndic",
    statut: "valide",
    ...identite,
  });
  if (profil.error) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(`Rôle syndic non attribué : ${profil.error.message}`);
  }
  return data.user;
}

// Pas d'import.meta ni d'await au niveau du module : Playwright le charge en CommonJS.
if (process.argv[1]?.endsWith("amorcer-syndic.mjs")) {
  const [email, motDePasse, prenom, nom] = process.argv.slice(2);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cleSecrete = process.env.SUPABASE_SECRET_KEY;
  if (!email || !motDePasse || !prenom || !nom) {
    console.error(USAGE);
    process.exit(1);
  }
  if (!url || !cleSecrete) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY doivent être définies (en local : npm run env:local).",
    );
    process.exit(1);
  }
  amorcerSyndic({ url, cleSecrete, email, motDePasse, prenom, nom }).then(
    () => console.log(`Membre du syndic créé : ${prenom} ${nom} (${email})`),
    (erreur) => {
      console.error(erreur.message);
      process.exit(1);
    },
  );
}
