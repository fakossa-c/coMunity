// Lance une partie de la suite de tests et enregistre son succès pour le commit de tête (ticket
// #233). Une session de ticket ne peut pas lancer `npm test` en une commande (14 à 17 minutes, pour
// 10 permises) : elle lance les cinq parties l'une après l'autre,
//   npm run test:partie -- <format|unitaires|base|mobile|ordinateur>
// et la cinquième verte sur le même commit écrit le marqueur que lit le hook de fin de tour
// (hook-fin-de-tour.mjs), comme `npm test` via son script `posttest`.
//
// L'arbre doit être propre : un succès sur des modifications non commitées ne prouve rien du commit.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  contexteGit,
  enregistrerPartie,
  FICHIER_MARQUEUR,
  FICHIER_PARTIES,
  lireParties,
  marqueurDeTest,
  PARTIES_DE_TEST,
  partiesManquantes,
} from "./session-ticket.mjs";

const ecrireJson = (fichier, contenu) => {
  mkdirSync(dirname(fichier), { recursive: true });
  writeFileSync(fichier, `${JSON.stringify(contenu, null, 2)}\n`);
};

if (process.argv[1]?.endsWith("tester-partie.mjs")) {
  const nom = process.argv[2];
  const partie = PARTIES_DE_TEST.find((candidate) => candidate.nom === nom);
  if (!partie) {
    const noms = PARTIES_DE_TEST.map((candidate) => candidate.nom).join(", ");
    console.error(`Partie inconnue « ${nom ?? ""} » : ${noms}.`);
    process.exit(2);
  }

  const avant = contexteGit(process.cwd());
  if (avant.arbreSale) {
    console.error(
      "L'arbre git a des modifications non commitées : commite d'abord, un succès ne s'enregistre que pour un commit.",
    );
    process.exit(2);
  }

  const lancee = spawnSync(partie.commande, {
    shell: true,
    stdio: "inherit",
    cwd: avant.racine,
  });
  if (lancee.status !== 0) process.exit(lancee.status ?? 1);

  // Le commit ou l'arbre ont pu changer pendant la partie : alors rien n'est prouvé.
  const apres = contexteGit(avant.racine);
  if (apres.commitTete !== avant.commitTete || apres.arbreSale) {
    console.error(
      "Le commit ou l'arbre a changé pendant la partie : succès non enregistré, relance-la.",
    );
    process.exit(1);
  }

  const ecritA = new Date().toISOString();
  const etat = enregistrerPartie(lireParties(avant.racine), {
    nom,
    commit: avant.commitTete,
    ecritA,
  });
  ecrireJson(join(avant.racine, FICHIER_PARTIES), etat);

  const manquantes = partiesManquantes(etat, avant.commitTete);
  if (manquantes.length === 0) {
    ecrireJson(
      join(avant.racine, FICHIER_MARQUEUR),
      marqueurDeTest({ commit: avant.commitTete, arbreSale: false, ecritA }),
    );
    console.log("Les cinq parties sont vertes sur ce commit : marqueur écrit.");
  } else {
    console.log(`Partie « ${nom} » verte. Reste : ${manquantes.join(", ")}.`);
  }
}
