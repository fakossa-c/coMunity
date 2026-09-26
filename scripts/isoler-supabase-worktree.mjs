// Prépare un worktree pour cohabiter avec le checkout principal et les autres worktrees :
// Supabase local à lui (project_id Docker et ports dédiés), sans Studio, et lien Vercel recopié.
//
// Pourquoi : `supabase/config.toml` est versionné avec project_id = "comunity" et les ports
// 544xx. Tel quel, chaque worktree pilote le MÊME conteneur Docker : un `supabase stop`/`start`/
// `db reset` lancé dans l'un redémarre ou vide la base utilisée par les autres. Et sans
// `.vercel/project.json`, un `vercel curl` crée un projet Vercel fantôme au nom du dossier.
//
// Usage, depuis la racine d'un worktree (pas depuis le checkout principal) :
//   node scripts/isoler-supabase-worktree.mjs
//
// Ports : base = 55000 + (n % 90) * 10, puis base+0..+6, où n est le numéro de ticket lu dans le
// nom du dossier (« ticket-<n> »), sinon une empreinte du nom.
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const [gitDir, commonDir] = git(
  "rev-parse",
  "--path-format=absolute",
  "--git-dir",
  "--git-common-dir",
)
  .split("\n")
  .map((chemin) => resolve(chemin));
if (gitDir === commonDir) {
  console.error(
    "Ce script s'exécute depuis un worktree, pas depuis le checkout principal.",
  );
  process.exit(1);
}

const nom = basename(git("rev-parse", "--show-toplevel"));
const ticket = nom.match(/ticket-(\d+)/)?.[1];
const empreinte = [...nom].reduce(
  (somme, c) => (somme * 31 + c.charCodeAt(0)) % 9973,
  7,
);
const base = 55000 + ((ticket ? Number(ticket) : empreinte) % 90) * 10;
const projectId = nom.startsWith("comunity-") ? nom : `comunity-${nom}`;

const ports = {
  api: base,
  shadow: base + 1,
  db: base + 2,
  studio: base + 3,
  smtp: base + 4,
  pooler: base + 5,
  analytics: base + 6,
};

const cheminConfig = "supabase/config.toml";
const brut = readFileSync(cheminConfig, "utf8");
const crlf = brut.includes("\r\n");
// Les regex ci-dessous utilisent \n : on travaille en LF, puis on restaure les fins de
// ligne d'origine à l'écriture, pour ne pas modifier le style du fichier selon le worktree.
let config = crlf ? brut.replace(/\r\n/g, "\n") : brut;

const remplacer = (regex, valeur, description) => {
  if (!regex.test(config)) {
    throw new Error(`Motif introuvable dans ${cheminConfig} : ${description}`);
  }
  config = config.replace(regex, valeur);
};

remplacer(/^project_id = ".*"$/m, `project_id = "${projectId}"`, "project_id");
remplacer(/^(\[api\]\n(?:.*\n)*?port = )\d+/m, `$1${ports.api}`, "api.port");
remplacer(/^(\[db\]\n(?:.*\n)*?port = )\d+/m, `$1${ports.db}`, "db.port");
remplacer(/^(shadow_port = )\d+/m, `$1${ports.shadow}`, "db.shadow_port");
remplacer(
  /^(\[db\.pooler\]\n(?:.*\n)*?port = )\d+/m,
  `$1${ports.pooler}`,
  "db.pooler.port",
);
remplacer(
  /^(\[studio\]\n(?:.*\n)*?port = )\d+/m,
  `$1${ports.studio}`,
  "studio.port",
);
// Studio ne sert qu'à regarder la base à la main : inutile pour un agent, et lourd en mémoire.
remplacer(
  /^(\[studio\]\n)enabled = true/m,
  "$1enabled = false",
  "studio.enabled",
);
remplacer(
  /^(\[local_smtp\]\n(?:.*\n)*?port = )\d+/m,
  `$1${ports.smtp}`,
  "local_smtp.port",
);
remplacer(
  /^(\[analytics\]\n(?:.*\n)*?port = )\d+/m,
  `$1${ports.analytics}`,
  "analytics.port",
);

writeFileSync(cheminConfig, crlf ? config.replace(/\n/g, "\r\n") : config);
// Ces ports isolés ne doivent jamais être commités.
git("update-index", "--skip-worktree", cheminConfig);

const lienVercel = join(dirname(commonDir), ".vercel/project.json");
if (existsSync(lienVercel) && !existsSync(".vercel/project.json")) {
  mkdirSync(".vercel", { recursive: true });
  copyFileSync(lienVercel, ".vercel/project.json");
}

console.log(`Supabase isolé pour ${nom} :`);
console.log(`  project_id = ${projectId}, Studio coupé`);
console.log(`  api ${ports.api}, db ${ports.db}, shadow ${ports.shadow}`);
console.log(
  `  smtp ${ports.smtp}, pooler ${ports.pooler}, analytics ${ports.analytics}`,
);
console.log(
  existsSync(".vercel/project.json")
    ? "Lien Vercel recopié depuis le checkout principal."
    : "Pas de lien Vercel dans le checkout principal : `vercel link --yes --project comunity` avant toute lecture de preview.",
);
console.log(
  "Lancez maintenant `npx supabase start` puis `npm run env:local` dans ce worktree.",
);
