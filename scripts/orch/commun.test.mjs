import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ajouterSession,
  cheminsEtat,
  etatVide,
  fusionnerValeurs,
  idDepuisSortieBg,
} from "./commun.mjs";

const projet = {
  projet: "comunity",
  depot: "fakossa-c/coMunity",
  compteGh: "fakossa-c",
  brancheIntegration: "develop",
  dossierWorktrees: ".claude/worktrees",
  glossaire: "CONTEXT.md",
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
  pousserMigrationsApresFusion: true,
};

describe("fusionnerValeurs", () => {
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

  it("nomme la commande du projet qui manque", () => {
    const { arret, ...commandes } = projet.commandes;
    expect(arret).toBeDefined();
    expect(() => fusionnerValeurs({ ...projet, commandes }, null)).toThrow(
      /commandes\.arret/,
    );
  });
});

describe("cheminsEtat", () => {
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
