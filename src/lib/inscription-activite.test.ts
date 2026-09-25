import { describe, expect, it } from "vitest";
import {
  libelleAccompagnants,
  etatConfirmation,
  libelleBoutonInscription,
  libelleConfirmation,
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

describe("libellé des accompagnants d'un participant", () => {
  it("rien sans accompagnant", () => {
    expect(libelleAccompagnants(0)).toBeNull();
  });

  it("« avec 1 personne » au singulier", () => {
    expect(libelleAccompagnants(1)).toBe("avec 1 personne");
  });

  it("« avec 2 personnes » au pluriel", () => {
    expect(libelleAccompagnants(2)).toBe("avec 2 personnes");
  });
});

describe("état de confirmation selon le minimum", () => {
  it("sans minimum, il n'y a rien à confirmer", () => {
    expect(etatConfirmation({ capaciteMin: null, placesPrises: 0 })).toBeNull();
    expect(libelleConfirmation(null)).toBeNull();
  });

  it("confirmée quand les personnes inscrites atteignent le minimum", () => {
    const etat = etatConfirmation({ capaciteMin: 4, placesPrises: 4 });
    expect(etat).toEqual({ confirmee: true });
    expect(libelleConfirmation(etat)).toBe("Confirmée");
  });

  it("confirmée au-delà du minimum", () => {
    expect(etatConfirmation({ capaciteMin: 4, placesPrises: 9 })).toEqual({
      confirmee: true,
    });
  });

  it("« encore 3 participants pour confirmer » sous le minimum", () => {
    const etat = etatConfirmation({ capaciteMin: 4, placesPrises: 1 });
    expect(etat).toEqual({ confirmee: false, manquants: 3 });
    expect(libelleConfirmation(etat)).toBe("Encore 3 participants pour confirmer");
  });

  it("« encore 1 participant pour confirmer » au singulier", () => {
    const etat = etatConfirmation({ capaciteMin: 4, placesPrises: 3 });
    expect(libelleConfirmation(etat)).toBe("Encore 1 participant pour confirmer");
  });
});
