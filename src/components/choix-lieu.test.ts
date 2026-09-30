import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EspaceCommun } from "@/lib/espaces-communs";
import { LIEU_LIBRE } from "@/lib/proposition-activite";
import { ChoixLieu } from "./choix-lieu";

const SALLE: EspaceCommun = {
  id: "salle",
  nom: "Salle commune",
  batiment: "Bâtiment B",
  localisation: null,
  description: null,
  capacite: 20,
  equipements: ["cuisine"],
  heure_fin_max: "21:00:00",
  consignes: "Laissez la salle propre.",
  horaires_acces: null,
  contact: null,
  photo_chemin: null,
  photos: [],
  longueur_m: null,
  largeur_m: null,
  hauteur_plafond_m: null,
  plan_chemin: null,
};

const COUR: EspaceCommun = {
  ...SALLE,
  id: "cour",
  nom: "Cour",
  batiment: null,
  capacite: null,
  equipements: [],
  heure_fin_max: null,
  consignes: null,
};

function rendre(
  espaces: EspaceCommun[],
  espaceCommun: string,
  lieu = "",
  erreurEspace?: string,
) {
  return renderToStaticMarkup(
    createElement(ChoixLieu, {
      espaces,
      espaceCommun,
      lieu,
      onEspaceChange: () => {},
      onLieuChange: () => {},
      erreurEspace,
    }),
  );
}

describe("ChoixLieu", () => {
  it("sans espace commun : un message en clair, le champ libre, aucune liste", () => {
    const html = rendre([], LIEU_LIBRE);

    expect(html).toContain(
      "Le conseil syndical n&#x27;a pas encore enregistré d&#x27;espace commun. Indiquez le lieu ci-dessous.",
    );
    expect(html).not.toContain("<select");
    expect(html).toContain("Nom du lieu");
  });

  it("avec des espaces : la liste « Lieu », les espaces dans l'ordre reçu, puis « Autre lieu… »", () => {
    const html = rendre([SALLE, COUR], "");

    expect(html).toMatch(/<label[^>]*>Lieu<\/label>/);
    expect(html).toContain("<select");
    expect(html).not.toContain("n&#x27;a pas encore enregistré");
    expect(html.indexOf("Salle commune")).toBeLessThan(html.indexOf("Cour"));
    expect(html.indexOf("Cour")).toBeLessThan(html.indexOf("Autre lieu…"));
    expect(html).toContain("Choisir un lieu");
  });

  it("avant tout choix : ni résumé d'espace ni champ libre", () => {
    const html = rendre([SALLE], "");

    expect(html).not.toContain("Laissez la salle propre.");
    expect(html).not.toContain("Nom du lieu");
  });

  it("un espace choisi montre dessous son résumé, ses badges et ses consignes", () => {
    const html = rendre([SALLE, COUR], "salle");

    expect(html).toContain(
      "Bâtiment B · Jusqu&#x27;à 20 personnes · Ferme à 21h00",
    );
    expect(html).toContain("Coin cuisine");
    expect(html).toContain("Laissez la salle propre.");
    expect(html).not.toContain("Nom du lieu");
  });

  it("un espace sans consigne montre tout de même son résumé", () => {
    const html = rendre([SALLE, COUR], "cour");

    expect(html).toContain("Sans limite de places");
    expect(html).not.toContain("Consignes");
  });

  it("« Autre lieu… » ouvre le champ libre, sans résumé d'espace", () => {
    const html = rendre([SALLE], LIEU_LIBRE, "Chez Danielle");

    expect(html).toContain("Nom du lieu");
    expect(html).toContain('value="Chez Danielle"');
    expect(html).not.toContain("Jusqu&#x27;à 20 personnes");
  });

  it("le choix manquant se dit sous la liste", () => {
    const html = rendre([SALLE], "", "", "Choisissez où se tient l'activité.");

    expect(html).toContain("Choisissez où se tient l&#x27;activité.");
  });
});
