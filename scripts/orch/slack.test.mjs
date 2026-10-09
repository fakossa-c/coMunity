import { describe, expect, it } from "vitest";
import {
  LONGUEUR_CITATION_MAX,
  envoyerSlack,
  notificationDEvenement,
  notificationsDuRapport,
  notifieurSlack,
  texteSlack,
} from "./slack.mjs";

const titres = { 12: "Douze", 13: "Treize" };
const DEPOT = "fakossa-c/coMunity";

describe("notificationDEvenement", () => {
  it("annonce un lancement avec le titre du ticket", () => {
    expect(
      notificationDEvenement(
        {
          evenement: "lancement",
          ticket: 12,
          detail: "session ticket-12 lancée (abc)",
        },
        { titres },
      ),
    ).toEqual({
      type: "lancement",
      ticket: 12,
      titre: "Douze",
      detail: "session ticket-12 lancée (abc)",
    });
  });

  it("annonce une clôture avec la PR de l'action, jamais une clôture déjà faite", () => {
    expect(
      notificationDEvenement(
        { evenement: "cloture", ticket: 12, detail: "ticket clôturé" },
        { titres, action: { type: "cloturer", ticket: 12, pr: 512 } },
      ),
    ).toEqual({ type: "cloture", ticket: 12, titre: "Douze", pr: 512 });
    expect(
      notificationDEvenement(
        { evenement: "cloture", ticket: 12, detail: "déjà clôturé" },
        { titres },
      ),
    ).toBeNull();
  });

  it("lit une anomalie comme un ticket rendu par la boucle ; une anomalie levée ne se dit pas", () => {
    expect(
      notificationDEvenement(
        {
          evenement: "anomalie",
          ticket: 12,
          detail: "La session ticket-12 s'est terminée sans PR ni label.",
        },
        { titres },
      ),
    ).toEqual({
      type: "rendu",
      ticket: 12,
      titre: "Douze",
      explication: "La session ticket-12 s'est terminée sans PR ni label.",
    });
    expect(
      notificationDEvenement(
        {
          evenement: "anomalie",
          ticket: 12,
          detail: "levée : label needs-info posé entre-temps",
        },
        { titres },
      ),
    ).toBeNull();
  });

  it("annonce un échec, une erreur et un arrêt avec leur détail", () => {
    expect(
      notificationDEvenement(
        {
          evenement: "echec",
          ticket: 13,
          detail: "lancement : npm ci a échoué",
        },
        { titres },
      ),
    ).toEqual({
      type: "echec",
      ticket: 13,
      titre: "Treize",
      detail: "lancement : npm ci a échoué",
    });
    expect(
      notificationDEvenement({
        evenement: "erreur",
        detail: "lecture : gh a répondu 502",
      }),
    ).toEqual({ type: "erreur", detail: "lecture : gh a répondu 502" });
    expect(
      notificationDEvenement({
        evenement: "arret",
        detail: "termine : plus rien à faire",
      }),
    ).toEqual({ type: "arret", detail: "termine : plus rien à faire" });
  });

  it("se tait sur le rapport, les attentes, les répétitions, les vérifications, les mises à jour de branche et les reprises", () => {
    for (const evenement of [
      "rapport",
      "attente",
      "repetition",
      "verification",
      "maj-branche",
      "fusion",
      "demarrage",
      "slack",
      "reprise",
      "relance",
      "arret-session",
    ]) {
      expect(
        notificationDEvenement(
          { evenement, ticket: 12, detail: "x" },
          { titres },
        ),
      ).toBeNull();
    }
  });
});

