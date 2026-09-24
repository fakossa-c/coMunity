import { describe, expect, it } from "vitest";
import { erreurDuChamp, erreurGenerale } from "./resultat";

describe("erreur d'un formulaire", () => {
  it("s'affiche sous le champ qu'elle concerne, et seulement lui", () => {
    const etat = { erreur: "Saisissez votre adresse email.", champ: "email" };
    expect(erreurDuChamp(etat, "email")).toBe("Saisissez votre adresse email.");
    expect(erreurDuChamp(etat, "mot-de-passe")).toBeUndefined();
    expect(erreurGenerale(etat)).toBeUndefined();
  });

  it("s'affiche en tête du formulaire quand elle ne vise aucun champ", () => {
    const etat = { erreur: "Email ou mot de passe incorrect." };
    expect(erreurGenerale(etat)).toBe("Email ou mot de passe incorrect.");
    expect(erreurDuChamp<"email">(etat, "email")).toBeUndefined();
  });
});
