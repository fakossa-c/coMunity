import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  construirePrompt,
  decider,
  decrire,
  main,
  numerosDepuisOption,
  specDepuisCorps,
  worktreeEnregistre,
} from "./lancer.mjs";

const valeurs = {
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
  memoireParSessionMo: 2048,
  servicesLourdsEnParallele: 1,
};

const modele = [
  "# Gabarit",
  "Texte hors bloc, jamais envoyé à la session.",
  "```",
  "Ticket #{{ticket}} ({{titre}}) du dépôt {{depot}}, spec #{{specNumero}} : {{specLien}}.",
  "Tickets en parallèle : {{enParallele}}.",
  "{{glossaire}} est le glossaire.",
  "Worktree {{dossier}}, branche {{brancheTicket}} depuis {{brancheIntegration}}. Arrêt : {{commandeArret}}.",
  "```",
  "Fin du gabarit.",
].join("\n");

const situation = {
  ticket: {
    numero: 210,
    titre: "Lancer un ticket par une commande (script d'orchestration)",
    etat: "OPEN",
    assignes: [],
  },
  spec: { numero: 208 },
  arbreSale: false,
  worktreeExiste: false,
  brancheExiste: false,
  enParallele: [],
  racine: join("/depot", "coMunity"),
  home: "/home/ubuntu",
  modelePrompt: modele,
};

const types = (resultat) => resultat.actions.map((action) => action.type);

