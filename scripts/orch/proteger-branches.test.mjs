import { describe, expect, it } from "vitest";
import {
  appelGh,
  decider,
  formaterAppels,
  formaterEtat,
  reglagesCibles,
  resumer,
} from "./proteger-branches.mjs";

const valeurs = {
  depot: "fakossa-c/coMunity",
  brancheIntegration: "develop",
  controleCi: "Tests",
};

/** Ce que GitHub répond pour une branche protégée comme la commande la pose. */
const reponsePosee = (surcharge = {}) => ({
  url: "https://api.github.com/repos/fakossa-c/coMunity/branches/develop/protection",
  required_status_checks: {
    strict: true,
    contexts: ["Tests"],
    checks: [{ context: "Tests", app_id: null }],
  },
  enforce_admins: { enabled: true },
  required_pull_request_reviews: {
    required_approving_review_count: 0,
    dismiss_stale_reviews: false,
    require_code_owner_reviews: false,
    require_last_push_approval: false,
  },
  restrictions: undefined,
  required_linear_history: { enabled: false },
  allow_force_pushes: { enabled: false },
  allow_deletions: { enabled: false },
  block_creations: { enabled: false },
  required_conversation_resolution: { enabled: false },
  lock_branch: { enabled: false },
  allow_fork_syncing: { enabled: false },
  ...surcharge,
});

const nues = { develop: null, main: null };
const posees = { develop: reponsePosee(), main: reponsePosee() };

describe("reglagesCibles", () => {
  it("exige le contrôle de CI du fichier de valeurs, à jour avec la base", () => {
    const corps = reglagesCibles(valeurs);
    expect(corps.required_status_checks).toEqual({
      strict: true,
      checks: [{ context: "Tests" }],
    });
  });

  it("s'applique aux administrateurs, interdit push forcé et suppression", () => {
    const corps = reglagesCibles(valeurs);
    expect(corps.enforce_admins).toBe(true);
    expect(corps.allow_force_pushes).toBe(false);
    expect(corps.allow_deletions).toBe(false);
  });

  it("passe par une PR sans exiger d'approbation, sans restriction de personne", () => {
    const corps = reglagesCibles(valeurs);
    expect(corps.required_pull_request_reviews).toEqual({
      required_approving_review_count: 0,
    });
    expect(corps.restrictions).toBeNull();
  });

  it("suit le nom du contrôle donné par le fichier de valeurs", () => {
    const corps = reglagesCibles({ ...valeurs, controleCi: "Suite" });
    expect(corps.required_status_checks.checks).toEqual([{ context: "Suite" }]);
  });
});

describe("resumer", () => {
  it("rend null pour une branche sans protection", () => {
    expect(resumer(null)).toBeNull();
  });

  it("lit les réglages d'une réponse de GitHub", () => {
    expect(resumer(reponsePosee())).toEqual({
      controles: ["Tests"],
      aJourAvecLaBase: true,
      administrateurs: true,
      pushForce: false,
      suppression: false,
      pullRequestObligatoire: true,
      approbations: 0,
      restrictionsDePush: false,
      autres: [],
    });
  });

  it("lit une protection sans contrôle requis", () => {
    const reponse = reponsePosee({ required_status_checks: undefined });
    expect(resumer(reponse).controles).toEqual([]);
    expect(resumer(reponse).aJourAvecLaBase).toBe(false);
  });

  it("repère un réglage que la commande ne pose pas", () => {
    const reponse = reponsePosee({
      required_linear_history: { enabled: true },
      lock_branch: { enabled: true },
    });
    expect(resumer(reponse).autres).toEqual([
      "required_linear_history",
      "lock_branch",
    ]);
  });
});

describe("decider --poser", () => {
  it("pose les réglages sur develop et sur main quand aucune n'est protégée", () => {
    const { appels, refus } = decider(
      { action: "poser", protections: nues },
      valeurs,
    );
    expect(refus).toEqual([]);
    expect(appels).toEqual([
      {
        branche: "develop",
        methode: "PUT",
        chemin: "repos/fakossa-c/coMunity/branches/develop/protection",
        corps: reglagesCibles(valeurs),
      },
      {
        branche: "main",
        methode: "PUT",
        chemin: "repos/fakossa-c/coMunity/branches/main/protection",
        corps: reglagesCibles(valeurs),
      },
    ]);
  });

  it("ne fait rien sur une branche déjà protégée à l'identique", () => {
    const { appels, rien } = decider(
      { action: "poser", protections: { develop: reponsePosee(), main: null } },
      valeurs,
    );
    expect(appels.map((a) => a.branche)).toEqual(["main"]);
    expect(rien).toEqual([
      { branche: "develop", raison: "déjà protégée comme demandé" },
    ]);
  });

  it("ne fait rien du tout quand les deux sont déjà posées", () => {
    const { appels, rien, refus } = decider(
      { action: "poser", protections: posees },
      valeurs,
    );
    expect(appels).toEqual([]);
    expect(refus).toEqual([]);
    expect(rien.map((r) => r.branche)).toEqual(["develop", "main"]);
  });

  it("refuse d'écraser une protection qui n'est pas la sienne, et ne pose rien nulle part", () => {
    const { appels, refus } = decider(
      {
        action: "poser",
        protections: {
          develop: null,
          main: reponsePosee({ allow_force_pushes: { enabled: true } }),
        },
      },
      valeurs,
    );
    expect(appels).toEqual([]);
    expect(refus).toHaveLength(1);
    expect(refus[0].branche).toBe("main");
    expect(refus[0].raison).toMatch(/--etat/);
  });

  it("refuse aussi une protection d'un autre contrôle de CI", () => {
    const autre = reponsePosee({
      required_status_checks: {
        strict: true,
        contexts: ["Autre"],
        checks: [{ context: "Autre", app_id: null }],
      },
    });
    const { appels, refus } = decider(
      { action: "poser", protections: { develop: autre, main: null } },
      valeurs,
    );
    expect(appels).toEqual([]);
    expect(refus.map((r) => r.branche)).toEqual(["develop"]);
  });

  it("refuse une protection qui porte un réglage hors de ceux de la commande", () => {
    const { refus } = decider(
      {
        action: "poser",
        protections: {
          develop: reponsePosee({ lock_branch: { enabled: true } }),
          main: null,
        },
      },
      valeurs,
    );
    expect(refus.map((r) => r.branche)).toEqual(["develop"]);
  });
});

