import { describe, expect, it } from "vitest";
import { refusMotDePasseAuth, refusNouveauMotDePasse } from "./mot-de-passe";

describe("refusNouveauMotDePasse", () => {
  it("accepte un mot de passe de 6 caractères confirmé à l'identique", () => {
    expect(refusNouveauMotDePasse("abcdef", "abcdef")).toBeNull();
  });

  it("refuse un mot de passe trop court sous son champ", () => {
    expect(refusNouveauMotDePasse("abcde", "abcde")).toEqual({
      erreur: "Choisissez un mot de passe d'au moins 6 caractères.",
      champ: "mot-de-passe",
    });
  });

  it("refuse une confirmation différente sous son champ", () => {
    expect(refusNouveauMotDePasse("abcdef", "abcdeg")).toEqual({
      erreur: "Les deux mots de passe ne sont pas identiques.",
      champ: "confirmation",
    });
  });
});

describe("refusMotDePasseAuth", () => {
  it("demande un mot de passe différent du précédent, nommé par l'écran", () => {
    expect(refusMotDePasseAuth("same_password", "l'actuel")).toEqual({
      erreur: "Choisissez un mot de passe différent de l'actuel.",
      champ: "mot-de-passe",
    });
  });

  it("traduit un mot de passe jugé trop faible", () => {
    expect(refusMotDePasseAuth("weak_password", "l'ancien")).toEqual({
      erreur: "Ce mot de passe est trop faible : au moins 6 caractères.",
      champ: "mot-de-passe",
    });
  });

  it("laisse à l'écran toute autre erreur", () => {
    expect(refusMotDePasseAuth("unexpected_failure", "l'ancien")).toBeNull();
    expect(refusMotDePasseAuth(undefined, "l'ancien")).toBeNull();
  });
});
