import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appartientALaSelection,
  boucle,
  capturer,
  decider,
  decisionVerrou,
  evenementsCloture,
  evenementsLancement,
  formaterRapport,
  ligneJournal,
  prendreVerrou,
  rendreVerrou,
} from "./boucle.mjs";

describe("decisionVerrou", () => {
  const moi = { pid: 4242 };

  it("prend le verrou quand personne ne le tient", () => {
    expect(decisionVerrou({ verrou: null, pidVivant: false, moi })).toEqual({
      action: "prendre",
    });
  });

  it("refuse une deuxième boucle tant que la première tourne, en disant laquelle", () => {
    const verrou = {
      pid: 1111,
      depuis: "2026-10-08T20:00:00.000Z",
      mode: "spec #208",
    };
    const decision = decisionVerrou({ verrou, pidVivant: true, moi });
    expect(decision.action).toBe("refuser");
    expect(decision.raison).toContain("1111");
    expect(decision.raison).toContain("spec #208");
    expect(decision.raison).toContain("2026-10-08T20:00:00.000Z");
  });

  it("reprend le verrou d'une boucle morte sans s'être arrêtée proprement", () => {
    const verrou = {
      pid: 1111,
      depuis: "2026-10-08T20:00:00.000Z",
      mode: "spec #208",
    };
    const decision = decisionVerrou({ verrou, pidVivant: false, moi });
    expect(decision.action).toBe("reprendre");
    expect(decision.raison).toContain("1111");
  });
});

describe("ligneJournal", () => {
  it("écrit l'heure, l'événement, le ticket et le détail sur une seule ligne", () => {
    expect(
      ligneJournal(
        {
          evenement: "lancement",
          ticket: 217,
          detail: "session ticket-217 lancée",
        },
        new Date("2026-10-08T21:04:05.123Z"),
      ),
    ).toBe("2026-10-08T21:04:05.123Z lancement #217 session ticket-217 lancée");
  });

  it("omet le ticket d'un événement de la boucle elle-même", () => {
    expect(
      ligneJournal(
        { evenement: "arret", detail: "plus rien à faire" },
        new Date("2026-10-08T21:04:05.123Z"),
      ),
    ).toBe("2026-10-08T21:04:05.123Z arret plus rien à faire");
  });

  it("ne laisse pas un détail sur plusieurs lignes casser le journal", () => {
    const ligne = ligneJournal(
      { evenement: "anomalie", ticket: 5, detail: "a\nb\r\nc" },
      new Date("2026-10-08T21:04:05.123Z"),
    );
    expect(ligne).not.toMatch(/[\r\n]/);
    expect(ligne).toContain("a b c");
  });
});

// --- Le tour ----------------------------------------------------------------------------------

const ticket = (numero, surcharge = {}) => ({
  numero,
  titre: `Ticket ${numero}`,
  etat: "OPEN",
  etiquettes: [],
  ...surcharge,
});

const entree = (numero, surcharge = {}) => ({
  session: `s${numero}`,
  nom: `ticket-${numero}`,
  demarreA: "2026-10-08T20:00:00.000Z",
  reprises: 0,
  ...surcharge,
});

const session = (numero, state) => ({
  id: `s${numero}`,
  name: `ticket-${numero}`,
  state,
});

const prOuverte = (numero) => ({ numero: 300 + numero, etat: "OPEN" });
const verdictVert = { fusionnable: true, raisons: [] };

/** Un tour où le ticket 217 est en vol, sa session `working`, sans PR. Chaque test surcharge. */
const situation = (surcharge = {}) => ({
  checkoutPrincipalPropre: true,
  tickets: [ticket(217)],
  etat: { version: 1, tickets: { 217: entree(217) } },
  sessions: [session(217, "working")],
  prs: {},
  verdicts: {},
  frontiere: { aLancer: [], tickets: [] },
  ...surcharge,
});

const types = (resultat) => resultat.actions.map((a) => a.type);

