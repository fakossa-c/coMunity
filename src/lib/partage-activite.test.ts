import { describe, expect, it } from "vitest";
import { categoriesActiviteListe, pictogrammeDe } from "./categories-activite";
import {
  creneau,
  jourLong,
  lienWhatsApp,
  messageWhatsApp,
  placesRestantes,
} from "./partage-activite";

const ACTIVITE = {
  titre: "Goûter crêpes",
  pictogramme: "waving_hand",
  date_activite: "2026-10-24",
  heure_debut: "16:00:00",
  heure_fin: "18:30:00",
  lieu: "Jardin partagé",
};

const LIEN = "https://comunity.example/activites/abcd2345efgh";

describe("dates d'une activité", () => {
  it("le jour s'écrit en toutes lettres, avec une majuscule", () => {
    expect(jourLong("2026-10-24")).toBe("Samedi 24 octobre");
    expect(jourLong("2026-12-01")).toBe("Mardi 1 décembre");
  });

  it("le créneau s'écrit à la française, sans les secondes", () => {
    expect(creneau("16:00:00", "18:30:00")).toBe("de 16h00 à 18h30");
    expect(creneau("09:05", "10:00")).toBe("de 9h05 à 10h00");
  });
});

describe("places restantes", () => {
  it("s'accordent en nombre", () => {
    expect(placesRestantes(4)).toBe("4 places restantes");
    expect(placesRestantes(1)).toBe("1 place restante");
  });

  it("une activité sans place restante est complète", () => {
    expect(placesRestantes(0)).toBe("Complet");
  });
});

describe("message WhatsApp", () => {
  it("donne le pictogramme en emoji, le titre, la date, le lieu et le lien", () => {
    expect(messageWhatsApp(ACTIVITE, LIEN)).toBe(
      [
        "👋 Goûter crêpes",
        "📅 Samedi 24 octobre, de 16h00 à 18h30",
        "📍 Jardin partagé",
        LIEN,
      ].join("\n"),
    );
  });

  it("donne les places restantes quand l'activité a une jauge", () => {
    const message = messageWhatsApp({ ...ACTIVITE, placesRestantes: 4 }, LIEN);

    expect(message.split("\n")).toEqual([
      "👋 Goûter crêpes",
      "📅 Samedi 24 octobre, de 16h00 à 18h30",
      "📍 Jardin partagé",
      "4 places restantes",
      LIEN,
    ]);
  });

  it("un pictogramme sans emoji équivalent laisse le titre seul", () => {
    const message = messageWhatsApp(
      { ...ACTIVITE, pictogramme: "inconnu" },
      LIEN,
    );

    expect(message.split("\n")[0]).toBe("Goûter crêpes");
  });

  it("chaque catégorie a un emoji", () => {
    for (const pictogramme of categoriesActiviteListe.map(pictogrammeDe)) {
      const titre = messageWhatsApp({ ...ACTIVITE, pictogramme }, LIEN).split(
        "\n",
      )[0];
      expect(titre).not.toBe(ACTIVITE.titre);
    }
  });

  it("le lien de partage ouvre WhatsApp avec le message pré-rempli", () => {
    const lien = new URL(lienWhatsApp("Goûter & jeux\nhttps://x.fr/a?b=1"));

    expect(lien.origin).toBe("https://wa.me");
    expect(lien.searchParams.get("text")).toBe(
      "Goûter & jeux\nhttps://x.fr/a?b=1",
    );
  });
});
