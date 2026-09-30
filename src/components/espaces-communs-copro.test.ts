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
  photo_chemin: "0b9d5a52-8c1e-4f3a-9d1b-2f6c7a8e9b10.jpg",
  photos: ["0b9d5a52-8c1e-4f3a-9d1b-2f6c7a8e9b10.jpg"],
  longueur_m: null,
  largeur_m: null,
  hauteur_plafond_m: null,
  plan_chemin: null,
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
  photo_chemin: null,
  photos: [],
  longueur_m: null,
  largeur_m: null,
  hauteur_plafond_m: null,
  plan_chemin: null,
};

function rendre(espaces: EspaceCommun[], photos: Record<string, string> = {}) {
  return renderToStaticMarkup(
    createElement(EspacesCommunsCopro, { espaces, photos }),
  );
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

  it("n'affiche rien d'un champ non renseigné : ni libellé, ni ligne vide", () => {
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

  it("montre la photo de l'espace, au-dessus de son nom, avec un texte alternatif", () => {
    const html = rendre([SALLE], { salle: "https://exemple.test/salle.jpg" });

    expect(html).toContain('src="https://exemple.test/salle.jpg"');
    expect(html).toContain(
      'alt="Salle commune, photo de l&#x27;espace commun"',
    );
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("<h3"));
  });

  it("n'affiche aucune image pour un espace sans photo, comme avant", () => {
    const html = rendre([COUR], { salle: "https://exemple.test/salle.jpg" });

    expect(html).not.toContain("<img");
    expect(html).not.toContain("bg-rayures-photo");
  });

  it("ne montre pas la photo d'un espace dont l'adresse n'a pas pu être signée", () => {
    const html = rendre([SALLE]);

    expect(html).not.toContain("<img");
  });

  it("ouvre la fiche de l'espace depuis sa carte, par un lien qui nomme l'espace", () => {
    const html = rendre([SALLE, COUR]);

    expect(html).toContain('href="/ma-copro/espaces/salle"');
    expect(html).toContain('href="/ma-copro/espaces/cour"');
    expect(html).toMatch(
      /<a[^>]*href="\/ma-copro\/espaces\/salle"[^>]*>(?:(?!<\/a>).)*Voir le détail(?:(?!<\/a>).)*Salle commune/,
    );
  });
});
