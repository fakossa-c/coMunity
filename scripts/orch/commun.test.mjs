import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ajouterSession,
  argsMiseAJourBranche,
  explicationRefusMiseAJour,
  cheminsEtat,
  etatVide,
  fusionnerValeurs,
  idDepuisSortieBg,
  modifierEntree,
  remplacerSession,
} from "./commun.mjs";

const projet = {
  projet: "comunity",
  depot: "fakossa-c/coMunity",
  compteGh: "fakossa-c",
  brancheIntegration: "develop",
  dossierWorktrees: ".claude/worktrees",
  glossaire: "GLOSSARY.md",
  commandes: {
    isolation: "node scripts/isoler-supabase-worktree.mjs",
    installation: "npm ci",
    demarrage: "npx supabase start",
    variablesLocales: "npm run env:local",
    arret: "npx supabase stop",
    migrationDistante: "npm run db:pousser",
    lienPreview: "vercel link --yes --project comunity",
  },
  modeleSession: "sonnet",
  controleCi: "",
  dureeMaxSessionMinutes: 180,
  delaiInactiviteMinutes: 30,
  reprisesMax: 2,
  misesAJourBrancheMax: 3,
  echecsSessionMax: 3,
  attenteRepriseMinutes: 10,
  pousserMigrationsApresFusion: true,
  intervalleBoucleSecondes: 300,
};

describe("argsMiseAJourBranche", () => {
  it("appelle l'API de mise à jour de la branche avec le commit de tête attendu", () => {
    expect(
      argsMiseAJourBranche({
        depot: "fakossa-c/coMunity",
        pr: 236,
        tete: "c1b4a9a11b95cba3e48d7062626dfd8ad45f2894",
      }),
    ).toEqual([
      "api",
      "--method",
      "PUT",
      "repos/fakossa-c/coMunity/pulls/236/update-branch",
      "-f",
      "expected_head_sha=c1b4a9a11b95cba3e48d7062626dfd8ad45f2894",
    ]);
  });
});

describe("explicationRefusMiseAJour", () => {
  it("explique le refus de GitHub quand le commit de tête a changé depuis la vérification", () => {
    const texte = explicationRefusMiseAJour(
      "gh: Expected head sha didn’t match current head ref. (HTTP 422)",
    );
    expect(texte).toContain("HTTP 422");
    expect(texte).toMatch(/a poussé|commit de tête a changé/);
  });

  it("rend les autres messages tels quels", () => {
    expect(explicationRefusMiseAJour("gh: Bad credentials (HTTP 401)")).toBe(
      "gh: Bad credentials (HTTP 401)",
    );
  });
});