describe("decider : arrêts", () => {
  it("s'arrête en disant pourquoi quand le checkout principal est sale, sans rien lancer ni clôturer", () => {
    const resultat = decider(
      situation({
        checkoutPrincipalPropre: false,
        sessions: [session(217, "done")],
        prs: { 217: prOuverte(217) },
        verdicts: { 217: verdictVert },
        frontiere: {
          aLancer: [218],
          tickets: [{ numero: 218, titre: "T", lancable: true, raisons: [] }],
        },
      }),
    );
    expect(resultat.arret.motif).toBe("checkout-sale");
    expect(resultat.arret.code).toBe(2);
    expect(resultat.arret.raison).toMatch(/checkout principal/);
    expect(resultat.actions).toEqual([]);
  });

  it("s'arrête de lui-même quand plus aucun ticket sélectionné n'est ouvert et que rien n'est en vol", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(217, { etat: "CLOSED" })],
        etat: { version: 1, tickets: {} },
        sessions: [],
      }),
    );
    expect(resultat.arret.motif).toBe("termine");
    expect(resultat.arret.code).toBe(0);
    expect(resultat.actions).toEqual([]);
  });

  it("ne s'arrête pas tant qu'un ticket sélectionné reste ouvert, même sans rien en vol", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(218)],
        etat: { version: 1, tickets: {} },
        sessions: [],
      }),
    );
    expect(resultat.arret).toBeNull();
  });

  it("ne s'arrête pas tant qu'un ticket rendu reste ouvert", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(217, { etiquettes: ["ready-for-human"] })],
        sessions: [session(217, "done")],
      }),
    );
    expect(resultat.arret).toBeNull();
  });

  it("ignore l'état d'un ticket qui n'est pas dans la sélection", () => {
    const resultat = decider(
      situation({
        tickets: [],
        etat: { version: 1, tickets: { 999: entree(999) } },
        sessions: [session(999, "done")],
        prs: { 999: prOuverte(999) },
        verdicts: { 999: verdictVert },
      }),
    );
    expect(resultat.arret.motif).toBe("termine");
    expect(resultat.actions).toEqual([]);
  });
});

describe("decider : tickets en vol", () => {
  it("clôture un ticket dont la session est terminée et la PR vérifiée", () => {
    const resultat = decider(
      situation({
        sessions: [session(217, "done")],
        prs: { 217: prOuverte(217) },
        verdicts: { 217: verdictVert },
      }),
    );
    expect(resultat.actions).toEqual([
      { type: "cloturer", ticket: 217, pr: 517 },
    ]);
  });

  it("n'agit pas sur une PR que la vérification refuse, et dit pourquoi", () => {
    const resultat = decider(
      situation({
        sessions: [session(217, "done")],
        prs: { 217: prOuverte(217) },
        verdicts: {
          217: {
            fusionnable: false,
            raisons: ["ci : contrôle Tests en cours sur le commit de tête"],
          },
        },
      }),
    );
    expect(resultat.actions).toEqual([
      {
        type: "attendre",
        ticket: 217,
        raison:
          "PR #517 non fusionnable : ci : contrôle Tests en cours sur le commit de tête",
      },
    ]);
    expect(resultat.arret).toBeNull();
  });

  it("ne touche pas une session qui travaille encore, même si sa PR est ouverte", () => {
    const resultat = decider(
      situation({
        prs: { 217: prOuverte(217) },
        verdicts: { 217: verdictVert },
      }),
    );
    expect(resultat.actions).toEqual([]);
    expect(resultat.rapport.enVol).toEqual([
      { ticket: 217, titre: "Ticket 217", session: "working" },
    ]);
  });

  it("rend le ticket à l'utilisateur quand la session est terminée sans PR ni label", () => {
    const resultat = decider(situation({ sessions: [session(217, "done")] }));
    expect(types(resultat)).toEqual(["rendreHumain"]);
    expect(resultat.actions[0].ticket).toBe(217);
    expect(resultat.actions[0].explication).toMatch(/sans PR ni label/);
    expect(resultat.actions[0].explication).toMatch(/done/);
  });

  it("traite une session arrêtée ou disparue comme une session terminée", () => {
    for (const sessions of [[session(217, "stopped")], []]) {
      const resultat = decider(situation({ sessions }));
      expect(types(resultat)).toEqual(["rendreHumain"]);
    }
    const disparue = decider(
      situation({
        sessions: [],
        prs: { 217: prOuverte(217) },
        verdicts: { 217: verdictVert },
      }),
    );
    expect(types(disparue)).toEqual(["cloturer"]);
  });

  it("laisse de côté un ticket qui attend une réponse, PR ou non", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(217, { etiquettes: ["needs-info"] })],
        sessions: [session(217, "done")],
        prs: { 217: prOuverte(217) },
        verdicts: { 217: verdictVert },
      }),
    );
    expect(resultat.actions).toEqual([]);
    expect(resultat.rapport.enAttenteDeReponse).toEqual([
      { ticket: 217, titre: "Ticket 217" },
    ]);
  });

  it("laisse de côté un ticket rendu, et le range parmi les rendus", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(217, { etiquettes: ["ready-for-human"] })],
        sessions: [session(217, "done")],
      }),
    );
    expect(resultat.actions).toEqual([]);
    expect(resultat.rapport.rendus).toEqual([
      { ticket: 217, titre: "Ticket 217" },
    ]);
    expect(resultat.rapport.enAttenteDeReponse).toEqual([]);
  });

  it("finit la clôture d'un ticket dont la PR est déjà fusionnée", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(217, { etat: "CLOSED" })],
        sessions: [session(217, "done")],
        prs: { 217: { numero: 517, etat: "MERGED" } },
      }),
    );
    expect(resultat.actions).toEqual([
      { type: "cloturer", ticket: 217, pr: 517 },
    ]);
    expect(resultat.arret).toBeNull();
  });

  it("signale un ticket fermé sans PR fusionnée, sans le compter en vol", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(217, { etat: "CLOSED" })],
        sessions: [session(217, "done")],
      }),
    );
    expect(types(resultat)).toEqual(["attendre"]);
    expect(resultat.actions[0].raison).toMatch(/fermé sans PR fusionnée/);
    expect(resultat.arret.motif).toBe("termine");
  });

  it("garde en vol une session en échec ou bloquée, sans agir (reprises et bornes : ticket suivant)", () => {
    for (const state of ["failed", "blocked"]) {
      const resultat = decider(situation({ sessions: [session(217, state)] }));
      expect(resultat.actions).toEqual([]);
      expect(resultat.rapport.enVol[0].session).toBe(state);
      expect(resultat.arret).toBeNull();
    }
  });
});

