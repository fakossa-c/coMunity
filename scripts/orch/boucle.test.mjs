import { describe, expect, it } from "vitest";
import { decisionVerrou, ligneJournal } from "./boucle.mjs";

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
