import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EspaceCommun } from "@/lib/espaces-communs";
import { EspacesCommunsCopro } from "./espaces-communs-copro";

const SALLE: EspaceCommun = {
  id: "salle",
  nom: "Salle commune",
  batiment: "Bâtiment B",
  localisation: "Rez-de-chaussée, à gauche du hall",
  description: "Une grande pièce claire avec une cuisine.",
  capacite: 20,
  equipements: ["acces_plain_pied", "cuisine"],
  heure_fin_max: "21:00:00",
  consignes: "Laissez la salle propre.",
  horaires_acces: "Tous les jours de 9h à 21h",
  contact: "Colette, gardienne : 06 12 34 56 78",
};

const COUR: EspaceCommun = {
  id: "cour",
  nom: "Cour",
  batiment: null,
  localisation: null,
  description: null,
  capacite: null,
  equipements: [],
  heure_fin_max: null,
  consignes: null,
  horaires_acces: null,
  contact: null,
};

function rendre(espaces: EspaceCommun[]) {
  return renderToStaticMarkup(createElement(EspacesCommunsCopro, { espaces }));
}

describe("EspacesCommunsCopro", () => {
  it("dit que le conseil syndical n'en a défini aucun, sans liste", () => {
    const html = rendre([]);

    expect(html).toContain(
      "Le conseil syndical n&#x27;a pas encore défini d&#x27;espace commun.",
    );
    expect(html).not.toContain("<ul");
  });

  it("présente chaque espace sous son nom, dans l'ordre reçu, dans une liste nommée", () => {
    const html = rendre([SALLE, COUR]);

    expect(html).toContain('aria-label="Espaces communs"');
    expect(html).toMatch(/<h3[^>]*>[^<]*Salle commune/);
    expect(html).toMatch(/<h3[^>]*>[^<]*Cour/);
    expect(html.indexOf("Salle commune")).toBeLessThan(html.indexOf("Cour"));
  });

  it("donne les informations renseignées, chacune sous son libellé", () => {
    const html = rendre([SALLE]);

    expect(html).toContain("Bâtiment B");
    expect(html).toContain("Rez-de-chaussée, à gauche du hall");
    expect(html).toContain("Une grande pièce claire avec une cuisine.");
    expect(html).toMatch(
      /<dt[^>]*>(?:(?!<\/dt>).)*Horaires d&#x27;accès<\/dt>\s*<dd[^>]*>Tous les jours de 9h à 21h/,
    );
    expect(html).toMatch(
      /<dt[^>]*>(?:(?!<\/dt>).)*Contact<\/dt>\s*<dd[^>]*>Colette, gardienne : 06 12 34 56 78/,
    );
    expect(html).toMatch(
      /<dt[^>]*>(?:(?!<\/dt>).)*Capacité<\/dt>\s*<dd[^>]*>Jusqu&#x27;à 20 personnes/,
    );
    expect(html).toMatch(
      /<dt[^>]*>(?:(?!<\/dt>).)*Consignes<\/dt>\s*<dd[^>]*>Laissez la salle propre\./,
    );
  });

  it("montre les équipements et l'accessibilité en badges, dans une liste nommée", () => {
    const html = rendre([SALLE]);

    expect(html).toContain('aria-label="Équipements"');
    expect(html).toContain("Accès plain-pied");
    expect(html).toContain("Coin cuisine");
    expect(html).not.toContain("Ascenseur");
  });

  it("n'affiche rien d'un champ non renseigné : ni libellé, ni ligne vide", () => {
    const html = rendre([COUR]);

    expect(html).toContain("Cour");
    for (const absent of [
      "Horaires d&#x27;accès",
      "Contact",
      "Capacité",
      "Consignes",
      "Équipements",
      "Sans limite",
      "Bâtiment",
      "<dl",
    ])
      expect(html).not.toContain(absent);
    // Ni description ni ligne vide : le seul paragraphe possible est celui de la description.
    expect(html).not.toMatch(/<p[ >]/);
  });

  it("garde un texte trop long dans sa carte", () => {
    const html = rendre([{ ...SALLE, nom: "N".repeat(60) }]);

    expect(html).toContain("[overflow-wrap:anywhere]");
  });
});