describe("notificationsDuRapport", () => {
  const rapport = (surcharge = {}) => ({
    enVol: [],
    enAttente: [],
    enAttenteDeReponse: [],
    rendus: [],
    gels: [],
    ...surcharge,
  });

  it("au premier tour, récapitule ce qui attend déjà sans l'annoncer ticket par ticket", () => {
    expect(
      notificationsDuRapport({
        rapport: rapport({
          enAttenteDeReponse: [{ ticket: 12, titre: "Douze" }],
          rendus: [{ ticket: 13, titre: "Treize" }],
        }),
        precedent: null,
        libelleMode: "spec #208",
      }),
    ).toEqual([
      {
        type: "demarrage",
        mode: "spec #208",
        enAttenteDeReponse: [{ ticket: 12, titre: "Douze" }],
        rendus: [{ ticket: 13, titre: "Treize" }],
      },
    ]);
  });

  it("annonce une question quand un ticket apparaît en attente de réponse, avec sa question et le gel de sa spec", () => {
    const question = {
      url: "https://github.com/fakossa-c/coMunity/issues/12#issuecomment-1",
      portee: "spec",
      corps: "Quelle table ?\n\nPortée : spec",
    };
    expect(
      notificationsDuRapport({
        rapport: rapport({
          enAttenteDeReponse: [{ ticket: 12, titre: "Douze" }],
          gels: [{ spec: 208, ticket: 12 }],
        }),
        precedent: rapport(),
        questionDe: (ticket) => (ticket === 12 ? question : null),
      }),
    ).toEqual([
      {
        type: "question",
        ticket: 12,
        titre: "Douze",
        question,
        gele: { spec: 208, ticket: 12 },
      },
    ]);
  });

  it("n'annonce pas deux fois la même question ni le même ticket rendu", () => {
    const courant = rapport({
      enAttenteDeReponse: [{ ticket: 12, titre: "Douze" }],
      rendus: [{ ticket: 13, titre: "Treize" }],
    });
    expect(
      notificationsDuRapport({ rapport: courant, precedent: courant }),
    ).toEqual([]);
  });

  it("annonce un ticket rendu avec son explication, sauf s'il a déjà été annoncé par la boucle", () => {
    expect(
      notificationsDuRapport({
        rapport: rapport({
          rendus: [
            { ticket: 13, titre: "Treize" },
            { ticket: 12, titre: "Douze" },
          ],
        }),
        precedent: rapport(),
        dejaAnnonces: new Set([12]),
        explicationDe: () => "Tests rouges sur la base.",
      }),
    ).toEqual([
      {
        type: "rendu",
        ticket: 13,
        titre: "Treize",
        explication: "Tests rouges sur la base.",
      },
    ]);
  });
});