describe("decider : lancements", () => {
  const frontiere = {
    aLancer: [218, 219],
    tickets: [
      { numero: 218, titre: "Ticket 218", lancable: true, raisons: [] },
      { numero: 219, titre: "Ticket 219", lancable: true, raisons: [] },
    ],
  };

  it("lance ce que la frontière autorise, dans l'ordre, en nommant les tickets en parallèle", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(217), ticket(218), ticket(219)],
        frontiere,
      }),
    );
    expect(resultat.actions).toEqual([
      { type: "lancer", ticket: 218, enParallele: [217, 219] },
      { type: "lancer", ticket: 219, enParallele: [217, 218] },
    ]);
  });

  it("clôture avant de lancer, dans le même tour", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(217), ticket(218)],
        sessions: [session(217, "done")],
        prs: { 217: prOuverte(217) },
        verdicts: { 217: verdictVert },
        frontiere: { ...frontiere, aLancer: [218] },
      }),
    );
    expect(types(resultat)).toEqual(["cloturer", "lancer"]);
  });

  it("n'a rien à lancer sans lecture de la frontière", () => {
    const resultat = decider(situation({ frontiere: null }));
    expect(resultat.actions).toEqual([]);
  });

  it("rapporte les tickets que la frontière exclut, avec leurs raisons", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(217), ticket(218)],
        frontiere: {
          aLancer: [],
          tickets: [
            {
              numero: 218,
              titre: "Ticket 218",
              lancable: false,
              raisons: [
                "bloqué par #217 (ouvert)",
                "Supabase lourd déjà démarré : comunity",
              ],
            },
          ],
        },
      }),
    );
    expect(resultat.rapport.enAttente).toEqual([
      {
        ticket: 218,
        titre: "Ticket 218",
        raisons: [
          "bloqué par #217 (ouvert)",
          "Supabase lourd déjà démarré : comunity",
        ],
      },
    ]);
  });

  it("rapporte un ticket lançable que le budget fait attendre", () => {
    const resultat = decider(
      situation({
        tickets: [ticket(217), ticket(218)],
        frontiere: {
          aLancer: [],
          tickets: [
            { numero: 218, titre: "Ticket 218", lancable: true, raisons: [] },
          ],
        },
      }),
    );
    expect(resultat.rapport.enAttente).toEqual([
      {
        ticket: 218,
        titre: "Ticket 218",
        raisons: ["lançable, attend un créneau (mémoire ou service lourd)"],
      },
    ]);
  });

  it("ne rapporte pas comme exclu un ticket déjà pris par la boucle", () => {
    const resultat = decider(
      situation({
        frontiere: {
          aLancer: [],
          tickets: [
            {
              numero: 217,
              titre: "Ticket 217",
              lancable: false,
              raisons: ["déjà assigné à fakossa-c"],
            },
          ],
        },
      }),
    );
    expect(resultat.rapport.enAttente).toEqual([]);
  });
});

