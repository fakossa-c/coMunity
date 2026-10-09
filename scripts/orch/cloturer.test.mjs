import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  changementPourLesResidents,
  commentaireCloture,
  decider,
  decrire,
  marqueurCloture,
  resumeSpec,
  texteEchec,
  trouverSession,
} from "./cloturer.mjs";

const valeurs = {
  projet: "comunity",
  depot: "fakossa-c/coMunity",
  compteGh: "fakossa-c",
  brancheIntegration: "develop",
  dossierWorktrees: ".claude/worktrees",
  commandes: {
    arret: "npx supabase stop",
    migrationDistante: "npm run db:pousser",
  },
  pousserMigrationsApresFusion: true,
  misesAJourBrancheMax: 3,
};

const RACINE = "/depot";
const HOME = "/home/test";
const TETE = "c1b4a9a11b95cba3e48d7062626dfd8ad45f2894";
const FUSION = "9f2e7d1c0000000000000000000000000000beef";

const types = (resultat) => resultat.actions.map((a) => a.type);

/** Un ticket #212 dont la PR #231 est ouverte et fusionnable, avec toute sa mise en place. Chaque
 * test surcharge ce qu'il veut changer. */
const situation = (surcharge = {}) => ({
  ticket: 212,
  racine: RACINE,
  home: HOME,
  pr: {
    numero: 231,
    etat: "OPEN",
    titre: "Clôturer un ticket par une commande (#212)",
    etiquettes: [],
    fichiers: ["scripts/orch/cloturer.mjs", "scripts/orch/cloturer.test.mjs"],
    fusionCommit: null,
  },
  verdict: { fusionnable: true, tete: TETE, raisons: [] },
  developAJour: false,
  migrationPoussee: false,
  issue: { etat: "OPEN", cloture: false },
  spec: null,
  session: { id: "ab12cd34", etat: "done" },
  worktreeExiste: true,
  entreeEtat: true,
  brancheCheckoutPrincipal: "develop",
  ...surcharge,
});

/** La même situation une fois la PR fusionnée (ce que voit une relance). */
const apresFusion = (surcharge = {}) =>
  situation({
    pr: {
      ...situation().pr,
      etat: "MERGED",
      fusionCommit: FUSION,
    },
    verdict: null,
    issue: { etat: "CLOSED", cloture: false },
    ...surcharge,
  });

const specAvecUnSeulTicketOuvert = {
  numero: 208,
  titre: "Boucle de livraison déterministe",
  etat: "OPEN",
  tickets: [
    { numero: 210, titre: "Lancer", etat: "CLOSED" },
    { numero: 211, titre: "Vérifier", etat: "CLOSED" },
    { numero: 212, titre: "Clôturer", etat: "OPEN" },
  ],
};

const specAvecUnAutreTicketOuvert = {
  ...specAvecUnSeulTicketOuvert,
  tickets: [
    { numero: 212, titre: "Clôturer", etat: "OPEN" },
    { numero: 216, titre: "Boucle", etat: "OPEN" },
  ],
};

