// Donne au Supabase local de ce worktree son propre project_id Docker et ses propres ports,
// pour qu'il cohabite avec les autres worktrees de tickets sans se marcher dessus.
//
// Pourquoi : `supabase/config.toml` est versionné avec project_id = "comunity" et les ports
// 544xx partout. Un `git worktree add` copie ce fichier tel quel, donc tous les worktrees
// pilotent le MÊME conteneur Docker : un `supabase stop`/`start`/`db reset` lancé dans l'un
// redémarre ou vide la base utilisée par les autres.
//
// Usage, depuis la racine d'un worktree de ticket (pas depuis le dépôt principal) :
//   node scripts/isoler-supabase-worktree.mjs
//
// Le numéro de ticket est lu dans le nom du dossier courant (comunity-ticket-<n>).
// Ports attribués, dérivés du numéro de ticket : base = 55000 + (n % 90) * 10, puis base+0..+6.
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const dossier = basename(process.cwd());
const match = dossier.match(/^comunity-ticket-(\d+)$/);

if (!match) {
  console.error(
    `Ce script s'exécute depuis un worktree de ticket (dossier "comunity-ticket-<n>"), pas depuis "${dossier}".`,
  );
  process.exit(1);
}

const ticket = match[1];
const base = 55000 + (Number(ticket) % 90) * 10;

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

remplacer(
  /^project_id = ".*"$/m,
  `project_id = "comunity-ticket-${ticket}"`,
  "project_id",
);
remplacer(/^(\[api\]\n(?:.*\n)*?port = )\d+/m, `$1${ports.api}`, "api.port");
remplacer(/^(\[db\]\n(?:.*\n)*?port = )\d+/m, `$1${ports.db}`, "db.port");
remplacer(
  /^(shadow_port = )\d+/m,
  `$1${ports.shadow}`,
  "db.shadow_port",
);
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

console.log(`Supabase isolé pour comunity-ticket-${ticket} :`);
console.log(`  project_id = comunity-ticket-${ticket}`);
console.log(`  api ${ports.api}, db ${ports.db}, shadow ${ports.shadow}, studio ${ports.studio}`);
console.log(`  smtp ${ports.smtp}, pooler ${ports.pooler}, analytics ${ports.analytics}`);
console.log("Lancez maintenant `npx supabase start` puis `npm run env:local` dans ce worktree.");
