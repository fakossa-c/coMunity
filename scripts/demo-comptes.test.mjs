import { describe, expect, it } from "vitest";
import {
  COMPTES,
  MODELE_DEMO,
  adresseDemo,
  estAdresseDemo,
  verifierCible,
} from "./demo-comptes.mjs";

describe("adresseDemo", () => {
  it("compose fakossa+<username>@gmail.com", () => {
    expect(adresseDemo("danielle")).toBe("fakossa+danielle@gmail.com");
  });
});

describe("estAdresseDemo", () => {
  it("reconnaît les adresses de démonstration", () => {
    expect(estAdresseDemo("fakossa+marc@gmail.com")).toBe(true);
    expect(estAdresseDemo("Fakossa+Marc@Gmail.com")).toBe(true);
  });

  it("ne reconnaît jamais la vraie boîte ni une autre adresse", () => {
    expect(estAdresseDemo("fakossa@gmail.com")).toBe(false);
    expect(estAdresseDemo("fakossa.conate@gmail.com")).toBe(false);
    expect(estAdresseDemo("marc@gmail.com")).toBe(false);
    expect(estAdresseDemo("fakossa+marc@gmail.com.autre.fr")).toBe(false);
    expect(estAdresseDemo("x.fakossa+marc@gmail.com")).toBe(false);
    expect(estAdresseDemo("fakossa+@gmail.com")).toBe(false);
    expect(estAdresseDemo(undefined)).toBe(false);
  });

  it("suit le modèle passé", () => {
    const modele = { ...MODELE_DEMO, prefixe: "essai+", domaine: "exemple.fr" };
    expect(estAdresseDemo("essai+a@exemple.fr", modele)).toBe(true);
    expect(estAdresseDemo("fakossa+a@gmail.com", modele)).toBe(false);
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