describe("decider : un ticket dont la PR est fusionnable", () => {
  it("enchaîne les actions dans l'ordre de la spec, sans migration ni spec", () => {
    const resultat = decider(situation(), valeurs);
    expect(resultat.refus).toEqual([]);
    expect(types(resultat)).toEqual([
      "fusionner",
      "majDevelop",
      "statut",
      "fermerTicket",
      "commenterTicket",
      "arreterService",
      "retirerWorktree",
      "supprimerSession",
      "effacerEtat",
    ]);
  });

  it("fusionne sur le commit de tête du verdict de la vérification", () => {
    const fusion = decider(situation(), valeurs).actions[0];
    expect(fusion).toMatchObject({ type: "fusionner", pr: 231, tete: TETE });
  });

  it("met develop à jour dans le checkout principal", () => {
    const action = decider(situation(), valeurs).actions[1];
    expect(action).toMatchObject({
      type: "majDevelop",
      racine: RACINE,
      branche: "develop",
    });
  });

  it("passe le ticket « Done » puis le ferme et le commente, sur le bon ticket", () => {
    const { actions } = decider(situation(), valeurs);
    expect(actions.find((a) => a.type === "statut")).toMatchObject({
      ticket: 212,
      statut: "Done",
    });
    expect(actions.find((a) => a.type === "fermerTicket")).toMatchObject({
      ticket: 212,
    });
    const commentaire = actions.find((a) => a.type === "commenterTicket");
    expect(commentaire.ticket).toBe(212);
    expect(commentaire.corps).toContain("#231");
    expect(commentaire.corps).toContain(marqueurCloture(212));
  });

  it("retire le worktree par le hook existant, depuis le checkout principal", () => {
    const retrait = decider(situation(), valeurs).actions.find(
      (a) => a.type === "retirerWorktree",
    );
    expect(retrait).toMatchObject({
      nom: "ticket-212",
      racine: RACINE,
      hook: join(HOME, ".claude", "hooks", "worktree-remove.mjs"),
    });
  });

  it("arrête le Supabase du worktree avant de retirer le worktree", () => {
    const { actions } = decider(situation(), valeurs);
    const arret = actions.find((a) => a.type === "arreterService");
    expect(arret).toMatchObject({
      commande: "npx supabase stop",
      dossier: join(RACINE, ".claude/worktrees", "ticket-212"),
    });
    expect(types({ actions }).indexOf("arreterService")).toBeLessThan(
      types({ actions }).indexOf("retirerWorktree"),
    );
  });

  it("supprime la session après le retrait du worktree, puis efface l'entrée d'état", () => {
    const t = types(decider(situation(), valeurs));
    expect(t.indexOf("supprimerSession")).toBeGreaterThan(
      t.indexOf("retirerWorktree"),
    );
    expect(t.at(-1)).toBe("effacerEtat");
    const efface = decider(situation(), valeurs).actions.at(-1);
    expect(efface).toMatchObject({
      ticket: 212,
      fichierEtat: join(
        HOME,
        ".claude",
        "state",
        "orch",
        "comunity",
        "etat.json",
      ),
    });
  });

  it("arrête d'abord une session encore en cours, avant de retirer le worktree", () => {
    const t = types(
      decider(
        situation({ session: { id: "ab12cd34", etat: "working" } }),
        valeurs,
      ),
    );
    expect(t).toContain("arreterSession");
    expect(t.indexOf("arreterSession")).toBeLessThan(
      t.indexOf("retirerWorktree"),
    );
  });

  it("arrête aussi une session finie encore listée, avant de retirer le worktree", () => {
    // Une session de fond `done` ou `idle` garde son processus dans le worktree : sans `claude
    // stop`, le hook de retrait refuse (incident du 2026-10-09, #233).
    for (const etat of ["working", "idle", "done", "failed", "stopped"]) {
      const t = types(
        decider(situation({ session: { id: "ab12cd34", etat } }), valeurs),
      );
      expect(t).toContain("arreterSession");
      expect(t.indexOf("arreterSession")).toBeLessThan(
        t.indexOf("retirerWorktree"),
      );
      expect(t.indexOf("retirerWorktree")).toBeLessThan(
        t.indexOf("supprimerSession"),
      );
    }
  });

  it("n'arrête rien quand la session n'est plus listée", () => {
    const t = types(decider(situation({ session: null }), valeurs));
    expect(t).not.toContain("arreterSession");
    expect(t).not.toContain("supprimerSession");
    expect(t).toContain("retirerWorktree");
  });
});

describe("decider : refus", () => {
  it("refuse sans aucune action quand la vérification échoue, et donne ses raisons", () => {
    const resultat = decider(
      situation({
        verdict: {
          fusionnable: false,
          tete: TETE,
          raisons: ["ci : contrôle Tests rouge (failure)", "labels : x"],
        },
      }),
      valeurs,
    );
    expect(resultat.actions).toEqual([]);
    expect(resultat.refus.join("\n")).toContain("ci : contrôle Tests rouge");
    expect(resultat.refus.join("\n")).toContain("labels : x");
  });

  it("refuse sans aucune action quand il n'y a aucune PR", () => {
    const resultat = decider(situation({ pr: null, verdict: null }), valeurs);
    expect(resultat.actions).toEqual([]);
    expect(resultat.refus.length).toBeGreaterThan(0);
  });

  it("refuse une PR ouverte dont la vérification manque", () => {
    const resultat = decider(situation({ verdict: null }), valeurs);
    expect(resultat.actions).toEqual([]);
    expect(resultat.refus.length).toBeGreaterThan(0);
  });

  it("ne relit pas le verdict d'une PR déjà fusionnée", () => {
    const resultat = decider(apresFusion(), valeurs);
    expect(resultat.refus).toEqual([]);
    expect(types(resultat)).not.toContain("fusionner");
  });
});