describe("formaterRapport", () => {
  it("liste les tickets en attente de réponse puis les tickets rendus", () => {
    const texte = formaterRapport({
      enVol: [],
      enAttente: [],
      enAttenteDeReponse: [{ ticket: 3, titre: "Trois" }],
      rendus: [{ ticket: 4, titre: "Quatre" }],
    });
    expect(texte).toContain(
      "En attente de votre réponse (needs-info) : #3 Trois",
    );
    expect(texte).toContain("Rendus (ready-for-human) : #4 Quatre");
  });

  it("dit « aucun » quand il n'y en a pas", () => {
    const texte = formaterRapport({
      enVol: [],
      enAttente: [],
      enAttenteDeReponse: [],
      rendus: [],
    });
    expect(texte).toContain("En attente de votre réponse (needs-info) : aucun");
    expect(texte).toContain("Rendus (ready-for-human) : aucun");
  });
});

// --- La boucle --------------------------------------------------------------------------------

/** Un monde inventé : trois tickets d'une spec, 3 bloqué par 1 et 2. Les ports le lisent comme la
 * boucle lit GitHub, et le modifient comme les scripts des tickets précédents. */
function creerMonde(surcharge = {}) {
  return {
    tickets: {
      1: { titre: "Un", etat: "OPEN", etiquettes: [] },
      2: { titre: "Deux", etat: "OPEN", etiquettes: [] },
      3: { titre: "Trois", etat: "OPEN", etiquettes: [] },
    },
    bloqueurs: { 3: [1, 2] },
    entrees: {},
    sessions: {},
    prs: {},
    verdicts: {},
    propre: true,
    arret: false,
    actionsExecutees: [],
    attentes: 0,
    ...surcharge,
  };
}

function portsDuMonde(monde, { apresAttente = () => {}, erreurs = 0 } = {}) {
  const lignes = [];
  let erreursRestantes = erreurs;
  return {
    lignes,
    journal: (ligne) => lignes.push(ligne),
    maintenant: () => new Date("2026-10-08T21:00:00.000Z"),
    afficher: () => {},
    arretDemande: () => monde.arret,
    attendre: async () => {
      monde.attentes += 1;
      apresAttente(monde);
    },
    lireSituation: async () => {
      if (erreursRestantes > 0) {
        erreursRestantes -= 1;
        throw new Error("gh a répondu 502");
      }
      const tickets = Object.entries(monde.tickets)
        .filter(([n, t]) => t.etat === "OPEN" || monde.entrees[n])
        .map(([n, t]) => ({ numero: Number(n), ...t }));
      const lancables = tickets.filter(
        (t) =>
          t.etat === "OPEN" &&
          !monde.entrees[t.numero] &&
          (monde.bloqueurs[t.numero] ?? []).every(
            (b) => monde.tickets[b].etat === "CLOSED",
          ),
      );
      return {
        checkoutPrincipalPropre: monde.propre,
        tickets,
        etat: { version: 1, tickets: monde.entrees },
        sessions: Object.entries(monde.sessions).map(([n, state]) => ({
          id: `s${n}`,
          name: `ticket-${n}`,
          state,
        })),
        prs: monde.prs,
        verdicts: monde.verdicts,
        frontiere: {
          aLancer: lancables.map((t) => t.numero),
          tickets: lancables.map((t) => ({
            numero: t.numero,
            titre: t.titre,
            lancable: true,
            raisons: [],
          })),
        },
      };
    },
    executer: async (action, { dryRun }) => {
      monde.actionsExecutees.push({ ...action, dryRun });
      if (dryRun) return { ok: true, evenements: [] };
      const n = action.ticket;
      switch (action.type) {
        case "lancer":
          monde.entrees[n] = { session: `s${n}`, nom: `ticket-${n}` };
          monde.sessions[n] = "working";
          return {
            ok: true,
            evenements: [
              { evenement: "lancement", ticket: n, detail: `ticket-${n}` },
            ],
          };
        case "cloturer":
          delete monde.entrees[n];
          delete monde.sessions[n];
          monde.tickets[n].etat = "CLOSED";
          return {
            ok: true,
            evenements: [
              { evenement: "fusion", ticket: n, detail: `PR ${action.pr}` },
              { evenement: "cloture", ticket: n, detail: "clôturé" },
            ],
          };
        case "rendreHumain":
          monde.tickets[n].etiquettes.push("ready-for-human");
          return {
            ok: true,
            evenements: [
              { evenement: "anomalie", ticket: n, detail: action.explication },
            ],
          };
        case "attendre":
          return {
            ok: true,
            evenements: [
              { evenement: "attente", ticket: n, detail: action.raison },
            ],
          };
        default:
          throw new Error(action.type);
      }
    },
  };
}