describe("texteSlack", () => {
  it("cite la question, dit sa portée et le gel, et pointe le commentaire", () => {
    const texte = texteSlack(
      {
        type: "question",
        ticket: 12,
        titre: "Douze & <treize>",
        question: {
          url: "https://github.com/fakossa-c/coMunity/issues/12#issuecomment-1",
          portee: "spec",
          corps: "Quelle table ?\nLa <nouvelle> ou l'ancienne & co ?",
        },
        gele: { spec: 208, ticket: 12 },
      },
      { depot: DEPOT },
    );
    expect(texte).toContain(
      "<https://github.com/fakossa-c/coMunity/issues/12#issuecomment-1|#12 Douze &amp; &lt;treize&gt;>",
    );
    expect(texte).toContain("portée spec");
    expect(texte).toMatch(/spec #208.*gel/);
    expect(texte).toContain(
      "> Quelle table ?\n> La &lt;nouvelle&gt; ou l'ancienne &amp; co ?",
    );
  });

  it("dit qu'une question est introuvable plutôt que de se taire", () => {
    const texte = texteSlack(
      {
        type: "question",
        ticket: 12,
        titre: "Douze",
        question: null,
        gele: null,
      },
      { depot: DEPOT },
    );
    expect(texte).toContain(
      "<https://github.com/fakossa-c/coMunity/issues/12|#12 Douze>",
    );
    expect(texte).toMatch(/introuvable/);
  });

  it("tronque une citation trop longue et retire la signature de la boucle", () => {
    const explication = `**Boucle de livraison** : ${"a".repeat(LONGUEUR_CITATION_MAX + 50)}`;
    const texte = texteSlack(
      { type: "rendu", ticket: 13, titre: "Treize", explication },
      { depot: DEPOT },
    );
    expect(texte).not.toContain("Boucle de livraison");
    expect(texte).toContain("…");
    expect(texte.length).toBeLessThan(LONGUEUR_CITATION_MAX + 200);
  });

  it("récapitule au démarrage ce qui attend, ou dit que rien n'attend", () => {
    const avec = texteSlack(
      {
        type: "demarrage",
        mode: "spec #208",
        enAttenteDeReponse: [{ ticket: 12, titre: "Douze" }],
        rendus: [{ ticket: 13, titre: "Treize" }],
      },
      { depot: DEPOT },
    );
    expect(avec).toContain("spec #208");
    expect(avec).toMatch(/réponse.*#12 Douze/);
    expect(avec).toMatch(/[Rr]endus.*#13 Treize/);
    const sans = texteSlack(
      {
        type: "demarrage",
        mode: "tous les tickets ready-for-agent",
        enAttenteDeReponse: [],
        rendus: [],
      },
      { depot: DEPOT },
    );
    expect(sans).toMatch(/[Rr]ien n'attend/);
  });

  it("donne le lien de la PR d'une clôture et le détail d'un lancement, d'un échec, d'une erreur et d'un arrêt", () => {
    expect(
      texteSlack(
        { type: "cloture", ticket: 12, titre: "Douze", pr: 512 },
        { depot: DEPOT },
      ),
    ).toContain("<https://github.com/fakossa-c/coMunity/pull/512|PR #512>");
    expect(
      texteSlack(
        {
          type: "lancement",
          ticket: 12,
          titre: "Douze",
          detail: "session ticket-12 lancée (abc)",
        },
        { depot: DEPOT },
      ),
    ).toContain("session ticket-12 lancée (abc)");
    expect(
      texteSlack(
        {
          type: "echec",
          ticket: 12,
          titre: "Douze",
          detail: "lancement : npm ci",
        },
        { depot: DEPOT },
      ),
    ).toContain("lancement : npm ci");
    expect(
      texteSlack(
        { type: "erreur", detail: "lecture : gh 502" },
        { depot: DEPOT },
      ),
    ).toContain("lecture : gh 502");
    expect(
      texteSlack(
        { type: "arret", detail: "termine : plus rien à faire" },
        { depot: DEPOT },
      ),
    ).toContain("termine : plus rien à faire");
  });

  it("nomme le projet dans le message d'essai", () => {
    expect(
      texteSlack({ type: "essai" }, { depot: DEPOT, projet: "comunity" }),
    ).toContain("comunity");
  });
});

describe("envoyerSlack", () => {
  const URL_WEBHOOK = "https://hooks.slack.com/services/T0/B0/secret";

  it("poste le texte en JSON et dit que l'envoi a réussi", async () => {
    const appels = [];
    const fetchFn = async (url, options) => {
      appels.push({ url, options });
      return { ok: true, status: 200, text: async () => "ok" };
    };
    expect(
      await envoyerSlack({ url: URL_WEBHOOK, texte: "Bonjour", fetchFn }),
    ).toEqual({ ok: true });
    expect(appels).toHaveLength(1);
    expect(appels[0].url).toBe(URL_WEBHOOK);
    expect(appels[0].options.method).toBe("POST");
    expect(JSON.parse(appels[0].options.body)).toEqual({ text: "Bonjour" });
  });

  it("rend le code et la réponse de Slack en échec, sans l'URL du webhook", async () => {
    const fetchFn = async () => ({
      ok: false,
      status: 404,
      text: async () => "no_service",
    });
    const resultat = await envoyerSlack({
      url: URL_WEBHOOK,
      texte: "x",
      fetchFn,
    });
    expect(resultat.ok).toBe(false);
    expect(resultat.raison).toContain("404");
    expect(resultat.raison).toContain("no_service");
    expect(resultat.raison).not.toContain("secret");
  });

  it("rend l'erreur réseau sans l'URL du webhook", async () => {
    const fetchFn = async () => {
      throw new Error(`fetch failed vers ${URL_WEBHOOK}`);
    };
    const resultat = await envoyerSlack({
      url: URL_WEBHOOK,
      texte: "x",
      fetchFn,
    });
    expect(resultat.ok).toBe(false);
    expect(resultat.raison).toContain("fetch failed");
    expect(resultat.raison).not.toContain("secret");
  });
});

describe("notifieurSlack", () => {
  const valeurs = { depot: DEPOT, projet: "comunity" };

  it("n'existe pas sans webhook", () => {
    expect(notifieurSlack({ ...valeurs, webhookSlack: null })).toBeNull();
  });

  it("poste le texte de la notification sur le webhook de la machine", async () => {
    const appels = [];
    const fetchFn = async (url, options) => {
      appels.push({ url, options });
      return { ok: true, status: 200, text: async () => "ok" };
    };
    const notifier = notifieurSlack(
      { ...valeurs, webhookSlack: "https://hooks.slack.com/services/T/B/x" },
      { fetchFn },
    );
    expect(await notifier({ type: "essai" })).toEqual({ ok: true });
    expect(appels[0].url).toBe("https://hooks.slack.com/services/T/B/x");
    expect(JSON.parse(appels[0].options.body).text).toContain("comunity");
  });
});
