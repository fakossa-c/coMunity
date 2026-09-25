import { describe, expect, it } from "vitest";
import {
  libelleBoutonInscription,
  libelleJauge,
  libelleStatutInscription,
  estComplete,
  placesRestantesDe,
} from "./inscription-activite";

describe("places restantes d'une activité", () => {
  it("se déduisent de la capacité et des places prises", () => {
    expect(placesRestantesDe({ capaciteMax: 12, placesPrises: 8 })).toBe(4);
  });

  it("sont infinies quand l'activité n'a pas de capacité", () => {
    expect(placesRestantesDe({ capaciteMax: null, placesPrises: 8 })).toBeNull();
  });
});

describe("une activité est complète", () => {
  it("quand les places prises atteignent la capacité", () => {
    expect(estComplete({ capaciteMax: 12, placesPrises: 12 })).toBe(true);
    expect(estComplete({ capaciteMax: 12, placesPrises: 11 })).toBe(false);
  });

  it("jamais, sans capacité", () => {
    expect(estComplete({ capaciteMax: null, placesPrises: 500 })).toBe(false);
  });
});

describe("libellé de la jauge", () => {
  it("« 8 inscrits sur 12 places » avec une capacité", () => {
    expect(libelleJauge({ capaciteMax: 12, placesPrises: 8 })).toBe(
      "8 inscrits sur 12 places",
    );
  });

  it("« 1 inscrit sur 12 places » au singulier", () => {
    expect(libelleJauge({ capaciteMax: 12, placesPrises: 1 })).toBe(
      "1 inscrit sur 12 places",
    );
  });

  it("« 8 inscrits » sans capacité, sans « sur »", () => {
    expect(libelleJauge({ capaciteMax: null, placesPrises: 8 })).toBe(
      "8 inscrits",
    );
  });

  it("« Aucun inscrit » quand personne n'est inscrit", () => {
    expect(libelleJauge({ capaciteMax: 12, placesPrises: 0 })).toBe(
      "Aucun inscrit sur 12 places",
    );
    expect(libelleJauge({ capaciteMax: null, placesPrises: 0 })).toBe(
      "Aucun inscrit",
    );
  });
});

describe("libellé du bouton d'inscription", () => {
  it("« Je participe » sans accompagnant", () => {
    expect(libelleBoutonInscription(0)).toBe("Je participe");
  });

  it("« Je participe, avec 2 personnes » avec des accompagnants", () => {
    expect(libelleBoutonInscription(2)).toBe("Je participe, avec 2 personnes");
  });

  it("« Je participe, avec 1 personne » au singulier", () => {
    expect(libelleBoutonInscription(1)).toBe("Je participe, avec 1 personne");
  });
});

describe("libellé du statut d'inscription", () => {
  it("« J'y vais » sans accompagnant", () => {
    expect(libelleStatutInscription(0)).toBe("J'y vais");
  });

  it("« J'y vais, avec 2 personnes » avec des accompagnants", () => {
    expect(libelleStatutInscription(2)).toBe("J'y vais, avec 2 personnes");
  });

  it("« J'y vais, avec 1 personne » au singulier", () => {
    expect(libelleStatutInscription(1)).toBe("J'y vais, avec 1 personne");
  });
});