/** Les sessions qui travaillent finissent, chacune avec une PR vérifiée. */
const toutesTerminent = (monde) => {
  for (const [n, state] of Object.entries(monde.sessions)) {
    if (state !== "working") continue;
    monde.sessions[n] = "done";
    monde.prs[n] = { numero: 500 + Number(n), etat: "OPEN" };
    monde.verdicts[n] = { fusionnable: true, raisons: [] };
  }
};

const evenements = (lignes) =>
  lignes
    .map((l) => l.replace(/^\S+ /, "").split(" ").slice(0, 2).join(" "))
    .filter((e) => !e.startsWith("rapport") && !e.startsWith("demarrage"));

const lancerBoucle = (ports, options = {}) =>
  boucle({
    ports,
    intervalleMs: 1000,
    libelleMode: "spec #208",
    ...options,
  });

describe("boucle", () => {
  it("lance les deux tickets parallèles, puis le troisième quand ses bloqueurs sont clos, clôture chacun et s'arrête", async () => {
    const monde = creerMonde();
    const ports = portsDuMonde(monde, { apresAttente: toutesTerminent });
    const code = await lancerBoucle(ports);
    expect(code).toBe(0);
    expect(evenements(ports.lignes)).toEqual([
      "lancement #1",
      "lancement #2",
      "fusion #1",
      "cloture #1",
      "fusion #2",
      "cloture #2",
      "lancement #3",
      "fusion #3",
      "cloture #3",
      "arret termine",
    ]);
    // Le troisième ticket part dès la clôture des deux premiers, sans attendre l'intervalle.
    expect(monde.attentes).toBe(2);
  });

  it("refuse de continuer et s'arrête avec le message quand le checkout principal est sale", async () => {
    const monde = creerMonde({ propre: false });
    const ports = portsDuMonde(monde);
    const code = await lancerBoucle(ports);
    expect(code).toBe(2);
    expect(monde.actionsExecutees).toEqual([]);
    expect(ports.lignes.join("\n")).toMatch(
      /arret checkout-sale.*checkout principal/,
    );
  });

  it("s'arrête à Ctrl-C après l'action en cours, puis une relance ne relance pas le ticket déjà pris", async () => {
    const monde = creerMonde();
    const premiere = portsDuMonde(monde);
    const executer = premiere.executer;
    premiere.executer = async (...args) => {
      const resultat = await executer(...args);
      monde.arret = true;
      return resultat;
    };
    expect(await lancerBoucle(premiere)).toBe(0);
    expect(monde.actionsExecutees.map((a) => a.ticket)).toEqual([1]);
    expect(premiere.lignes.join("\n")).toMatch(/arret interrompu/);

    monde.arret = false;
    monde.actionsExecutees = [];
    const seconde = portsDuMonde(monde, {
      apresAttente: (m) => {
        m.arret = true;
      },
    });
    expect(await lancerBoucle(seconde)).toBe(0);
    expect(monde.actionsExecutees.map((a) => a.ticket)).toEqual([2]);
  });

  it("rend à l'utilisateur une session terminée sans PR ni label sans arrêter la salve", async () => {
    const monde = creerMonde({
      entrees: { 1: { session: "s1", nom: "ticket-1" } },
      sessions: { 1: "done" },
    });
    const ports = portsDuMonde(monde, {
      apresAttente: (m) => {
        m.arret = true;
      },
    });
    const code = await lancerBoucle(ports);
    expect(code).toBe(0);
    expect(evenements(ports.lignes)).toEqual([
      "anomalie #1",
      "lancement #2",
      "arret interrompu",
    ]);
    expect(monde.tickets[1].etiquettes).toContain("ready-for-human");
  });

  it("attend une PR non fusionnable sans remplir le journal, puis la clôture quand elle l'est", async () => {
    const monde = creerMonde({
      tickets: { 1: { titre: "Un", etat: "OPEN", etiquettes: [] } },
      bloqueurs: {},
      entrees: { 1: { session: "s1", nom: "ticket-1" } },
      sessions: { 1: "done" },
      prs: { 1: { numero: 501, etat: "OPEN" } },
      verdicts: {
        1: { fusionnable: false, raisons: ["ci : contrôle Tests en cours"] },
      },
    });
    const ports = portsDuMonde(monde, {
      apresAttente: (m) => {
        if (m.attentes === 3) {
          m.verdicts[1] = { fusionnable: true, raisons: [] };
        }
      },
    });
    const code = await lancerBoucle(ports);
    expect(code).toBe(0);
    expect(evenements(ports.lignes)).toEqual([
      "attente #1",
      "fusion #1",
      "cloture #1",
      "arret termine",
    ]);
    expect(monde.attentes).toBe(3);
  });

  it("n'écrit le rapport dans le journal que lorsqu'il change", async () => {
    const monde = creerMonde({
      tickets: { 1: { titre: "Un", etat: "OPEN", etiquettes: ["needs-info"] } },
      bloqueurs: {},
      entrees: { 1: { session: "s1", nom: "ticket-1" } },
      sessions: { 1: "done" },
    });
    const ports = portsDuMonde(monde, {
      apresAttente: (m) => {
        if (m.attentes === 3) m.arret = true;
      },
    });
    await lancerBoucle(ports);
    const rapports = ports.lignes.filter((l) => l.includes(" rapport "));
    expect(rapports).toHaveLength(1);
    expect(rapports[0]).toContain("needs-info");
  });

  it("réessaie au tour suivant quand une lecture échoue", async () => {
    const monde = creerMonde({
      tickets: { 1: { titre: "Un", etat: "CLOSED", etiquettes: [] } },
    });
    const ports = portsDuMonde(monde, { erreurs: 1 });
    const code = await lancerBoucle(ports);
    expect(code).toBe(0);
    expect(evenements(ports.lignes)).toEqual([
      "erreur lecture",
      "arret termine",
    ]);
    expect(ports.lignes[1]).toContain("gh a répondu 502");
  });

  it("en mode répétition, décide un seul tour sans rien modifier", async () => {
    const monde = creerMonde();
    const ports = portsDuMonde(monde);
    const code = await lancerBoucle(ports, { dryRun: true });
    expect(code).toBe(0);
    expect(
      monde.actionsExecutees.map((a) => [a.type, a.ticket, a.dryRun]),
    ).toEqual([
      ["lancer", 1, true],
      ["lancer", 2, true],
    ]);
    expect(monde.attentes).toBe(0);
    expect(monde.entrees).toEqual({});
  });
});

