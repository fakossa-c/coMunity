import { describe, expect, it } from "vitest";
import {
  COMPTES,
  MODELE_DEMO,
  adresseDemo,
  estAdresseDemo,
  jour,
  verifierCible,
} from "./demo-comptes.mjs";

describe("adresseDemo", () => {
  it("compose fakossa+test-<rôle>-<username>@gmail.com", () => {
    expect(adresseDemo({ role: "resident", username: "danielle" })).toBe(
      "fakossa+test-resident-danielle@gmail.com",
    );
    expect(adresseDemo({ role: "syndic", username: "syndic" })).toBe(
      "fakossa+test-syndic-syndic@gmail.com",
    );
  });

  it("donne à chaque compte une adresse reconnue comme de démonstration", () => {
    for (const compte of COMPTES) {
      expect(estAdresseDemo(adresseDemo(compte)), compte.username).toBe(true);
    }
  });
});

describe("estAdresseDemo", () => {
  it("reconnaît les adresses de démonstration", () => {
    expect(estAdresseDemo("fakossa+test-resident-marc@gmail.com")).toBe(true);
    expect(estAdresseDemo("fakossa+test-syndic-syndic@gmail.com")).toBe(true);
    expect(estAdresseDemo("Fakossa+Test-Resident-Marc@Gmail.com")).toBe(true);
  });

  it("ne reconnaît plus l'ancien format fakossa+<username>", () => {
    expect(estAdresseDemo("fakossa+marc@gmail.com")).toBe(false);
    expect(estAdresseDemo("Fakossa+Marc@Gmail.com")).toBe(false);
    expect(estAdresseDemo("fakossa+moi@gmail.com")).toBe(false);
  });

  it("ne reconnaît jamais la vraie boîte ni une autre adresse", () => {
    expect(estAdresseDemo("fakossa@gmail.com")).toBe(false);
    expect(estAdresseDemo("fakossa.conate@gmail.com")).toBe(false);
    expect(estAdresseDemo("marc@gmail.com")).toBe(false);
    expect(
      estAdresseDemo("fakossa+test-resident-marc@gmail.com.autre.fr"),
    ).toBe(false);
    expect(estAdresseDemo("x.fakossa+test-resident-marc@gmail.com")).toBe(
      false,
    );
    expect(estAdresseDemo("fakossa+test-@gmail.com")).toBe(false);
    expect(estAdresseDemo("fakossa+test-admin-marc@gmail.com")).toBe(false);
    expect(estAdresseDemo("fakossa+test-resident-@gmail.com")).toBe(false);
    expect(estAdresseDemo("fakossa.conate+test-resident-marc@gmail.com")).toBe(
      false,
    );
    expect(estAdresseDemo(undefined)).toBe(false);
  });

  it("suit le modèle passé", () => {
    const modele = { ...MODELE_DEMO, prefixe: "essai+", domaine: "exemple.fr" };
    expect(estAdresseDemo("essai+test-resident-a@exemple.fr", modele)).toBe(
      true,
    );
    expect(estAdresseDemo("essai+a@exemple.fr", modele)).toBe(false);
    expect(estAdresseDemo("fakossa+test-resident-a@gmail.com", modele)).toBe(
      false,
    );
  });
});

describe("verifierCible", () => {
  it("laisse passer le Supabase local", () => {
    expect(() =>
      verifierCible({ url: "http://127.0.0.1:54421", distant: false }),
    ).not.toThrow();
    expect(() =>
      verifierCible({ url: "http://localhost:55140", distant: false }),
    ).not.toThrow();
  });

  it("refuse un Supabase distant sans --distant", () => {
    expect(() =>
      verifierCible({ url: "https://abc.supabase.co", distant: false }),
    ).toThrow(/--distant/);
  });

  it("laisse passer un Supabase distant avec --distant", () => {
    expect(() =>
      verifierCible({ url: "https://abc.supabase.co", distant: true }),
    ).not.toThrow();
  });

  it("refuse une URL absente ou illisible", () => {
    expect(() => verifierCible({ url: undefined, distant: true })).toThrow();
    expect(() =>
      verifierCible({ url: "pas une url", distant: true }),
    ).toThrow();
  });
});

describe("COMPTES", () => {
  it("compte un syndic, des résidents validés, et un de chaque autre statut", () => {
    const parStatut = (statut) =>
      COMPTES.filter((c) => c.statut === statut).map((c) => c.username);
    expect(COMPTES.find((c) => c.role === "syndic")?.username).toBe("syndic");
    expect(parStatut("valide")).toEqual(
      expect.arrayContaining([
        "syndic",
        "danielle",
        "marc",
        "amina",
        "julien",
        "sophie",
      ]),
    );
    expect(parStatut("en_attente")).toEqual(["attente"]);
    expect(parStatut("refuse")).toEqual(["refuse"]);
    expect(parStatut("retire")).toEqual(["retire"]);
  });

  it("n'a pas deux fois le même username", () => {
    const noms = COMPTES.map((c) => c.username);
    expect(new Set(noms).size).toBe(noms.length);
  });
});

describe("jour", () => {
  it("compte depuis le jour de Paris entre minuit et 2h à Paris, quand UTC est encore la veille", () => {
    // 22h30 UTC le 14 juillet = 00h30 à Paris (UTC+2) le 15.
    const nuitEte = new Date("2026-07-14T22:30:00Z");
    expect(jour(nuitEte, 0)).toBe("2026-07-15");
    expect(jour(nuitEte, 2)).toBe("2026-07-17");
    expect(jour(nuitEte, -1)).toBe("2026-07-14");
    // 23h30 UTC le 14 janvier = 00h30 à Paris (UTC+1) le 15.
    expect(jour(new Date("2026-01-14T23:30:00Z"), 0)).toBe("2026-01-15");
  });

  it("passe d'un mois sur l'autre et du changement d'heure sans décaler le jour", () => {
    // 23h30 UTC le 28 mars = 00h30 à Paris le 29, jour du passage à l'heure d'été.
    const veilleChangement = new Date("2026-03-28T23:30:00Z");
    expect(jour(veilleChangement, 0)).toBe("2026-03-29");
    expect(jour(veilleChangement, 3)).toBe("2026-04-01");
    expect(jour(new Date("2026-10-24T22:30:00Z"), 1)).toBe("2026-10-26");
  });

  it("donne le même jour qu'UTC en journée", () => {
    expect(jour(new Date("2026-07-14T10:00:00Z"), 0)).toBe("2026-07-14");
    expect(jour(new Date("2026-07-14T10:00:00Z"), 5)).toBe("2026-07-19");
  });
});