describe("fusionnerValeurs", () => {
  it("exige le nombre maximal de mises à jour de branche par ticket", () => {
    const sans = { ...projet };
    delete sans.misesAJourBrancheMax;
    expect(() => fusionnerValeurs(sans, null)).toThrow(/misesAJourBrancheMax/);
  });

  it("rend les valeurs du projet avec les valeurs de machine par défaut", () => {
    const valeurs = fusionnerValeurs(projet, null);
    expect(valeurs.brancheIntegration).toBe("develop");
    expect(valeurs.commandes.demarrage).toBe("npx supabase start");
    expect(valeurs.memoireParSessionMo).toBeGreaterThan(0);
    expect(valeurs.servicesLourdsEnParallele).toBe(1);
  });

  it("laisse le fichier local de la machine l'emporter sur les défauts", () => {
    const valeurs = fusionnerValeurs(projet, {
      memoireParSessionMo: 4096,
      servicesLourdsEnParallele: 2,
    });
    expect(valeurs.memoireParSessionMo).toBe(4096);
    expect(valeurs.servicesLourdsEnParallele).toBe(2);
  });

  it("lit l'URL du webhook Slack dans le fichier local, nulle sans lui", () => {
    expect(fusionnerValeurs(projet, null).webhookSlack).toBeNull();
    expect(
      fusionnerValeurs(projet, {
        webhookSlack: "https://hooks.slack.com/services/T/B/x",
      }).webhookSlack,
    ).toBe("https://hooks.slack.com/services/T/B/x");
  });

  it("ne laisse pas le fichier local réécrire une valeur du projet", () => {
    const valeurs = fusionnerValeurs(projet, { brancheIntegration: "main" });
    expect(valeurs.brancheIntegration).toBe("develop");
  });

  it("accepte un nom de contrôle de CI vide", () => {
    expect(fusionnerValeurs(projet, null).controleCi).toBe("");
  });

  it("nomme la valeur du projet qui manque", () => {
    const { brancheIntegration, ...incomplet } = projet;
    expect(brancheIntegration).toBe("develop");
    expect(() => fusionnerValeurs(incomplet, null)).toThrow(
      /brancheIntegration/,
    );
  });

  it("exige la valeur qui autorise ou non la poussée des migrations, même fausse", () => {
    const { pousserMigrationsApresFusion, ...incomplet } = projet;
    expect(pousserMigrationsApresFusion).toBe(true);
    expect(() => fusionnerValeurs(incomplet, null)).toThrow(
      /pousserMigrationsApresFusion/,
    );
    expect(
      fusionnerValeurs({ ...projet, pousserMigrationsApresFusion: false }, null)
        .pousserMigrationsApresFusion,
    ).toBe(false);
  });

  it("exige l'intervalle de la boucle", () => {
    const { intervalleBoucleSecondes, ...incomplet } = projet;
    expect(intervalleBoucleSecondes).toBe(300);
    expect(() => fusionnerValeurs(incomplet, null)).toThrow(
      /intervalleBoucleSecondes/,
    );
  });

  it("exige les bornes des reprises : échecs de session et première attente", () => {
    expect(projet.echecsSessionMax).toBe(3);
    expect(projet.attenteRepriseMinutes).toBe(10);
    const sans = (cle) => {
      const copie = { ...projet };
      delete copie[cle];
      return copie;
    };
    expect(() => fusionnerValeurs(sans("echecsSessionMax"), null)).toThrow(
      /echecsSessionMax/,
    );
    expect(() => fusionnerValeurs(sans("attenteRepriseMinutes"), null)).toThrow(
      /attenteRepriseMinutes/,
    );
  });

  it("nomme la commande du projet qui manque", () => {
    const { arret, ...commandes } = projet.commandes;
    expect(arret).toBeDefined();
    expect(() => fusionnerValeurs({ ...projet, commandes }, null)).toThrow(
      /commandes\.arret/,
    );
  });
});

describe("cheminsEtat", () => {
  it("laisse un dossier d'état passé en option remplacer celui de la config globale", () => {
    const chemins = cheminsEtat({
      home: "/home/ubuntu",
      projet: "comunity",
      env: { ORCH_DOSSIER_ETAT: "/tmp/essai-boucle" },
    });
    expect(chemins.dossier).toBe("/tmp/essai-boucle");
    expect(chemins.fichier).toBe(join("/tmp/essai-boucle", "etat.json"));
    expect(chemins.prompts).toBe(join("/tmp/essai-boucle", "prompts"));
  });

  it("range l'état du projet dans la config globale, hors du dépôt", () => {
    const chemins = cheminsEtat({ home: "/home/ubuntu", projet: "comunity" });
    const dossier = join(
      "/home/ubuntu",
      ".claude",
      "state",
      "orch",
      "comunity",
    );
    expect(chemins.dossier).toBe(dossier);
    expect(chemins.fichier).toBe(join(dossier, "etat.json"));
    expect(chemins.prompts).toBe(join(dossier, "prompts"));
  });
});