// --- Verrou sur le disque ---------------------------------------------------------------------

describe("verrou sur le disque", () => {
  const dossier = () => mkdtempSync(join(tmpdir(), "boucle-verrou-"));

  it("refuse une deuxième boucle tant que la première tient le verrou, et le rend à sa sortie", () => {
    const fichier = join(dossier(), "boucle.verrou.json");
    const premiere = prendreVerrou({
      fichier,
      pid: 1111,
      mode: "spec #208",
      maintenant: new Date("2026-10-08T20:00:00.000Z"),
      pidVivant: () => true,
    });
    expect(premiere.ok).toBe(true);

    const seconde = prendreVerrou({
      fichier,
      pid: 2222,
      mode: "spec #209",
      maintenant: new Date("2026-10-08T20:05:00.000Z"),
      pidVivant: (pid) => pid === 1111,
    });
    expect(seconde.ok).toBe(false);
    expect(seconde.raison).toMatch(/1111/);

    rendreVerrou({ fichier, pid: 1111 });
    expect(
      prendreVerrou({
        fichier,
        pid: 2222,
        mode: "spec #209",
        maintenant: new Date("2026-10-08T20:10:00.000Z"),
        pidVivant: () => false,
      }).ok,
    ).toBe(true);
  });

  it("reprend le verrou d'une boucle morte", () => {
    const fichier = join(dossier(), "boucle.verrou.json");
    prendreVerrou({
      fichier,
      pid: 1111,
      mode: "spec #208",
      maintenant: new Date("2026-10-08T20:00:00.000Z"),
      pidVivant: () => false,
    });
    const reprise = prendreVerrou({
      fichier,
      pid: 2222,
      mode: "spec #208",
      maintenant: new Date("2026-10-08T21:00:00.000Z"),
      pidVivant: () => false,
    });
    expect(reprise.ok).toBe(true);
    expect(reprise.raison).toMatch(/repris/);
    expect(JSON.parse(readFileSync(fichier, "utf8")).pid).toBe(2222);
  });

  it("ne rend pas le verrou d'une autre boucle", () => {
    const fichier = join(dossier(), "boucle.verrou.json");
    prendreVerrou({
      fichier,
      pid: 1111,
      mode: "spec #208",
      maintenant: new Date(),
      pidVivant: () => false,
    });
    rendreVerrou({ fichier, pid: 9999 });
    expect(JSON.parse(readFileSync(fichier, "utf8")).pid).toBe(1111);
  });
});