/** Le verdict de verifier-pr.mjs d'une PR dont le seul manquement est le retard sur develop. */
const verdictEnRetard = (surcharge = {}) => ({
  fusionnable: false,
  tete: TETE,
  raisons: ["a-jour : branche en retard sur develop"],
  points: [
    { id: "ci", ok: true, detail: "contrôle Tests vert sur le commit de tête" },
    { id: "a-jour", ok: false, detail: "branche en retard sur develop" },
  ],
  ...surcharge,
});

describe("decider : une PR en retard sur develop", () => {
  it("met la branche à jour sur le commit de tête vérifié, sans fusionner ni rien clôturer", () => {
    const resultat = decider(
      situation({ verdict: verdictEnRetard() }),
      valeurs,
    );
    expect(resultat.refus).toEqual([]);
    expect(resultat.actions).toEqual([
      expect.objectContaining({
        type: "noterMiseAJourBranche",
        ticket: 212,
      }),
      { type: "mettreAJourBranche", pr: 231, tete: TETE },
    ]);
    expect(resultat.suspendue).toMatch(/contrôle.*nouveau commit de tête/);
  });

  it("ne suspend rien pour une PR fusionnable", () => {
    expect(decider(situation(), valeurs).suspendue).toBeUndefined();
  });

  it("refuse, comme avant, quand le retard s'ajoute à un autre manquement", () => {
    const resultat = decider(
      situation({
        verdict: verdictEnRetard({
          raisons: [
            "ci : contrôle Tests absent",
            "a-jour : branche en retard sur develop",
          ],
          points: [
            { id: "ci", ok: false, detail: "contrôle Tests absent" },
            { id: "a-jour", ok: false, detail: "branche en retard" },
          ],
        }),
      }),
      valeurs,
    );
    expect(resultat.actions).toEqual([]);
    expect(resultat.refus.join("\n")).toContain("ci : contrôle Tests absent");
  });

  it("refuse une quatrième mise à jour du même ticket et dit pourquoi", () => {
    const resultat = decider(
      situation({ verdict: verdictEnRetard(), misesAJourBranche: 3 }),
      valeurs,
    );
    expect(resultat.actions).toEqual([]);
    expect(resultat.refus.join("\n")).toMatch(/3 fois/);
  });

  it("autorise la troisième mise à jour du même ticket", () => {
    const resultat = decider(
      situation({ verdict: verdictEnRetard(), misesAJourBranche: 2 }),
      valeurs,
    );
    expect(resultat.refus).toEqual([]);
    expect(types(resultat)).toContain("mettreAJourBranche");
  });

  it("refuse de mettre la branche à jour d'un ticket que l'état ne suit pas : sans compteur, la borne ne tiendrait pas", () => {
    const resultat = decider(
      situation({ verdict: verdictEnRetard(), entreeEtat: false }),
      valeurs,
    );
    expect(resultat.actions).toEqual([]);
    expect(resultat.refus.join("\n")).toMatch(/gh pr update-branch 231/);
  });

  it("n'y touche pas quand la PR est déjà fusionnée", () => {
    expect(types(decider(apresFusion(), valeurs))).not.toContain(
      "mettreAJourBranche",
    );
  });
});

