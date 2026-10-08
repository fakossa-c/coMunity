import { describe, expect, it } from "vitest";
import {
  decider,
  enRetardSeulement,
  fermeturesDepuisCorps,
  formater,
  titreCiteLeTicket,
} from "./verifier-pr.mjs";

const valeurs = { brancheIntegration: "develop", controleCi: "Tests" };

const TETE = "c1b4a9a11b95cba3e48d7062626dfd8ad45f2894";
const ANCIEN = "0a0934e1111111111111111111111111111111aa";

/** Une PR conforme au ticket #211 ; chaque test surcharge ce qu'il veut casser. */
const pr = (surcharge = {}) => ({
  numero: 230,
  titre: "Vérifier une PR par une commande (#211)",
  corps: "Closes #211\n\nSpec parente : #208.",
  base: "develop",
  tete: TETE,
  etiquettes: [],
  fichiers: ["scripts/orch/verifier-pr.mjs"],
  fermeture: [211],
  fusion: "MERGEABLE",
  etatFusion: "CLEAN",
  ...surcharge,
});

const controle = (surcharge = {}) => ({
  id: 1,
  nom: "Tests",
  sha: TETE,
  statut: "completed",
  conclusion: "success",
  ...surcharge,
});

/** La situation d'un ticket #211 dont tout est en règle. */
const situation = (surcharge = {}) => ({
  ticket: 211,
  prs: [230],
  pr: pr(),
  issue: { etiquettes: ["ready-for-agent"] },
  controles: [controle()],
  ...surcharge,
});

const point = (verdict, id) => verdict.points.find((p) => p.id === id);

describe("decider : une PR conforme", () => {
  it("est fusionnable, chaque point ok, avec le commit de tête à fusionner", () => {
    const verdict = decider(situation(), valeurs);
    expect(verdict.fusionnable).toBe(true);
    expect(verdict.raisons).toEqual([]);
    expect(verdict.pr).toBe(230);
    expect(verdict.tete).toBe(TETE);
    expect(verdict.points.map((p) => p.id)).toEqual([
      "pr",
      "base",
      "titre",
      "closes",
      "migration",
      "ci",
      "labels",
      "conflit",
      "a-jour",
    ]);
    expect(verdict.points.every((p) => p.ok)).toBe(true);
  });

  it("nomme le contrôle exigé et le commit de tête dans le point CI", () => {
    const { detail } = point(decider(situation(), valeurs), "ci");
    expect(detail).toContain("Tests");
    expect(detail).toContain(TETE.slice(0, 7));
  });
});

describe("decider : la PR du ticket", () => {
  it("refuse quand aucune PR n'est ouverte, sans juger le reste", () => {
    const verdict = decider(
      situation({ prs: [], pr: null, controles: [] }),
      valeurs,
    );
    expect(verdict.fusionnable).toBe(false);
    expect(verdict.pr).toBeNull();
    expect(verdict.tete).toBeNull();
    expect(point(verdict, "pr")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/aucune PR ouverte.*ticket-211/),
    });
    expect(verdict.points.filter((p) => !p.ok)).toHaveLength(9);
    expect(point(verdict, "base").detail).toMatch(/non vérifié/);
  });

  it("refuse deux PR ouvertes et les nomme", () => {
    const verdict = decider(
      situation({ prs: [230, 231], pr: null, controles: [] }),
      valeurs,
    );
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "pr").detail).toMatch(/#230.*#231/);
    expect(point(verdict, "pr").detail).toMatch(/2 PR ouvertes/);
  });
});

describe("decider : la base", () => {
  it("refuse une base différente de la branche d'intégration", () => {
    const verdict = decider(situation({ pr: pr({ base: "main" }) }), valeurs);
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "base")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/main.*develop/),
    });
  });
});

describe("decider : le titre", () => {
  it("accepte le numéro du ticket n'importe où dans le titre", () => {
    for (const titre of [
      "#211 : vérifier une PR",
      "Vérifier une PR par une commande (#211)",
      "Vérification (#211), suite",
    ]) {
      const verdict = decider(situation({ pr: pr({ titre }) }), valeurs);
      expect(point(verdict, "titre").ok, titre).toBe(true);
    }
  });

  it("refuse un titre sans numéro de ticket", () => {
    const verdict = decider(
      situation({ pr: pr({ titre: "Vérifier une PR par une commande" }) }),
      valeurs,
    );
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "titre")).toMatchObject({
      ok: false,
      detail: expect.stringContaining("#211"),
    });
  });

  it("refuse un titre qui cite un autre ticket", () => {
    const verdict = decider(
      situation({ pr: pr({ titre: "Lancer un ticket (#210)" }) }),
      valeurs,
    );
    expect(point(verdict, "titre").ok).toBe(false);
  });

  it("ne confond pas #211 avec #2110", () => {
    expect(titreCiteLeTicket("Un titre (#2110)", 211)).toBe(false);
    expect(titreCiteLeTicket("Un titre (#2110) et #211", 211)).toBe(true);
    expect(titreCiteLeTicket("Un titre (#1211)", 211)).toBe(false);
  });
});