// --- Lecture de ce que rendent les scripts des tickets précédents ----------------------------

describe("capturer", () => {
  it("rend le code, la sortie et les erreurs d'une fonction, sans rien laisser à l'écran", async () => {
    const avant = console.log;
    const resultat = await capturer(async () => {
      console.log("une ligne", 3);
      console.error("une erreur");
      return 1;
    });
    expect(resultat).toEqual({
      code: 1,
      sortie: "une ligne 3",
      erreurs: "une erreur",
    });
    expect(console.log).toBe(avant);
  });

  it("rend une exception comme un échec, console rétablie", async () => {
    const avant = console.error;
    const resultat = await capturer(() => {
      throw new Error("gh est introuvable");
    });
    expect(resultat.code).toBe(1);
    expect(resultat.erreurs).toContain("gh est introuvable");
    expect(console.error).toBe(avant);
  });
});

describe("evenementsLancement", () => {
  it("note la session lancée avec son identifiant", () => {
    const resultat = evenementsLancement({
      ticket: 218,
      code: 0,
      sortie:
        "1/12 Assigner\n\nSession ticket-218 lancée (4ddefc4a) : claude attach 4ddefc4a",
      erreurs: "",
    });
    expect(resultat.ok).toBe(true);
    expect(resultat.pris).toBe(true);
    expect(resultat.evenements).toEqual([
      {
        evenement: "lancement",
        ticket: 218,
        detail: "session ticket-218 lancée (4ddefc4a)",
      },
    ]);
  });

  it("un refus ne prend pas le ticket : il sera réessayé au tour suivant", () => {
    const resultat = evenementsLancement({
      ticket: 218,
      code: 1,
      sortie: "",
      erreurs:
        "Refus : Le checkout principal a des modifications non commitées.",
    });
    expect(resultat.ok).toBe(false);
    expect(resultat.pris).toBe(false);
    expect(resultat.evenements[0].evenement).toBe("echec");
    expect(resultat.evenements[0].detail).toContain("Refus");
  });

  it("un échec après l'assignation laisse un ticket pris sans session", () => {
    const resultat = evenementsLancement({
      ticket: 218,
      code: 1,
      sortie: "",
      erreurs:
        "Échec à l'étape 5 (isoler) : Command failed\nÉtapes faites : assigner, statut, recuperer, creerWorktree.",
    });
    expect(resultat.pris).toBe(true);
    expect(resultat.ok).toBe(false);
  });

  it("un échec à l'assignation elle-même ne prend rien", () => {
    const resultat = evenementsLancement({
      ticket: 218,
      code: 1,
      sortie: "",
      erreurs: "Échec à l'étape 1 (assigner) : gh a répondu 502",
    });
    expect(resultat.pris).toBe(false);
  });
});