describe("decider : refus", () => {
  it("laisse passer un ticket ouvert, libre, avec un checkout principal propre", () => {
    const resultat = decider(situation, valeurs);
    expect(resultat.refus).toEqual([]);
    expect(resultat.actions.length).toBeGreaterThan(0);
  });

  it("refuse un ticket fermé, sans aucune action", () => {
    const resultat = decider(
      { ...situation, ticket: { ...situation.ticket, etat: "CLOSED" } },
      valeurs,
    );
    expect(resultat.refus).toEqual([expect.stringMatching(/#210.*fermé/)]);
    expect(resultat.actions).toEqual([]);
  });

  it("refuse un ticket déjà assigné, en nommant qui le porte", () => {
    const resultat = decider(
      {
        ...situation,
        ticket: { ...situation.ticket, assignes: ["fakossa-c", "autre"] },
      },
      valeurs,
    );
    expect(resultat.refus).toEqual([
      expect.stringMatching(/déjà assigné.*fakossa-c.*autre/),
    ]);
    expect(resultat.actions).toEqual([]);
  });

  it("refuse un checkout principal à l'arbre git sale", () => {
    const resultat = decider({ ...situation, arbreSale: true }, valeurs);
    expect(resultat.refus).toEqual([
      expect.stringMatching(/checkout principal/),
    ]);
    expect(resultat.actions).toEqual([]);
  });

  it("refuse un worktree déjà présent, en donnant son dossier", () => {
    const resultat = decider({ ...situation, worktreeExiste: true }, valeurs);
    expect(resultat.refus).toEqual([
      expect.stringContaining(
        join("/depot", "coMunity", ".claude", "worktrees", "ticket-210"),
      ),
    ]);
  });

  it("refuse une branche ticket-<n> déjà créée sans worktree", () => {
    const resultat = decider({ ...situation, brancheExiste: true }, valeurs);
    expect(resultat.refus).toEqual([
      expect.stringMatching(/branche ticket-210/),
    ]);
  });

  it("donne toutes les raisons d'un coup", () => {
    const resultat = decider(
      {
        ...situation,
        ticket: { ...situation.ticket, etat: "CLOSED", assignes: ["x"] },
        arbreSale: true,
        worktreeExiste: true,
      },
      valeurs,
    );
    expect(resultat.refus).toHaveLength(4);
  });
});

describe("decider : actions", () => {
  it("enchaîne les étapes dans l'ordre du ticket", () => {
    expect(types(decider(situation, valeurs))).toEqual([
      "assigner",
      "statut",
      "recuperer",
      "creerWorktree",
      "isoler",
      "installer",
      "demarrerService",
      "variablesLocales",
      "ecrirePrompt",
      "lancerSession",
      "enregistrerSession",
      "verifierSession",
    ]);
  });

  it("assigne au compte du projet et passe le ticket « In Progress »", () => {
    const { actions } = decider(situation, valeurs);
    expect(actions[0]).toEqual({
      type: "assigner",
      ticket: 210,
      compte: "fakossa-c",
    });
    expect(actions[1]).toEqual({
      type: "statut",
      ticket: 210,
      statut: "In Progress",
    });
  });

  it("crée le worktree depuis la branche d'intégration distante, pas depuis la locale", () => {
    const { actions } = decider(situation, valeurs);
    const dossier = join(
      "/depot",
      "coMunity",
      ".claude",
      "worktrees",
      "ticket-210",
    );
    expect(actions.find((a) => a.type === "recuperer")).toMatchObject({
      branche: "develop",
    });
    expect(actions.find((a) => a.type === "creerWorktree")).toMatchObject({
      dossier,
      branche: "ticket-210",
      base: "origin/develop",
    });
  });

  it("suit la branche d'intégration et le dossier des worktrees du fichier de valeurs", () => {
    const { actions } = decider(situation, {
      ...valeurs,
      brancheIntegration: "main",
      dossierWorktrees: "worktrees",
    });
    expect(actions.find((a) => a.type === "creerWorktree")).toMatchObject({
      dossier: join("/depot", "coMunity", "worktrees", "ticket-210"),
      base: "origin/main",
    });
  });

  it("lit les commandes d'isolation, d'installation et de démarrage dans les valeurs, à lancer dans le worktree", () => {
    const { actions } = decider(situation, valeurs);
    const dossier = join(
      "/depot",
      "coMunity",
      ".claude",
      "worktrees",
      "ticket-210",
    );
    const parType = Object.fromEntries(actions.map((a) => [a.type, a]));
    expect(parType.isoler).toMatchObject({
      commande: "node scripts/isoler-supabase-worktree.mjs",
      dossier,
    });
    expect(parType.installer).toMatchObject({ commande: "npm ci", dossier });
    expect(parType.demarrerService).toMatchObject({
      commande: "npx supabase start",
      dossier,
    });
    expect(parType.variablesLocales).toMatchObject({
      commande: "npm run env:local",
      dossier,
    });
  });

  it("écrit le prompt dans le dossier d'état du projet, hors du dépôt", () => {
    const { actions } = decider(situation, valeurs);
    const ecriture = actions.find((a) => a.type === "ecrirePrompt");
    expect(ecriture.fichier).toBe(
      join(
        "/home/ubuntu",
        ".claude",
        "state",
        "orch",
        "comunity",
        "prompts",
        "ticket-210.md",
      ),
    );
  });

  it("lance la session nommée, en mode auto, avec le modèle des valeurs et sans serveur MCP", () => {
    const { actions } = decider(situation, valeurs);
    const lancement = actions.find((a) => a.type === "lancerSession");
    expect(lancement).toMatchObject({
      nom: "ticket-210",
      modele: "sonnet",
      modePermission: "auto",
      sansMcp: true,
      dossier: join("/depot", "coMunity", ".claude", "worktrees", "ticket-210"),
    });
  });

  it("passe le prompt par son fichier : la ligne de commande ne porte pas le titre du ticket", () => {
    const { actions } = decider(situation, valeurs);
    const ecriture = actions.find((a) => a.type === "ecrirePrompt");
    const lancement = actions.find((a) => a.type === "lancerSession");
    expect(lancement.fichierPrompt).toBe(ecriture.fichier);
    expect(lancement.instruction).toContain(ecriture.fichier);
    expect(lancement.instruction).not.toContain("script d'orchestration");
  });

  it("enregistre l'identifiant juste après le lancement, puis le vérifie", () => {
    const suite = types(decider(situation, valeurs));
    const i = suite.indexOf("lancerSession");
    expect(suite.slice(i, i + 3)).toEqual([
      "lancerSession",
      "enregistrerSession",
      "verifierSession",
    ]);
  });

  it("décrit chaque action en une ligne, sans valeur manquante", () => {
    for (const action of decider(situation, valeurs).actions) {
      const ligne = decrire(action);
      expect(ligne).toMatch(/\S/);
      expect(ligne).not.toMatch(/undefined|\[object/);
      expect(ligne).not.toContain("\n");
    }
  });
});

describe("construirePrompt", () => {
  const prompt = () =>
    decider({ ...situation, enParallele: [205, 207] }, valeurs).actions.find(
      (a) => a.type === "ecrirePrompt",
    ).contenu;

  it("nomme le ticket, son titre, la spec avec son lien et le glossaire", () => {
    expect(prompt()).toContain("#210");
    expect(prompt()).toContain(
      "Lancer un ticket par une commande (script d'orchestration)",
    );
    expect(prompt()).toContain("spec #208");
    expect(prompt()).toContain(
      "https://github.com/fakossa-c/coMunity/issues/208",
    );
    expect(prompt()).toContain("GLOSSARY.md est le glossaire");
  });

  it("liste les tickets en parallèle, ou dit qu'il n'y en a aucun", () => {
    expect(prompt()).toContain("Tickets en parallèle : #205, #207.");
    const seul = decider(situation, valeurs).actions.find(
      (a) => a.type === "ecrirePrompt",
    ).contenu;
    expect(seul).toContain("Tickets en parallèle : aucun.");
  });

  it("ne garde que le bloc du gabarit", () => {
    expect(prompt()).not.toContain("Texte hors bloc");
    expect(prompt()).not.toContain("Fin du gabarit");
  });

  it("garde tel quel un titre à apostrophes, guillemets et $", () => {
    const titre = `Bug de l'accueil : "$HOME" \`x\` & co`;
    const contenu = construirePrompt(modele, {
      ...base(),
      titre,
    });
    expect(contenu).toContain(titre);
  });

  it("refuse un gabarit qui demande une variable inconnue", () => {
    expect(() =>
      construirePrompt("```\n{{inconnue}} #{{ticket}}\n```", base()),
    ).toThrow(/inconnue/);
  });

  it("n'a plus de variable orchestrateur : un gabarit qui la cite est refusé", () => {
    expect(() =>
      decider(
        {
          ...situation,
          modelePrompt: "```\nTicket #{{ticket}}, {{orchestrateur}}.\n```",
        },
        valeurs,
      ),
    ).toThrow(/orchestrateur/);
  });

  it("n'a plus d'option --orchestrateur", async () => {
    await expect(
      main(["210", "--orchestrateur", "orch-comunity"]),
    ).rejects.toThrow(/orchestrateur/);
  });

  it("ne remplit que les {{variables}} : un <…> reste tel quel", () => {
    const contenu = construirePrompt(
      "```\nTicket #{{ticket}}, branche <n>, base <commande inédite>.\n```",
      base(),
    );
    expect(contenu).toBe("Ticket #210, branche <n>, base <commande inédite>.");
  });

  it("ne dit rien de la spec quand le gabarit ne la cite pas", () => {
    const contenu = construirePrompt("```\nTicket #{{ticket}}.\n```", base());
    expect(contenu).toBe("Ticket #210.");
  });
});

function base() {
  return {
    ticket: 210,
    titre: "Un titre",
    depot: "coMunity",
    specNumero: 208,
    specLien: "https://github.com/fakossa-c/coMunity/issues/208",
    glossaire: "GLOSSARY.md",
    enParallele: "#205",
    dossier: "/depot/coMunity/.claude/worktrees/ticket-210",
    brancheTicket: "ticket-210",
    brancheIntegration: "develop",
    commandeArret: "npx supabase stop",
    commandeMigration: "npm run db:pousser",
    commandeLienPreview: "vercel link --yes --project comunity",
    compteGh: "fakossa-c",
  };
}

describe("lecture du ticket et des options", () => {
  it("lit la spec dans la section Parent du ticket", () => {
    expect(
      specDepuisCorps("## Parent\n\nSpec #208\n\n## What to build"),
    ).toEqual({
      numero: 208,
    });
    expect(specDepuisCorps("## Parent\n\n#208")).toEqual({ numero: 208 });
  });

  it("rend null pour un ticket sans parent", () => {
    expect(specDepuisCorps("## What to build\n\nSpec #3 est citée")).toBeNull();
    expect(specDepuisCorps(null)).toBeNull();
  });

  it("lit la liste des tickets en parallèle, séparés par virgule ou espace", () => {
    expect(numerosDepuisOption("205,207")).toEqual([205, 207]);
    expect(numerosDepuisOption("#205 #207")).toEqual([205, 207]);
    expect(numerosDepuisOption(undefined)).toEqual([]);
  });
});

describe("worktreeEnregistre", () => {
  const sortie = [
    "worktree /depot/coMunity",
    "HEAD abc",
    "branch refs/heads/develop",
    "",
    "worktree C:/Users/f/coMunity/.claude/worktrees/ticket-210",
    "HEAD def",
    "",
  ].join("\n");

  it("reconnaît un worktree que git liste, même si le dossier a disparu", () => {
    expect(worktreeEnregistre(sortie, "/depot/coMunity")).toBe(true);
  });

  it("compare sans tenir compte du sens des barres (git écrit /, path.join écrit \\ sous Windows)", () => {
    expect(
      worktreeEnregistre(
        sortie,
        "C:\\Users\\f\\coMunity\\.claude\\worktrees\\ticket-210",
      ),
    ).toBe(true);
  });

  it("rend false pour un dossier que git ne liste pas", () => {
    expect(worktreeEnregistre(sortie, "/depot/coMunity/ticket-9")).toBe(false);
  });
});

describe("decider : relance dans une nouvelle session", () => {
  const relance = {
    ...situation,
    worktreeExiste: true,
    brancheExiste: true,
    ticket: { ...situation.ticket, assignes: ["fakossa-c"] },
    relance: {
      message: "Reprise : la session précédente était inactive depuis 30 min.",
    },
  };

  it("ne refait ni l'assignation, ni le worktree, ni l'isolation, ni le service", () => {
    const resultat = decider(relance, valeurs);
    expect(resultat.refus).toEqual([]);
    expect(types(resultat)).toEqual([
      "ecrirePrompt",
      "lancerSession",
      "enregistrerSession",
      "verifierSession",
    ]);
  });

  it("lance la session sous le même nom, dans le worktree existant, mode de permission repassé", () => {
    const lancer = decider(relance, valeurs).actions.find(
      (a) => a.type === "lancerSession",
    );
    expect(lancer).toMatchObject({
      nom: "ticket-210",
      modePermission: "auto",
      sansMcp: true,
      dossier: join("/depot", "coMunity", ".claude", "worktrees", "ticket-210"),
    });
  });

  it("garde le prompt du premier lancement et y ajoute le message de reprise", () => {
    const ecrire = decider(relance, valeurs).actions.find(
      (a) => a.type === "ecrirePrompt",
    );
    expect(ecrire.contenu).toContain("Ticket #210");
    expect(ecrire.contenu).toContain("depuis 30 min");
    expect(ecrire.contenu).toMatch(/branche ticket-210/);
    expect(ecrire.contenu).toMatch(/git log/);
  });

  it("enregistre la session en gardant les compteurs du ticket", () => {
    const enregistrer = decider(relance, valeurs).actions.find(
      (a) => a.type === "enregistrerSession",
    );
    expect(enregistrer.relance).toBe(true);
  });

  it("refuse une relance sans worktree à reprendre", () => {
    const resultat = decider({ ...relance, worktreeExiste: false }, valeurs);
    expect(resultat.refus).toEqual([
      expect.stringMatching(/worktree.*reprendre/),
    ]);
    expect(resultat.actions).toEqual([]);
  });

  it("refuse une relance sur un ticket fermé", () => {
    const resultat = decider(
      { ...relance, ticket: { ...relance.ticket, etat: "CLOSED" } },
      valeurs,
    );
    expect(resultat.refus).toEqual([expect.stringMatching(/fermé/)]);
  });
});
