import { describe, expect, it } from "vitest";
import {
  decider,
  decisionVerrou,
  formaterRapport,
  ligneJournal,
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