describe("decider : migration", () => {
  const avecMigration = (surcharge = {}) =>
    situation({
      pr: {
        ...situation().pr,
        etiquettes: ["migration"],
        fichiers: ["supabase/migrations/20261008120000_x.sql"],
      },
      ...surcharge,
    });

  it("liste puis applique la poussée quand le label est posé et que la valeur l'autorise", () => {
    const t = types(decider(avecMigration(), valeurs));
    const i = t.indexOf("listerMigrations");
    expect(i).toBeGreaterThan(t.indexOf("majDevelop"));
    expect(t.slice(i, i + 3)).toEqual([
      "listerMigrations",
      "pousserMigrations",
      "noterMigrationPoussee",
    ]);
    expect(i).toBeLessThan(t.indexOf("commenterTicket"));
  });

  it("lance la commande de poussée du projet, en mode liste puis en mode application", () => {
    const { actions } = decider(avecMigration(), valeurs);
    expect(actions.find((a) => a.type === "listerMigrations")).toMatchObject({
      commande: "npm run db:pousser",
      racine: RACINE,
    });
    expect(actions.find((a) => a.type === "pousserMigrations")).toMatchObject({
      commande: "npm run db:pousser -- --appliquer",
      racine: RACINE,
    });
  });

  it("ne pousse rien sans le label migration", () => {
    const t = types(decider(situation(), valeurs));
    expect(t).not.toContain("listerMigrations");
    expect(t).not.toContain("pousserMigrations");
  });

  it("ne pousse rien quand la valeur du projet l'interdit, et le dit dans ce qui reste", () => {
    const resultat = decider(avecMigration(), {
      ...valeurs,
      pousserMigrationsApresFusion: false,
    });
    const t = types(resultat);
    expect(t).not.toContain("listerMigrations");
    expect(t).not.toContain("pousserMigrations");
    const commentaire = resultat.actions.find(
      (a) => a.type === "commenterTicket",
    );
    expect(commentaire.corps).toContain("npm run db:pousser");
  });

  it("ne repousse pas une migration déjà poussée lors d'une relance", () => {
    const t = types(
      decider(
        avecMigration({
          pr: { ...avecMigration().pr, etat: "MERGED", fusionCommit: FUSION },
          verdict: null,
          migrationPoussee: true,
        }),
        valeurs,
      ),
    );
    expect(t).not.toContain("pousserMigrations");
    expect(t).not.toContain("listerMigrations");
  });

  it("ne repousse pas une migration dont le commentaire de clôture est posé, même sans entrée d'état", () => {
    const resultat = decider(
      avecMigration({
        pr: { ...avecMigration().pr, etat: "MERGED", fusionCommit: FUSION },
        verdict: null,
        developAJour: true,
        issue: { etat: "CLOSED", cloture: true },
        migrationPoussee: false,
        entreeEtat: false,
        worktreeExiste: false,
        session: null,
      }),
      valeurs,
    );
    expect(resultat.actions).toEqual([]);
  });

  it("efface l'entrée d'état même quand la poussée vient de la créer", () => {
    const t = types(decider(avecMigration({ entreeEtat: false }), valeurs));
    expect(t.at(-1)).toBe("effacerEtat");
  });
});

describe("decider : le checkout principal", () => {
  it("refuse avant toute fusion quand le checkout principal n'est pas sur develop", () => {
    const resultat = decider(
      situation({ brancheCheckoutPrincipal: "ticket-99" }),
      valeurs,
    );
    expect(resultat.actions).toEqual([]);
    expect(resultat.refus.join("\n")).toContain("ticket-99");
    expect(resultat.refus.join("\n")).toContain("develop");
  });

  it("refuse aussi la reprise qui doit mettre develop à jour", () => {
    const resultat = decider(
      apresFusion({ brancheCheckoutPrincipal: "ticket-99" }),
      valeurs,
    );
    expect(resultat.actions).toEqual([]);
    expect(resultat.refus.length).toBeGreaterThan(0);
  });

  it("n'exige pas develop quand il est déjà à jour", () => {
    const resultat = decider(
      apresFusion({
        developAJour: true,
        brancheCheckoutPrincipal: "ticket-99",
      }),
      valeurs,
    );
    expect(resultat.refus).toEqual([]);
  });
});

