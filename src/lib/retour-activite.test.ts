import { describe, expect, it } from "vitest";
import {
  activiteEstPassee,
  libelleNombreRetours,
  libelleNoteMoyenne,
} from "./retour-activite";

describe("activiteEstPassee", () => {
  it("est vraie quand la date et l'heure de fin sont dans le passé", () => {
    expect(
      activiteEstPassee({ date_activite: "2020-01-01", heure_fin: "10:00" }),
    ).toBe(true);
  });

  it("est fausse quand la date de fin est dans le futur", () => {
    expect(
      activiteEstPassee({ date_activite: "2099-01-01", heure_fin: "10:00" }),
    ).toBe(false);
  });
});

describe("libelleNoteMoyenne", () => {
  it("affiche la moyenne sur 5", () => {
    expect(libelleNoteMoyenne(3.5)).toBe("3,5 / 5");
  });

  it("affiche une moyenne entière sans décimale superflue", () => {
    expect(libelleNoteMoyenne(4)).toBe("4 / 5");
  });

  it("indique l'absence de retour", () => {
    expect(libelleNoteMoyenne(null)).toBe("Aucun retour pour le moment");
  });
});

describe("libelleNombreRetours", () => {
  it("accorde au singulier", () => {
    expect(libelleNombreRetours(1)).toBe("1 retour");
  });

  it("accorde au pluriel", () => {
    expect(libelleNombreRetours(3)).toBe("3 retours");
  });

  it("indique l'absence de retour", () => {
    expect(libelleNombreRetours(0)).toBe("Aucun retour");
  });
});