describe("decider : Closes", () => {
  it("refuse un corps sans Closes", () => {
    const verdict = decider(
      situation({ pr: pr({ corps: "Spec parente : #208.", fermeture: [] }) }),
      valeurs,
    );
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "closes")).toMatchObject({
      ok: false,
      detail: expect.stringContaining("Closes #211"),
    });
  });

  it("refuse un Closes vers un autre ticket", () => {
    const verdict = decider(
      situation({ pr: pr({ corps: "Closes #210", fermeture: [210] }) }),
      valeurs,
    );
    expect(point(verdict, "closes")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/#210/),
    });
  });

  it("refuse un Closes qui ferme aussi un autre ticket", () => {
    const verdict = decider(
      situation({
        pr: pr({
          corps: "Closes #211\nCloses #212",
          fermeture: [211, 212],
        }),
      }),
      valeurs,
    );
    expect(point(verdict, "closes")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/#212/),
    });
  });

  it("refuse un autre ticket lié par GitHub, absent du texte", () => {
    const verdict = decider(
      situation({ pr: pr({ fermeture: [211, 209] }) }),
      valeurs,
    );
    expect(point(verdict, "closes")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/#209/),
    });
  });

  it("n'accepte pas un lien GitHub sans la phrase dans le corps", () => {
    const verdict = decider(
      situation({ pr: pr({ corps: "Rien ici.", fermeture: [211] }) }),
      valeurs,
    );
    expect(point(verdict, "closes").ok).toBe(false);
  });

  it("accepte les verbes de fermeture de GitHub, quelle que soit la casse", () => {
    expect(fermeturesDepuisCorps("closes #211")).toEqual([211]);
    expect(fermeturesDepuisCorps("Fixes: #211")).toEqual([211]);
    expect(fermeturesDepuisCorps("RESOLVED #211")).toEqual([211]);
  });

  it("ne lit pas une simple mention comme une fermeture", () => {
    expect(fermeturesDepuisCorps("Spec parente : #208, voir #211")).toEqual([]);
    expect(fermeturesDepuisCorps("Disclosed #211")).toEqual([]);
    expect(fermeturesDepuisCorps("Closes autre/depot#211")).toEqual([]);
  });
});

describe("decider : le label migration", () => {
  const migration = "supabase/migrations/20261008120000_ajout.sql";

  it("accepte le label avec un fichier de migration", () => {
    const verdict = decider(
      situation({
        pr: pr({ etiquettes: ["migration"], fichiers: [migration] }),
      }),
      valeurs,
    );
    expect(point(verdict, "migration").ok).toBe(true);
  });

  it("refuse un fichier de migration sans le label", () => {
    const verdict = decider(
      situation({ pr: pr({ fichiers: [migration, "src/a.ts"] }) }),
      valeurs,
    );
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "migration")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/manque.*migration/),
    });
  });

  it("refuse le label sans fichier de migration", () => {
    const verdict = decider(
      situation({ pr: pr({ etiquettes: ["migration"] }) }),
      valeurs,
    );
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "migration")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/aucun fichier/),
    });
  });

  it("compte une migration déplacée hors du dossier comme une migration touchée", () => {
    const verdict = decider(
      situation({ pr: pr({ fichiers: [migration, "docs/ancienne.sql"] }) }),
      valeurs,
    );
    expect(point(verdict, "migration").ok).toBe(false);
  });
});

