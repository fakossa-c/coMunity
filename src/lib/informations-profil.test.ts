import { describe, expect, it } from "vitest";
import {
  BATIMENTS,
  ETAGES,
  adresse,
  libelleEtage,
  resumeVisibilite,
  verifierInformations,
  versProfil,
  type SaisieInformations,
} from "./informations-profil";

const SAISIE: SaisieInformations = {
  pseudo: "Dany",
  telephone: "06 12 34 56 78",
  batiment: "Bât. B",
  etage: "2",
};

describe("libelleEtage", () => {
  it.each([
    [0, "Rez-de-chaussée"],
    [1, "1er étage"],
    [2, "2e étage"],
    [10, "10e étage"],
  ])("écrit l'étage %i « %s »", (etage, libelle) => {
    expect(libelleEtage(etage)).toBe(libelle);
  });
});

describe("adresse", () => {
  it("dit le bâtiment et l'étage", () => {
    expect(adresse("Bât. B", 2)).toBe("Bât. B, 2e étage");
  });

  it("ne garde que ce qui est renseigné", () => {
    expect(adresse("Bât. B", null)).toBe("Bât. B");
    expect(adresse(null, 0)).toBe("Rez-de-chaussée");
  });

  it("est vide sans bâtiment ni étage", () => {
    expect(adresse(null, null)).toBeUndefined();
  });
});

describe("resumeVisibilite", () => {
  const rien = {
    telephone: { visible: false, renseigne: true },
    batiment: { visible: false, renseigne: true },
    etage: { visible: false, renseigne: true },
  };

  it("dit par défaut que les voisins voient le pseudo", () => {
    expect(resumeVisibilite(rien)).toBe("Les voisins voient votre pseudo.");
  });

  it("ajoute ce qui est rendu visible, avec « et » avant le dernier", () => {
    expect(
      resumeVisibilite({
        ...rien,
        telephone: { visible: true, renseigne: true },
      }),
    ).toBe("Les voisins voient votre pseudo et téléphone.");
    expect(
      resumeVisibilite({
        telephone: { visible: true, renseigne: true },
        batiment: { visible: true, renseigne: true },
        etage: { visible: true, renseigne: true },
      }),
    ).toBe("Les voisins voient votre pseudo, téléphone, bâtiment et étage.");
  });

  it("ne promet pas une information visible qui n'est pas renseignée", () => {
    expect(
      resumeVisibilite({
        ...rien,
        telephone: { visible: true, renseigne: false },
      }),
    ).toBe("Les voisins voient votre pseudo.");
  });
});

describe("verifierInformations", () => {
  it("accepte des informations complètes", () => {
    expect(verifierInformations(SAISIE)).toBeNull();
  });

  it("accepte un profil réduit au pseudo", () => {
    expect(
      verifierInformations({
        pseudo: "Dany",
        telephone: "",
        batiment: "",
        etage: "",
      }),
    ).toBeNull();
  });

  it.each([
    [{ pseudo: "  " }, "pseudo", "Choisissez votre pseudo."],
    [
      { pseudo: "x".repeat(51) },
      "pseudo",
      "Votre pseudo tient en 50 caractères au plus.",
    ],
    [
      { telephone: "06" },
      "telephone",
      "Saisissez un numéro de téléphone valide, par exemple 06 12 34 56 78.",
    ],
    [
      { telephone: "abcdefgh" },
      "telephone",
      "Saisissez un numéro de téléphone valide, par exemple 06 12 34 56 78.",
    ],
    [{ batiment: "Bât. Z" }, "batiment", "Choisissez un bâtiment de la liste."],
    [{ etage: "99" }, "etage", "Choisissez un étage de la liste."],
    [{ etage: "deux" }, "etage", "Choisissez un étage de la liste."],
  ])("refuse %o sous le champ %s", (ecart, champ, erreur) => {
    expect(verifierInformations({ ...SAISIE, ...ecart })).toEqual({
      champ,
      erreur,
    });
  });

  it("accepte un téléphone avec indicatif, points et tirets", () => {
    for (const telephone of [
      "+33 6 12 34 56 78",
      "06.12.34.56.78",
      "06-12-34-56-78",
    ]) {
      expect(verifierInformations({ ...SAISIE, telephone })).toBeNull();
    }
  });
});

describe("versProfil", () => {
  it("prépare la mise à jour du profil, sans espaces autour", () => {
    expect(versProfil({ ...SAISIE, pseudo: "  Dany " })).toEqual({
      pseudo: "Dany",
      telephone: "06 12 34 56 78",
      batiment: "Bât. B",
      etage: 2,
    });
  });

  it("efface ce qui est laissé vide", () => {
    expect(
      versProfil({ pseudo: "Dany", telephone: " ", batiment: "", etage: "" }),
    ).toEqual({ pseudo: "Dany", telephone: null, batiment: null, etage: null });
  });

  it("lit le rez-de-chaussée, l'étage 0", () => {
    expect(versProfil({ ...SAISIE, etage: "0" }).etage).toBe(0);
  });
});

describe("listes", () => {
  it("proposent les bâtiments A à E et les étages 0 à 10", () => {
    expect(BATIMENTS).toEqual([
      "Bât. A",
      "Bât. B",
      "Bât. C",
      "Bât. D",
      "Bât. E",
    ]);
    expect(ETAGES[0]).toBe(0);
    expect(ETAGES.at(-1)).toBe(10);
  });
});
