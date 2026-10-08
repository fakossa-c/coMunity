// Écrit le marqueur du dernier `npm test` vert (spec #208, ticket #215). Lancé par le script
// `posttest` de package.json : npm ne le lance que si `npm test` a réussi, donc un échec laisse le
// marqueur d'avant, qu'un commit postérieur a déjà périmé.
//
// Le marqueur garde le commit testé et si l'arbre avait des modifications non commitées ; le hook de
// fin de tour (hook-fin-de-tour.mjs) le compare à la tête.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  contexteGit,
  FICHIER_MARQUEUR,
  marqueurDeTest,
} from "./session-ticket.mjs";

if (process.argv[1]?.endsWith("marquer-test-vert.mjs")) {
  const { racine, commitTete, arbreSale } = contexteGit(process.cwd());
  const fichier = join(racine, FICHIER_MARQUEUR);
  mkdirSync(dirname(fichier), { recursive: true });
  writeFileSync(
    fichier,
    `${JSON.stringify(
      marqueurDeTest({
        commit: commitTete,
        arbreSale,
        ecritA: new Date().toISOString(),
      }),
      null,
      2,
    )}\n`,
  );
}