describe("decider : le contrôle de CI", () => {
  const ci = (controles, surcharge = {}) =>
    point(decider(situation({ controles, ...surcharge }), valeurs), "ci");

  it("refuse l'absence du contrôle", () => {
    const verdict = decider(situation({ controles: [] }), valeurs);
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "ci")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/Tests.*(absent|aucune)/),
    });
  });

  it("refuse un autre contrôle vert quand Tests manque", () => {
    expect(ci([controle({ nom: "Vercel" })])).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/absent|aucune/),
    });
  });

  it("refuse un contrôle en cours ou en attente", () => {
    for (const statut of ["in_progress", "queued", "pending"]) {
      expect(
        ci([controle({ statut, conclusion: null })]),
        statut,
      ).toMatchObject({
        ok: false,
        detail: expect.stringMatching(/en cours/),
      });
    }
  });

  it("refuse un contrôle rouge et dit sa conclusion", () => {
    for (const conclusion of ["failure", "cancelled", "timed_out", "skipped"]) {
      expect(ci([controle({ conclusion })]), conclusion).toMatchObject({
        ok: false,
        detail: expect.stringContaining(conclusion),
      });
    }
  });

  it("refuse un contrôle vert sur un commit antérieur seulement", () => {
    const resultat = ci([controle({ sha: ANCIEN })]);
    expect(resultat.ok).toBe(false);
    expect(resultat.detail).toMatch(/antérieur/);
    expect(resultat.detail).toContain(ANCIEN.slice(0, 7));
    expect(resultat.detail).toContain(TETE.slice(0, 7));
  });

  it("juge le commit de tête même si un commit antérieur était vert", () => {
    expect(
      ci([
        controle({ id: 1, sha: ANCIEN }),
        controle({ id: 2, conclusion: "failure" }),
      ]),
    ).toMatchObject({ ok: false, detail: expect.stringContaining("failure") });
  });

  it("retient la dernière exécution du commit de tête après une relance", () => {
    expect(
      ci([
        controle({ id: 7, conclusion: "failure" }),
        controle({ id: 9, conclusion: "success" }),
      ]).ok,
    ).toBe(true);
    expect(
      ci([
        controle({ id: 9, conclusion: "failure" }),
        controle({ id: 7, conclusion: "success" }),
      ]).ok,
    ).toBe(false);
  });

  it("range le contrôle du commit de tête dans un état lisible par la boucle, avec le lien du run", () => {
    const url = "https://github.com/fakossa-c/coMunity/actions/runs/9";
    expect(ci([controle({ conclusion: "failure", url })])).toMatchObject({
      etat: "rouge",
      url,
    });
    expect(ci([controle({ conclusion: "timed_out", url })]).etat).toBe("rouge");
    expect(ci([controle({ url })])).toMatchObject({ etat: "vert", url });
    expect(
      ci([controle({ statut: "in_progress", conclusion: null, url })]).etat,
    ).toBe("en cours");
  });

  it("ne dit pas rouge ni vert d'un contrôle absent de la tête, même rouge sur un commit antérieur", () => {
    expect(ci([]).etat).toBe("absent");
    expect(ci([controle({ sha: ANCIEN, conclusion: "failure" })]).etat).toBe(
      "absent",
    );
  });

  it("n'exige aucun contrôle quand le nom est vide, et le dit", () => {
    for (const controleCi of ["", "  "]) {
      const verdict = decider(situation({ controles: [] }), {
        ...valeurs,
        controleCi,
      });
      expect(verdict.fusionnable).toBe(true);
      expect(point(verdict, "ci")).toMatchObject({
        ok: true,
        detail: expect.stringMatching(/aucun contrôle exigé/),
      });
    }
  });
});

describe("decider : les labels bloquants relus", () => {
  it.each(["needs-info", "ready-for-human"])(
    "refuse %s sur le ticket",
    (etiquette) => {
      const verdict = decider(
        situation({ issue: { etiquettes: ["ready-for-agent", etiquette] } }),
        valeurs,
      );
      expect(verdict.fusionnable).toBe(false);
      expect(point(verdict, "labels")).toMatchObject({
        ok: false,
        detail: expect.stringMatching(new RegExp(`ticket #211.*${etiquette}`)),
      });
    },
  );

  it.each(["needs-info", "ready-for-human"])(
    "refuse %s sur la PR",
    (etiquette) => {
      const verdict = decider(
        situation({ pr: pr({ etiquettes: [etiquette] }) }),
        valeurs,
      );
      expect(verdict.fusionnable).toBe(false);
      expect(point(verdict, "labels")).toMatchObject({
        ok: false,
        detail: expect.stringMatching(new RegExp(`PR #230.*${etiquette}`)),
      });
    },
  );

  it("refuse quand le ticket n'a pas pu être relu", () => {
    const verdict = decider(situation({ issue: null }), valeurs);
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "labels").detail).toMatch(/ticket #211.*illisible/);
  });
});

describe("decider : les conflits avec la branche d'intégration", () => {
  it("refuse une PR en conflit", () => {
    const verdict = decider(
      situation({ pr: pr({ fusion: "CONFLICTING" }) }),
      valeurs,
    );
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "conflit")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/conflit.*develop/),
    });
  });

  it("refuse un état de fusion que GitHub n'a pas fini de calculer", () => {
    const verdict = decider(
      situation({ pr: pr({ fusion: "UNKNOWN" }) }),
      valeurs,
    );
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "conflit").detail).toMatch(/pas encore calculé/);
  });
});