describe("decider : la spec", () => {
  it("ferme la spec avec un résumé quand ce ticket était le dernier ouvert", () => {
    const resultat = decider(
      situation({ spec: specAvecUnSeulTicketOuvert }),
      valeurs,
    );
    const fermeture = resultat.actions.find((a) => a.type === "fermerSpec");
    expect(fermeture).toMatchObject({ spec: 208 });
    expect(fermeture.corps).toContain("#212");
    const t = types(resultat);
    expect(t.indexOf("fermerSpec")).toBeGreaterThan(
      t.indexOf("commenterTicket"),
    );
  });

  it("laisse la spec ouverte quand un autre ticket est encore ouvert", () => {
    const t = types(
      decider(situation({ spec: specAvecUnAutreTicketOuvert }), valeurs),
    );
    expect(t).not.toContain("fermerSpec");
  });

  it("ne touche pas à une spec déjà fermée", () => {
    const t = types(
      decider(
        situation({ spec: { ...specAvecUnSeulTicketOuvert, etat: "CLOSED" } }),
        valeurs,
      ),
    );
    expect(t).not.toContain("fermerSpec");
  });

  it("ne compte pas ce ticket parmi les ouverts, même fermé par la PR avant la lecture", () => {
    const t = types(
      decider(
        apresFusion({
          spec: {
            ...specAvecUnSeulTicketOuvert,
            tickets: specAvecUnSeulTicketOuvert.tickets.map((x) => ({
              ...x,
              etat: "CLOSED",
            })),
          },
        }),
        valeurs,
      ),
    );
    expect(t).toContain("fermerSpec");
  });

  it("n'a rien à faire pour un ticket sans spec", () => {
    expect(types(decider(situation({ spec: null }), valeurs))).not.toContain(
      "fermerSpec",
    );
  });
});

describe("decider : reprise après un échec partiel", () => {
  it("ne refait ni la fusion ni la mise à jour de develop quand elles sont faites", () => {
    const t = types(decider(apresFusion({ developAJour: true }), valeurs));
    expect(t).not.toContain("fusionner");
    expect(t).not.toContain("majDevelop");
    expect(t[0]).toBe("statut");
  });

  it("reprend à la mise à jour de develop quand seule la fusion est faite", () => {
    const t = types(decider(apresFusion(), valeurs));
    expect(t[0]).toBe("majDevelop");
  });

  it("ne refait pas la clôture du ticket quand son commentaire est posé", () => {
    const t = types(
      decider(
        apresFusion({
          developAJour: true,
          issue: { etat: "CLOSED", cloture: true },
        }),
        valeurs,
      ),
    );
    expect(t).not.toContain("statut");
    expect(t).not.toContain("fermerTicket");
    expect(t).not.toContain("commenterTicket");
    expect(t).toContain("retirerWorktree");
  });

  it("ne refait pas ce qui a disparu : session, worktree et entrée d'état", () => {
    const resultat = decider(
      apresFusion({
        developAJour: true,
        issue: { etat: "CLOSED", cloture: true },
        session: null,
        worktreeExiste: false,
        entreeEtat: false,
      }),
      valeurs,
    );
    expect(resultat.refus).toEqual([]);
    expect(resultat.actions).toEqual([]);
  });

  it("reprend au retrait du worktree quand tout le reste est fait", () => {
    const t = types(
      decider(
        apresFusion({
          developAJour: true,
          issue: { etat: "CLOSED", cloture: true },
          session: { id: "ab12cd34", etat: "stopped" },
        }),
        valeurs,
      ),
    );
    expect(t).toEqual([
      "arreterService",
      "retirerWorktree",
      "supprimerSession",
      "effacerEtat",
    ]);
  });

  it("n'arrête pas le service d'un worktree déjà retiré", () => {
    const t = types(
      decider(
        apresFusion({
          developAJour: true,
          issue: { etat: "CLOSED", cloture: true },
          worktreeExiste: false,
        }),
        valeurs,
      ),
    );
    expect(t).not.toContain("arreterService");
    expect(t).not.toContain("retirerWorktree");
    expect(t).toContain("supprimerSession");
  });
});