describe("evenementsCloture", () => {
  const etapes = [
    "1/9 Fusionner la PR #231 (gh pr merge --merge) sur le commit de tête c1b4a9a",
    "2/9 Mettre develop à jour dans le checkout principal (/depot)",
    "3/9 Passer le ticket #212 « Done » sur le tableau",
  ].join("\n");

  it("note la vérification, la fusion et la clôture d'une clôture réussie", () => {
    const resultat = evenementsCloture({
      ticket: 212,
      code: 0,
      sortie: `${etapes}\n\nTicket #212 clôturé.`,
      erreurs: "",
    });
    expect(resultat.ok).toBe(true);
    expect(resultat.evenements.map((e) => e.evenement)).toEqual([
      "verification",
      "fusion",
      "cloture",
    ]);
  });

  it("ne note pas de fusion quand la clôture échoue à l'étape de fusion", () => {
    const resultat = evenementsCloture({
      ticket: 212,
      code: 1,
      sortie: etapes.split("\n")[0],
      erreurs: "Échec à l'étape 1 (fusionner) : merge refused",
    });
    expect(resultat.ok).toBe(false);
    expect(resultat.evenements.map((e) => e.evenement)).toEqual([
      "verification",
      "echec",
    ]);
  });

  it("note la fusion faite quand la clôture échoue plus loin", () => {
    const resultat = evenementsCloture({
      ticket: 212,
      code: 1,
      sortie: etapes,
      erreurs: "Échec à l'étape 2 (majDevelop) : checkout sale",
    });
    expect(resultat.evenements.map((e) => e.evenement)).toEqual([
      "verification",
      "fusion",
      "echec",
    ]);
  });

  it("note le refus de la vérification interne sans verification ni fusion", () => {
    const resultat = evenementsCloture({
      ticket: 212,
      code: 1,
      sortie: "",
      erreurs: "La PR de #212 n'est pas fusionnable :\n  ci : rouge",
    });
    expect(resultat.evenements.map((e) => e.evenement)).toEqual(["echec"]);
    expect(resultat.evenements[0].detail).toContain("ci : rouge");
  });

  it("note une clôture déjà entièrement faite", () => {
    const resultat = evenementsCloture({
      ticket: 212,
      code: 0,
      sortie: "Le ticket #212 est déjà entièrement clôturé.",
      erreurs: "",
    });
    expect(resultat.ok).toBe(true);
    expect(resultat.evenements.map((e) => e.evenement)).toEqual(["cloture"]);
  });
});

describe("appartientALaSelection", () => {
  const issue = (numero, corps = "") => ({ numero, corps });

  it("retient les sous-issues de la spec, par la frontière ou par la ligne Parent", () => {
    const mode = { type: "spec", numero: 208 };
    expect(
      appartientALaSelection(
        mode,
        issue(216, "## Parent\n\nSpec #208"),
        new Set(),
      ),
    ).toBe(true);
    expect(appartientALaSelection(mode, issue(300), new Set([300]))).toBe(true);
    expect(
      appartientALaSelection(
        mode,
        issue(150, "## Parent\n\nSpec #168"),
        new Set(),
      ),
    ).toBe(false);
  });

  it("retient les tickets nommés, et tout en mode tous", () => {
    expect(
      appartientALaSelection(
        { type: "tickets", numeros: [4, 5] },
        issue(5),
        new Set(),
      ),
    ).toBe(true);
    expect(
      appartientALaSelection(
        { type: "tickets", numeros: [4, 5] },
        issue(6),
        new Set(),
      ),
    ).toBe(false);
    expect(appartientALaSelection({ type: "tous" }, issue(6), new Set())).toBe(
      true,
    );
  });
});