describe("decider --retirer", () => {
  it("supprime la protection des deux branches", () => {
    const { appels } = decider(
      { action: "retirer", protections: posees },
      valeurs,
    );
    expect(appels).toEqual([
      {
        branche: "develop",
        methode: "DELETE",
        chemin: "repos/fakossa-c/coMunity/branches/develop/protection",
      },
      {
        branche: "main",
        methode: "DELETE",
        chemin: "repos/fakossa-c/coMunity/branches/main/protection",
      },
    ]);
  });

  it("ne touche pas une branche qui n'est pas protégée", () => {
    const { appels, rien } = decider(
      {
        action: "retirer",
        protections: { develop: posees.develop, main: null },
      },
      valeurs,
    );
    expect(appels.map((a) => a.branche)).toEqual(["develop"]);
    expect(rien).toEqual([{ branche: "main", raison: "déjà sans protection" }]);
  });

  it("n'a rien à faire quand aucune n'est protégée", () => {
    const { appels, rien } = decider(
      { action: "retirer", protections: nues },
      valeurs,
    );
    expect(appels).toEqual([]);
    expect(rien).toHaveLength(2);
  });
});

describe("decider --etat", () => {
  it("n'émet aucun appel d'écriture", () => {
    const { appels, refus } = decider(
      { action: "etat", protections: posees },
      valeurs,
    );
    expect(appels).toEqual([]);
    expect(refus).toEqual([]);
  });
});

describe("decider : branche d'intégration", () => {
  it("protège la branche d'intégration du fichier de valeurs et main", () => {
    const { appels } = decider(
      { action: "poser", protections: { integ: null, main: null } },
      { ...valeurs, brancheIntegration: "integ" },
    );
    expect(appels.map((a) => a.branche)).toEqual(["integ", "main"]);
  });
});

describe("appelGh", () => {
  it("construit un PUT qui lit son corps sur l'entrée standard", () => {
    const [appel] = decider(
      { action: "poser", protections: nues },
      valeurs,
    ).appels;
    const { args, entree } = appelGh(appel);
    expect(args).toEqual([
      "api",
      "--method",
      "PUT",
      "-H",
      "Accept: application/vnd.github+json",
      "repos/fakossa-c/coMunity/branches/develop/protection",
      "--input",
      "-",
    ]);
    expect(JSON.parse(entree)).toEqual(reglagesCibles(valeurs));
  });

  it("construit un DELETE sans corps", () => {
    const [appel] = decider(
      { action: "retirer", protections: posees },
      valeurs,
    ).appels;
    const { args, entree } = appelGh(appel);
    expect(args).toEqual([
      "api",
      "--method",
      "DELETE",
      "-H",
      "Accept: application/vnd.github+json",
      "repos/fakossa-c/coMunity/branches/develop/protection",
    ]);
    expect(entree).toBeUndefined();
  });
});

describe("formaterEtat", () => {
  it("dit qu'une branche n'est pas protégée", () => {
    const texte = formaterEtat(nues, valeurs);
    expect(texte).toMatch(/develop : aucune protection/);
    expect(texte).toMatch(/main : aucune protection/);
  });

  it("liste les réglages d'une branche protégée", () => {
    const texte = formaterEtat(posees, valeurs);
    expect(texte).toMatch(/develop/);
    expect(texte).toMatch(/Tests/);
    expect(texte).toMatch(/administrateurs/);
  });
});

describe("formaterAppels", () => {
  it("affiche chaque appel avec sa méthode et son chemin", () => {
    const { appels } = decider({ action: "poser", protections: nues }, valeurs);
    const texte = formaterAppels(appels);
    expect(texte).toMatch(
      /PUT repos\/fakossa-c\/coMunity\/branches\/develop\/protection/,
    );
    expect(texte).toMatch(/"enforce_admins": true/);
  });
});