describe("ajouterSession", () => {
  it("enregistre l'identifiant de session sous le numéro du ticket", () => {
    const etat = ajouterSession(etatVide(), 210, {
      id: "4ddefc4a",
      nom: "ticket-210",
      demarreA: "2026-10-08T10:00:00.000Z",
    });
    expect(etat.tickets["210"]).toEqual({
      session: "4ddefc4a",
      nom: "ticket-210",
      demarreA: "2026-10-08T10:00:00.000Z",
      reprises: 0,
    });
  });

  it("garde les autres tickets et ne modifie pas l'état reçu", () => {
    const avant = ajouterSession(etatVide(), 205, {
      id: "aaaaaaaa",
      nom: "ticket-205",
      demarreA: "2026-10-08T09:00:00.000Z",
    });
    const apres = ajouterSession(avant, 210, {
      id: "bbbbbbbb",
      nom: "ticket-210",
      demarreA: "2026-10-08T10:00:00.000Z",
    });
    expect(Object.keys(apres.tickets)).toEqual(["205", "210"]);
    expect(Object.keys(avant.tickets)).toEqual(["205"]);
  });
});

describe("remplacerSession", () => {
  const avant = {
    version: 1,
    tickets: {
      217: {
        session: "aaaaaaaa",
        nom: "ticket-217",
        demarreA: "2026-10-08T10:00:00.000Z",
        reprises: 1,
        echecs: 2,
        inactivites: 1,
        reprendreApres: "2026-10-08T12:00:00.000Z",
        questionRepondue: 42,
      },
    },
  };

  it("pointe le ticket sur la nouvelle session et garde ses compteurs", () => {
    const apres = remplacerSession(avant, 217, {
      id: "bbbbbbbb",
      nom: "ticket-217",
      demarreA: "2026-10-08T13:00:00.000Z",
    });
    expect(apres.tickets["217"]).toEqual({
      session: "bbbbbbbb",
      nom: "ticket-217",
      demarreA: "2026-10-08T13:00:00.000Z",
      reprises: 1,
      echecs: 2,
      inactivites: 1,
      questionRepondue: 42,
    });
  });

  it("ne modifie pas l'état reçu", () => {
    remplacerSession(avant, 217, {
      id: "bbbbbbbb",
      nom: "ticket-217",
      demarreA: "2026-10-08T13:00:00.000Z",
    });
    expect(avant.tickets["217"].session).toBe("aaaaaaaa");
  });
});

describe("modifierEntree", () => {
  const avant = {
    version: 1,
    tickets: {
      217: { session: "aaaaaaaa", nom: "ticket-217", reprises: 0 },
      218: { session: "cccccccc", nom: "ticket-218", reprises: 0 },
    },
  };

  it("change les champs donnés du seul ticket visé", () => {
    const apres = modifierEntree(avant, 217, { reprises: 1, echecs: 1 });
    expect(apres.tickets["217"]).toEqual({
      session: "aaaaaaaa",
      nom: "ticket-217",
      reprises: 1,
      echecs: 1,
    });
    expect(apres.tickets["218"]).toEqual(avant.tickets["218"]);
    expect(avant.tickets["217"].reprises).toBe(0);
  });

  it("retire un champ mis à undefined", () => {
    const avecAttente = modifierEntree(avant, 217, {
      reprendreApres: "2026-10-08T12:00:00.000Z",
    });
    const apres = modifierEntree(avecAttente, 217, {
      reprendreApres: undefined,
    });
    expect("reprendreApres" in apres.tickets["217"]).toBe(false);
  });

  it("ne crée pas l'entrée d'un ticket que la boucle ne suit pas", () => {
    expect(modifierEntree(avant, 999, { reprises: 1 })).toEqual(avant);
  });
});

describe("idDepuisSortieBg", () => {
  it("lit l'identifiant dans la ligne que `claude --bg` affiche", () => {
    const sortie =
      "backgrounded · \u001b[36m4ddefc4a\u001b[39m · ticket-210\n\u001b[2m  claude agents             list sessions\u001b[22m\n";
    expect(idDepuisSortieBg(sortie)).toBe("4ddefc4a");
  });

  it("refuse une sortie sans session lancée, même si la commande a rendu 0", () => {
    expect(() =>
      idDepuisSortieBg("Workspace not trusted. Run `claude` once."),
    ).toThrow(/Workspace not trusted/);
  });
});