describe("commentaires", () => {
  it("le commentaire de clôture dit la PR, ce qui change pour l'utilisateur et ce qui reste", () => {
    const corps = commentaireCloture({
      ticket: 212,
      pr: situation().pr,
      changement: "Rien de visible pour les résidents.",
      reste: "Rien.",
    });
    expect(corps).toContain("#231");
    expect(corps).toContain("Ce qui change pour l'utilisateur");
    expect(corps).toContain("Rien de visible pour les résidents.");
    expect(corps).toContain("Ce qui reste");
    expect(corps).toContain(marqueurCloture(212));
  });

  it("le marqueur est propre à un ticket", () => {
    expect(marqueurCloture(212)).not.toBe(marqueurCloture(2120));
    expect(marqueurCloture(212)).toContain("212");
  });

  it("ce qui change : rien de visible quand la PR ne touche que l'outillage", () => {
    expect(
      changementPourLesResidents([
        "scripts/orch/cloturer.mjs",
        ".claude/orchestration.json",
        "docs/adr/0001.md",
      ]),
    ).toMatch(/Rien de visible/);
  });

  it("ce qui change : renvoie à la PR quand elle touche l'application ou la base", () => {
    for (const chemin of [
      "src/app/page.tsx",
      "src/components/Bouton.tsx",
      "supabase/migrations/20261008120000_x.sql",
    ]) {
      expect(changementPourLesResidents(["scripts/x.mjs", chemin])).not.toMatch(
        /Rien de visible/,
      );
    }
  });

  it("le résumé de la spec liste ses tickets et la PR du dernier", () => {
    const corps = resumeSpec({
      spec: specAvecUnSeulTicketOuvert,
      ticket: 212,
      pr: situation().pr,
    });
    for (const n of ["#210", "#211", "#212", "#231"]) {
      expect(corps).toContain(n);
    }
  });

  it("le message d'échec dit l'étape, la cause et comment reprendre", () => {
    const corps = texteEchec({
      ticket: 212,
      action: { type: "retirerWorktree" },
      message: "dossier verrouillé par un autre processus",
      faites: ["fusionner", "majDevelop", "statut"],
    });
    expect(corps).toContain("retirerWorktree");
    expect(corps).toContain("dossier verrouillé par un autre processus");
    expect(corps).toContain("node scripts/orch/cloturer.mjs 212");
    expect(corps).toContain("majDevelop");
  });
});

describe("decrire", () => {
  it("décrit chaque action d'une clôture complète", () => {
    const resultat = decider(
      situation({
        pr: {
          ...situation().pr,
          etiquettes: ["migration"],
          fichiers: ["supabase/migrations/20261008120000_x.sql"],
        },
        spec: specAvecUnSeulTicketOuvert,
        session: { id: "ab12cd34", etat: "working" },
      }),
      valeurs,
    );
    for (const action of resultat.actions) {
      expect(decrire(action)).toEqual(expect.any(String));
    }
  });

  it("décrit la mise à jour de la branche", () => {
    const { actions } = decider(
      situation({ verdict: verdictEnRetard() }),
      valeurs,
    );
    const textes = actions.map(decrire);
    expect(textes.join("\n")).toMatch(/Mettre à jour la branche de la PR #231/);
    expect(textes.join("\n")).toContain(TETE.slice(0, 7));
  });

  it("refuse une action inconnue", () => {
    expect(() => decrire({ type: "inconnue" })).toThrow(/inconnue/);
  });
});

describe("trouverSession", () => {
  const interactive = { kind: "interactive", name: "ticket-212" };
  const fond = { id: "ab12cd34", name: "ticket-212", state: "done" };

  it("trouve la session par l'identifiant gardé dans l'état", () => {
    const renommee = { id: "ab12cd34", name: "autre nom" };
    expect(
      trouverSession([renommee], { session: "ab12cd34" }, "ticket-212"),
    ).toBe(renommee);
  });

  it("à défaut d'état, la trouve par son nom", () => {
    expect(trouverSession([fond], null, "ticket-212")).toBe(fond);
  });

  it("ne prend jamais une session sans identifiant pour celle d'un ticket sans état", () => {
    expect(trouverSession([interactive], null, "ticket-211")).toBeNull();
    expect(trouverSession([interactive], null, "ticket-212")).toBeNull();
  });

  it("rend null quand aucune session ne correspond", () => {
    expect(trouverSession([fond], null, "ticket-211")).toBeNull();
  });
});
