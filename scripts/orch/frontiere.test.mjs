import { describe, expect, it } from "vitest";
import {
  bloqueursDepuisCorps,
  decider,
  estMigration,
  fichiersCommuns,
  fichiersDepuisCorps,
  formater,
  modeDepuisOptions,
  numeroDepuisNomTicket,
  recoupe,
  selectionner,
  supabasesDemarres,
} from "./frontiere.mjs";

const valeurs = {
  projet: "comunity",
  memoireParSessionMo: 2048,
  servicesLourdsEnParallele: 1,
};

/** Le corps d'un ticket au format de /to-tickets. `bloque` null : pas de section « Blocked by ». */
const corps = ({ parent = 208, fichiers = ["src/a.ts"], bloque = [] } = {}) =>
  [
    parent ? `## Parent\n\nSpec #${parent}\n` : "",
    "## What to build\n\nUn comportement.\n",
    fichiers
      ? `## Fichiers\n\n${fichiers.map((f) => `- \`${f}\``).join("\n")}\n`
      : "",
    bloque === null
      ? ""
      : `## Blocked by\n\n${
          bloque.length > 0
            ? bloque.map((n) => `- #${n} Un ticket`).join("\n")
            : "None - can start immediately"
        }\n`,
  ].join("\n");

const issue = (numero, surcharge = {}) => ({
  numero,
  titre: `Ticket ${numero}`,
  etat: "OPEN",
  assignes: [],
  etiquettes: ["ready-for-agent"],
  corps: corps(),
  ...surcharge,
});

/** Une situation où tout est libre : le ticket 212 est lançable. */
const situation = (surcharge = {}) => ({
  issues: [issue(212)],
  candidats: [212],
  natifs: {},
  prs: [],
  worktrees: [],
  enVol: [],
  memoireDisponibleMo: 8192,
  supabases: [],
  ...surcharge,
});

const ticket = (resultat, numero) =>
  resultat.tickets.find((t) => t.numero === numero);
const raisons = (resultat, numero) =>
  ticket(resultat, numero).raisons.join(" | ");

describe("selectionner", () => {
  const issues = [
    issue(210, { corps: corps({ parent: 208 }) }),
    issue(211, { corps: corps({ parent: 208 }) }),
    issue(212, { etat: "CLOSED", corps: corps({ parent: 208 }) }),
    issue(230, { corps: corps({ parent: 150 }) }),
    issue(231, { corps: corps({ parent: null }) }),
    issue(240, { assignes: ["fakossa-c"], corps: corps({ parent: 208 }) }),
    issue(250, {
      etiquettes: ["needs-triage"],
      corps: corps({ parent: 208 }),
    }),
    issue(208, {
      corps:
        "## Problem Statement\n\nUn problème.\n\n## Solution\n\nUne solution.",
    }),
  ];

  it("--spec : les sous-issues ouvertes de la spec, lues sur la ligne Parent, dans l'ordre des numéros", () => {
    expect(selectionner({ type: "spec", numero: 208 }, issues, {})).toEqual([
      210, 211, 240, 250,
    ]);
  });

  it("--spec : les sous-issues natives comptent aussi, sans doublon", () => {
    expect(
      selectionner({ type: "spec", numero: 208 }, issues, {
        sousIssues: [231, 210, 212],
      }),
    ).toEqual([210, 211, 231, 240, 250]);
  });

  it("--tickets : exactement ceux demandés, fermés compris (la raison est dite plus loin), sans doublon", () => {
    expect(
      selectionner(
        { type: "tickets", numeros: [231, 212, 210, 212] },
        issues,
        {},
      ),
    ).toEqual([210, 212, 231]);
  });

  it("--tous : les tickets ready-for-agent ouverts et non assignés, sans les specs", () => {
    expect(selectionner({ type: "tous" }, issues, {})).toEqual([
      210, 211, 230, 231,
    ]);
  });

  it("--tous : une issue que d'autres nomment comme parent est une spec, même sans le plan de to-spec", () => {
    const specSansPlan = issue(300, { corps: "Un grand chantier." });
    const enfant = issue(301, { corps: corps({ parent: 300 }) });
    expect(selectionner({ type: "tous" }, [specSansPlan, enfant], {})).toEqual([
      301,
    ]);
  });
});

describe("fichiersDepuisCorps", () => {
  it("lit les chemins entre accents graves de la section ## Fichiers, jusqu'à la section suivante", () => {
    const texte = [
      "## Fichiers",
      "",
      "- `scripts/orch/frontiere.mjs`, `scripts/orch/frontiere.test.mjs`",
      "- `scripts/orch/commun.mjs`",
      "",
      "## Blocked by",
      "",
      "- #210 `pas/un/fichier.ts`",
    ].join("\n");
    expect(fichiersDepuisCorps(texte)).toEqual([
      "scripts/orch/frontiere.mjs",
      "scripts/orch/frontiere.test.mjs",
      "scripts/orch/commun.mjs",
    ]);
  });

  it("rend null quand la section manque, et une liste vide quand elle ne cite aucun chemin", () => {
    expect(fichiersDepuisCorps("## What to build\n\nRien.")).toBeNull();
    expect(fichiersDepuisCorps("## Fichiers\n\nÀ définir.\n")).toEqual([]);
  });
});

describe("bloqueursDepuisCorps", () => {
  it("lit les numéros de la section ## Blocked by", () => {
    expect(bloqueursDepuisCorps(corps({ bloque: [210, 211] }))).toEqual([
      210, 211,
    ]);
  });

  it("« None » ou section absente : aucun bloqueur", () => {
    expect(bloqueursDepuisCorps(corps({ bloque: [] }))).toEqual([]);
    expect(bloqueursDepuisCorps(corps({ bloque: null }))).toEqual([]);
  });

  it("lit aussi la ligne « Blocked by: #12, #13 » et s'arrête à la section suivante", () => {
    expect(
      bloqueursDepuisCorps(
        "Blocked by: #12, #13\n\n## Fichiers\n\n- `a.ts` voir #99",
      ),
    ).toEqual([12, 13]);
  });
});

describe("recoupe et fichiersCommuns", () => {
  it("même chemin, ou l'un est le dossier de l'autre", () => {
    expect(recoupe("src/a.ts", "src/a.ts")).toBe(true);
    expect(recoupe("src/components/", "src/components/Bouton.tsx")).toBe(true);
    expect(recoupe("src/components", "src/components/Bouton.tsx")).toBe(true);
    expect(recoupe("src/components/Bouton.tsx", "src/components/")).toBe(true);
  });

  it("chemins distincts, y compris quand l'un commence par le nom de l'autre", () => {
    expect(recoupe("src/a.ts", "src/b.ts")).toBe(false);
    expect(recoupe("src/app", "src/app-router/page.tsx")).toBe(false);
  });

  it("un motif avec * recoupe tout chemin qui commence comme lui", () => {
    expect(
      recoupe(
        "supabase/migrations/*_annonces.sql",
        "supabase/migrations/20261001_sondages.sql",
      ),
    ).toBe(true);
    expect(recoupe("tests/*.ts", "src/a.ts")).toBe(false);
  });

  it("fichiersCommuns liste les chemins de la première liste qui en recoupent un de la seconde", () => {
    expect(
      fichiersCommuns(["a.ts", "src/", "z.ts"], ["src/b.ts", "a.ts"]),
    ).toEqual(["a.ts", "src/"]);
  });

  it("estMigration : un fichier sous supabase/migrations", () => {
    expect(estMigration(["src/a.ts", "supabase/migrations/2026_x.sql"])).toBe(
      true,
    );
    expect(estMigration(["supabase/migrations/"])).toBe(true);
    expect(estMigration(["supabase/seed.sql"])).toBe(false);
  });
});

describe("supabasesDemarres", () => {
  it("compte une fois chaque projet Supabase du dépôt, principal et worktrees, d'après ses conteneurs", () => {
    const noms = [
      "supabase_db_comunity",
      "supabase_auth_comunity",
      "supabase_db_comunity-ticket-214",
      "supabase_rest_comunity-ticket-214",
      "supabase_db_autre-projet",
      "n8n-n8n-1",
    ];
    expect(supabasesDemarres(noms, "comunity")).toEqual([
      "comunity",
      "comunity-ticket-214",
    ]);
  });

  it("aucun conteneur : aucun service", () => {
    expect(supabasesDemarres([], "comunity")).toEqual([]);
  });
});

describe("decider : bloqueurs", () => {
  it("bloqueur ouvert (ligne texte) : exclu, avec le bloqueur nommé", () => {
    const r = decider(
      situation({
        issues: [
          issue(212, { corps: corps({ bloque: [210] }) }),
          issue(210, { titre: "Le bloqueur" }),
        ],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("#210");
    expect(raisons(r, 212)).toMatch(/bloqu/i);
  });

  it("le même bloqueur fermé : lançable à l'appel suivant, sans autre action", () => {
    const r = decider(
      situation({
        issues: [
          issue(212, { corps: corps({ bloque: [210] }) }),
          issue(210, { etat: "CLOSED" }),
        ],
      }),
      valeurs,
    );
    expect(ticket(r, 212)).toMatchObject({ lancable: true, raisons: [] });
  });

  it("dépendance native ouverte : exclu, même sans ligne texte", () => {
    const r = decider(
      situation({ natifs: { 212: [{ numero: 210, etat: "OPEN" }] } }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("#210");
  });

  it("dépendance native fermée : lançable", () => {
    const r = decider(
      situation({ natifs: { 212: [{ numero: 210, etat: "CLOSED" }] } }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(true);
  });

  it("quand des dépendances natives existent, la ligne texte n'est pas lue", () => {
    const r = decider(
      situation({
        issues: [issue(212, { corps: corps({ bloque: [211] }) }), issue(211)],
        natifs: { 212: [{ numero: 210, etat: "CLOSED" }] },
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(true);
  });

  it("un bloqueur dont l'état n'a pas été lu compte comme ouvert", () => {
    const r = decider(
      situation({
        issues: [issue(212, { corps: corps({ bloque: [199] }) })],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("#199");
  });

  it("plusieurs bloqueurs : tous les ouverts sont nommés, le fermé non", () => {
    const r = decider(
      situation({
        issues: [
          issue(212, { corps: corps({ bloque: [209, 210, 211] }) }),
          issue(209, { etat: "CLOSED" }),
          issue(210),
          issue(211),
        ],
      }),
      valeurs,
    );
    const dit = raisons(r, 212);
    expect(dit).toContain("#210");
    expect(dit).toContain("#211");
    expect(dit).not.toContain("#209");
  });
});

describe("decider : ticket lui-même", () => {
  it("ticket fermé : exclu", () => {
    const r = decider(
      situation({ issues: [issue(212, { etat: "CLOSED" })] }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toMatch(/ferm/);
  });

  it("déjà assigné : exclu, avec le compte nommé", () => {
    const r = decider(
      situation({ issues: [issue(212, { assignes: ["fakossa-c"] })] }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("fakossa-c");
  });

  it("section ## Fichiers absente : exclu, le recouvrement n'est pas vérifiable", () => {
    const r = decider(
      situation({ issues: [issue(212, { corps: corps({ fichiers: null }) })] }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("## Fichiers");
  });

  it("son propre worktree, sa propre session ou sa propre PR : exclu, c'est déjà pris", () => {
    const r = decider(
      situation({
        worktrees: [{ ticket: 212, nom: "ticket-212" }],
        enVol: [{ ticket: 212, origine: "état" }],
        prs: [
          {
            numero: 240,
            titre: "Ticket 212",
            tickets: [212],
            fichiers: ["src/a.ts"],
          },
        ],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    const dit = raisons(r, 212);
    expect(dit).toContain("ticket-212");
    expect(dit).toContain("PR #240");
    expect(dit).toMatch(/en vol/);
  });
});

describe("decider : recouvrement de fichiers", () => {
  const avecFichiers = (liste) => [
    issue(212, { corps: corps({ fichiers: liste }) }),
  ];

  it("une PR ouverte qui touche un de ses fichiers : exclu, avec la PR et le fichier nommés", () => {
    const r = decider(
      situation({
        issues: avecFichiers(["src/a.ts", "src/b.ts"]),
        prs: [
          {
            numero: 231,
            titre: "Autre chose",
            tickets: [],
            fichiers: ["src/b.ts", "docs/x.md"],
          },
        ],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("PR #231");
    expect(raisons(r, 212)).toContain("src/b.ts");
  });

  it("une PR sur d'autres fichiers ne gêne pas", () => {
    const r = decider(
      situation({
        prs: [
          { numero: 231, titre: "x", tickets: [], fichiers: ["docs/x.md"] },
        ],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(true);
  });

  it("un worktree présent dont le ticket annonce un de ses fichiers : exclu, avec le worktree nommé", () => {
    const r = decider(
      situation({
        issues: [
          ...avecFichiers(["src/a.ts"]),
          issue(214, { corps: corps({ fichiers: ["src/a.ts"] }) }),
        ],
        worktrees: [{ ticket: 214, nom: "ticket-214" }],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("worktree ticket-214");
    expect(raisons(r, 212)).toContain("src/a.ts");
  });

  it("un ticket en vol (fichier d'état ou session) dont la section recouvre la sienne : exclu, avec le ticket nommé", () => {
    const r = decider(
      situation({
        issues: [
          ...avecFichiers(["src/"]),
          issue(215, { corps: corps({ fichiers: ["src/a.ts"] }) }),
        ],
        enVol: [{ ticket: 215, origine: "session" }],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("ticket #215 en vol");
  });

  it("un ticket en vol clos sur le tracker ne compte plus", () => {
    const r = decider(
      situation({
        issues: [
          issue(212),
          issue(215, {
            etat: "CLOSED",
            corps: corps({ fichiers: ["src/a.ts"] }),
          }),
        ],
        enVol: [{ ticket: 215, origine: "état" }],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(true);
  });

  it("le même ticket en vol, avec son worktree, n'est nommé qu'une fois, worktree compris", () => {
    const r = decider(
      situation({
        issues: [
          issue(212),
          issue(215, { corps: corps({ fichiers: ["src/a.ts"] }) }),
        ],
        enVol: [{ ticket: 215, origine: "état" }],
        worktrees: [{ ticket: 215, nom: "ticket-215" }],
      }),
      valeurs,
    );
    expect(ticket(r, 212).raisons).toHaveLength(1);
    expect(raisons(r, 212)).toContain("ticket #215 en vol");
    expect(raisons(r, 212)).toContain("worktree ticket-215");
  });

  it("deux candidats qui se recouvrent : le plus petit numéro part, l'autre attend", () => {
    const r = decider(
      situation({
        issues: [
          issue(212, { corps: corps({ fichiers: ["src/a.ts"] }) }),
          issue(213, { corps: corps({ fichiers: ["src/a.ts"] }) }),
          issue(214, { corps: corps({ fichiers: ["src/c.ts"] }) }),
        ],
        candidats: [214, 213, 212],
      }),
      valeurs,
    );
    expect(r.tickets.map((t) => t.numero)).toEqual([212, 213, 214]);
    expect(ticket(r, 212).lancable).toBe(true);
    expect(ticket(r, 213).lancable).toBe(false);
    expect(raisons(r, 213)).toContain("#212");
    expect(ticket(r, 214).lancable).toBe(true);
  });
});

describe("decider : migrations", () => {
  const migration = (n) =>
    issue(n, {
      corps: corps({ fichiers: [`supabase/migrations/2026_${n}.sql`] }),
    });

  it("un ticket à migration pendant qu'un autre ticket à migration est en vol : exclu, le ticket en vol nommé", () => {
    const r = decider(
      situation({
        issues: [migration(212), migration(216)],
        enVol: [{ ticket: 216, origine: "état" }],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("#216");
    expect(raisons(r, 212)).toMatch(/migration/);
  });

  it("une PR ouverte qui contient une migration compte aussi", () => {
    const r = decider(
      situation({
        issues: [migration(212)],
        prs: [
          {
            numero: 240,
            titre: "Une migration",
            tickets: [],
            fichiers: ["supabase/migrations/2026_autre.sql"],
          },
        ],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("PR #240");
  });

  it("un worktree dont le ticket a une migration compte aussi", () => {
    const r = decider(
      situation({
        issues: [migration(212), migration(217)],
        worktrees: [{ ticket: 217, nom: "ticket-217" }],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(false);
    expect(raisons(r, 212)).toContain("ticket-217");
  });

  it("un ticket sans migration passe pendant qu'une migration est en vol", () => {
    const r = decider(
      situation({
        issues: [issue(212), migration(216)],
        enVol: [{ ticket: 216, origine: "état" }],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(true);
  });

  it("deux candidats à migration : le plus petit numéro part, l'autre attend", () => {
    const r = decider(
      situation({
        issues: [migration(212), migration(213)],
        candidats: [212, 213],
      }),
      valeurs,
    );
    expect(ticket(r, 212).lancable).toBe(true);
    expect(ticket(r, 213).lancable).toBe(false);
    expect(raisons(r, 213)).toContain("#212");
    expect(raisons(r, 213)).toMatch(/migration/);
  });
});

describe("decider : budget", () => {
  const trois = {
    issues: [
      issue(212, { corps: corps({ fichiers: ["a.ts"] }) }),
      issue(213, { corps: corps({ fichiers: ["b.ts"] }) }),
      issue(214, { corps: corps({ fichiers: ["c.ts"] }) }),
    ],
    candidats: [212, 213, 214],
  };

  it("mémoire libre divisée par la mémoire d'une session : trois tickets lançables, deux lancements possibles", () => {
    const r = decider(
      situation({ ...trois, memoireDisponibleMo: 4500, supabases: [] }),
      { ...valeurs, servicesLourdsEnParallele: 3 },
    );
    expect(r.budget).toMatchObject({ memoire: 2, service: 3 });
    expect(r.lancementsPossibles).toBe(2);
    expect(r.aLancer).toEqual([212, 213]);
    expect(r.tickets.every((t) => t.lancable)).toBe(true);
  });

  it("mémoire pour moins d'une session : tout est exclu, avec les chiffres", () => {
    const r = decider(
      situation({ ...trois, memoireDisponibleMo: 1500 }),
      valeurs,
    );
    expect(r.lancementsPossibles).toBe(0);
    expect(r.aLancer).toEqual([]);
    expect(r.tickets.every((t) => !t.lancable)).toBe(true);
    expect(raisons(r, 212)).toMatch(/mémoire/);
    expect(raisons(r, 212)).toContain("1500");
    expect(raisons(r, 212)).toContain("2048");
  });

  it("un Supabase lourd déjà démarré avec un seul service autorisé : tout est exclu, le projet Supabase nommé", () => {
    const r = decider(
      situation({ ...trois, supabases: ["comunity-ticket-216"] }),
      valeurs,
    );
    expect(r.lancementsPossibles).toBe(0);
    expect(r.tickets.every((t) => !t.lancable)).toBe(true);
    expect(raisons(r, 213)).toContain("comunity-ticket-216");
    expect(raisons(r, 213)).toMatch(/Supabase/);
  });

  it("deux services autorisés et un seul démarré : un lancement possible de plus", () => {
    const r = decider(situation({ ...trois, supabases: ["comunity"] }), {
      ...valeurs,
      servicesLourdsEnParallele: 2,
    });
    expect(r.budget.service).toBe(1);
    expect(r.lancementsPossibles).toBe(1);
    expect(r.aLancer).toEqual([212]);
  });

  it("conteneurs illisibles (null) : on ne lance rien, la raison le dit", () => {
    const r = decider(situation({ supabases: null }), valeurs);
    expect(r.lancementsPossibles).toBe(0);
    expect(raisons(r, 212)).toMatch(/Docker/);
  });

  it("une exclusion de fond (bloqueur) reste la raison d'un ticket, et le budget ne la remplace pas", () => {
    const r = decider(
      situation({
        issues: [issue(212, { corps: corps({ bloque: [210] }) }), issue(210)],
        supabases: ["comunity"],
      }),
      valeurs,
    );
    expect(raisons(r, 212)).toContain("#210");
    expect(raisons(r, 212)).toMatch(/Supabase/);
  });

  it("aucun ticket lançable : aucun lancement possible, même avec du budget", () => {
    const r = decider(
      situation({ issues: [issue(212, { etat: "CLOSED" })] }),
      valeurs,
    );
    expect(r.lancementsPossibles).toBe(0);
    expect(r.aLancer).toEqual([]);
  });
});

describe("formater", () => {
  const calculer = () =>
    decider(
      situation({
        issues: [
          issue(213, { corps: corps({ bloque: [212] }) }),
          issue(212),
          issue(214, { assignes: ["fakossa-c"] }),
        ],
        candidats: [214, 213, 212],
        supabases: [],
      }),
      valeurs,
    );

  it("une ligne par ticket dans l'ordre des numéros, lançable ou la raison", () => {
    const texte = formater(calculer(), "spec #208");
    const lignes = texte.split("\n");
    expect(lignes[0]).toContain("spec #208");
    expect(lignes[0]).toMatch(/1 lancement/);
    const i212 = lignes.findIndex((l) => l.includes("#212"));
    const i213 = lignes.findIndex((l) => l.includes("#213"));
    const i214 = lignes.findIndex((l) => l.includes("#214"));
    expect(i212).toBeLessThan(i213);
    expect(i213).toBeLessThan(i214);
    expect(lignes[i212]).toContain("lançable");
    expect(texte).toContain("fakossa-c");
  });

  it("le résultat se sérialise tel quel pour --json", () => {
    const json = JSON.parse(JSON.stringify(calculer()));
    expect(json.lancementsPossibles).toBe(1);
    expect(json.aLancer).toEqual([212]);
    expect(json.tickets.map((t) => t.numero)).toEqual([212, 213, 214]);
  });
});

describe("modeDepuisOptions", () => {
  it("un seul mode à la fois", () => {
    expect(modeDepuisOptions({ spec: "208" })).toEqual({
      type: "spec",
      numero: 208,
    });
    expect(modeDepuisOptions({ spec: "#208" })).toEqual({
      type: "spec",
      numero: 208,
    });
    expect(modeDepuisOptions({ tickets: "213, #214,215" })).toEqual({
      type: "tickets",
      numeros: [213, 214, 215],
    });
    expect(modeDepuisOptions({ tous: true })).toEqual({ type: "tous" });
  });

  it("aucun mode, plusieurs modes ou une valeur illisible : refusé", () => {
    expect(modeDepuisOptions({ tous: false })).toBeNull();
    expect(modeDepuisOptions({ spec: "208", tous: true })).toBeNull();
    expect(modeDepuisOptions({ spec: "abc" })).toBeNull();
    expect(modeDepuisOptions({ tickets: "rien" })).toBeNull();
  });
});

describe("numeroDepuisNomTicket", () => {
  it("le numéro d'une branche, d'un worktree ou d'une session ticket-<n>", () => {
    expect(numeroDepuisNomTicket("ticket-213")).toBe(213);
  });

  it("tout autre nom : null", () => {
    expect(numeroDepuisNomTicket("develop")).toBeNull();
    expect(numeroDepuisNomTicket("ticket-213-bis")).toBeNull();
    expect(numeroDepuisNomTicket("orch-comunity")).toBeNull();
  });
});