describe("decider : la branche à jour avec la base", () => {
  it("refuse une PR en retard sur la branche d'intégration (BEHIND) avec une raison claire", () => {
    const verdict = decider(
      situation({ pr: pr({ etatFusion: "BEHIND" }) }),
      valeurs,
    );
    expect(verdict.fusionnable).toBe(false);
    expect(point(verdict, "a-jour")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/en retard sur develop/),
    });
    expect(verdict.raisons).toEqual([
      expect.stringMatching(/^a-jour : .*en retard sur develop/),
    ]);
  });

  it("n'y voit pas un conflit : une PR en retard mais sans conflit ne refuse que ce point", () => {
    const verdict = decider(
      situation({ pr: pr({ etatFusion: "BEHIND", fusion: "MERGEABLE" }) }),
      valeurs,
    );
    expect(verdict.points.filter((p) => !p.ok).map((p) => p.id)).toEqual([
      "a-jour",
    ]);
  });

  it.each(["CLEAN", "UNSTABLE", "HAS_HOOKS", "BLOCKED", "DIRTY"])(
    "ne refuse pas l'état %s : les autres points le jugent",
    (etatFusion) => {
      const verdict = decider(situation({ pr: pr({ etatFusion }) }), valeurs);
      expect(point(verdict, "a-jour").ok).toBe(true);
    },
  );
});

describe("enRetardSeulement", () => {
  it("est vrai quand le retard est le seul manquement", () => {
    const verdict = decider(
      situation({ pr: pr({ etatFusion: "BEHIND" }) }),
      valeurs,
    );
    expect(enRetardSeulement(verdict)).toBe(true);
  });

  it("est faux quand la PR est fusionnable", () => {
    expect(enRetardSeulement(decider(situation(), valeurs))).toBe(false);
  });

  it("est faux quand un autre manquement s'ajoute au retard : contrôle absent sur la tête, conflit, titre", () => {
    for (const surcharge of [
      { controles: [] },
      { controles: [controle({ conclusion: "failure" })] },
      { pr: pr({ etatFusion: "BEHIND", fusion: "CONFLICTING" }) },
      { pr: pr({ etatFusion: "BEHIND", titre: "Sans numéro" }) },
    ]) {
      const verdict = decider(
        situation({ pr: pr({ etatFusion: "BEHIND" }), ...surcharge }),
        valeurs,
      );
      expect(enRetardSeulement(verdict)).toBe(false);
    }
  });

  it("est faux sans PR unique et pour un verdict illisible", () => {
    expect(
      enRetardSeulement(
        decider(situation({ prs: [], pr: null, controles: [] }), valeurs),
      ),
    ).toBe(false);
    expect(enRetardSeulement({ fusionnable: false, raisons: ["x"] })).toBe(
      false,
    );
  });
});

describe("decider : plusieurs manquements", () => {
  it("les rend tous, un par point, dans l'ordre", () => {
    const verdict = decider(
      situation({
        pr: pr({
          titre: "Sans numéro",
          base: "main",
          fusion: "CONFLICTING",
        }),
        controles: [],
      }),
      valeurs,
    );
    expect(verdict.fusionnable).toBe(false);
    expect(verdict.points.filter((p) => !p.ok).map((p) => p.id)).toEqual([
      "base",
      "titre",
      "ci",
      "conflit",
    ]);
    expect(verdict.raisons).toHaveLength(4);
  });
});

describe("formater", () => {
  it("dit fusionnable avec un point par ligne", () => {
    const texte = formater(decider(situation(), valeurs));
    expect(texte.split("\n")[0]).toMatch(/PR #230.*ticket #211.*fusionnable/);
    expect(texte.split("\n")[0]).not.toMatch(/non fusionnable/i);
    expect(texte.split("\n")).toHaveLength(10);
  });

  it("dit non fusionnable et marque les points refusés", () => {
    const texte = formater(
      decider(situation({ pr: pr({ base: "main" }) }), valeurs),
    );
    expect(texte.split("\n")[0]).toMatch(/non fusionnable/i);
    expect(texte).toMatch(/\[refus\].*main/);
    expect(texte).toMatch(/\[ok\]/);
  });

  it("nomme le ticket quand il n'y a pas de PR", () => {
    const texte = formater(
      decider(situation({ prs: [], pr: null, controles: [] }), valeurs),
    );
    expect(texte.split("\n")[0]).toMatch(/ticket #211.*non fusionnable/i);
  });
});
