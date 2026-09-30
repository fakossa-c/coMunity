import { describe, expect, it } from "vitest";
import { destinationArrivee, type ProfilArrivee } from "./page-arrivee";

const syndic: ProfilArrivee = {
  role: "syndic",
  statut: "valide",
  prenom: "Colette",
  nom: "Durand",
  pageArrivee: "tableau_de_bord",
};
const resident: ProfilArrivee = {
  role: "resident",
  statut: "valide",
  prenom: "Danielle",
  nom: "Martin",
  pageArrivee: "tableau_de_bord",
};

describe("destinationArrivee", () => {
  it("envoie un membre du conseil syndical sur le tableau de bord par défaut", () => {
    expect(destinationArrivee(syndic)).toBe("/syndic/tableau-de-bord");
  });

  it("envoie sur l'Accueil un membre du conseil syndical qui l'a choisi", () => {
    expect(destinationArrivee({ ...syndic, pageArrivee: "accueil" })).toBe(
      "/",
    );
  });

  it("envoie un résident sur l'Accueil, quel que soit le réglage", () => {
    expect(destinationArrivee(resident)).toBe("/");
  });

  it("envoie sur l'Accueil un membre du conseil syndical retiré", () => {
    expect(destinationArrivee({ ...syndic, statut: "retire" })).toBe("/");
  });

  it("envoie sur l'Accueil un compte sans profil", () => {
    expect(destinationArrivee(null)).toBe("/");
  });

  it("préfère la page demandée au réglage", () => {
    expect(destinationArrivee(syndic, "/activites/12")).toBe("/activites/12");
    expect(destinationArrivee(resident, "/annonces")).toBe("/annonces");
  });

  it("fait passer d'abord par « Présentez-vous à vos voisins » un membre sans prénom ni nom", () => {
    const incomplet = { ...syndic, prenom: null, nom: null };

    expect(destinationArrivee(incomplet)).toBe(
      "/completer-profil?suivant=%2Fsyndic%2Ftableau-de-bord",
    );
    expect(destinationArrivee({ ...incomplet, pageArrivee: "accueil" })).toBe(
      "/completer-profil?suivant=%2F",
    );
    expect(destinationArrivee(incomplet, "/annonces")).toBe(
      "/completer-profil?suivant=%2Fannonces",
    );
  });
});
