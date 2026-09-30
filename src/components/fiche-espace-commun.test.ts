import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EspaceCommun } from "@/lib/espaces-communs";
import { FicheEspaceCommun } from "./fiche-espace-commun";

const SALLE: EspaceCommun = {
  id: "salle",
  nom: "Salle commune",
  batiment: "Bâtiment A",
  localisation: "Rez-de-chaussée",
  description: "Une grande salle lumineuse avec cuisine ouverte.",
  capacite: 30,
  equipements: ["acces_plain_pied", "cuisine"],
  heure_fin_max: "22:00:00",
  consignes:
    "Rangez les chaises.\nÉteignez la cuisine.\nLa musique s'arrête à 22h.\nSignalez toute casse.",
  horaires_acces: "De 8h00 à 22h00, tous les jours",
  contact: "Colette, gardienne",
  photo_chemin: "salle.jpg",
  photos: ["salle.jpg"],
  longueur_m: 8,
  largeur_m: 6,
  hauteur_plafond_m: 2.7,
  plan_chemin: "plan.jpg",
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

const AUTRE: EspaceCommun = { ...COUR, id: "jardin", nom: "Jardin partagé" };

function rendre(
  espace: EspaceCommun,
  {
    photos = [],
    plan,
    autres = [],
  }: { photos?: string[]; plan?: string; autres?: EspaceCommun[] } = {},
) {
  return renderToStaticMarkup(
    createElement(FicheEspaceCommun, { espace, photos, plan, autres }),
  );
}

describe("FicheEspaceCommun", () => {
  it("a pour titre de page le nom de l'espace, avec son emplacement et sa description", () => {
    const html = rendre(SALLE);

    expect(html).toMatch(/<h1[^>]*>Salle commune<\/h1>/);
    expect(html).toContain("Bâtiment A · Rez-de-chaussée");
    expect(html).toContain("Une grande salle lumineuse avec cuisine ouverte.");
  });

  it("donne capacité, horaires et équipements sous leur libellé", () => {
    const html = rendre(SALLE);

    expect(html).toMatch(
      /<dt[^>]*>(?:(?!<\/dt>).)*Capacité<\/dt>\s*<dd[^>]*>Jusqu&#x27;à 30 personnes/,
    );
    expect(html).toMatch(
      /<dt[^>]*>(?:(?!<\/dt>).)*Horaires d&#x27;accès<\/dt>\s*<dd[^>]*>De 8h00 à 22h00, tous les jours/,
    );
    expect(html).toContain('aria-label="Équipements"');
    expect(html).toContain("Accès plain-pied");
    expect(html).toContain("Coin cuisine");
  });

  it("montre la photo en tête, avec son texte alternatif", () => {
    const html = rendre(SALLE, { photos: ["https://exemple.test/salle.jpg"] });

    expect(html).toContain('src="https://exemple.test/salle.jpg"');
    expect(html).toContain(
      'alt="Salle commune, photo de l&#x27;espace commun"',
    );
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("<h1"));
  });

  it("avec une seule photo, la galerie n'a ni compteur, ni boutons, ni vignettes", () => {
    const html = rendre(SALLE, { photos: ["https://exemple.test/a.jpg"] });

    expect(html).not.toContain("Photo suivante");
    expect(html).not.toContain("1 sur 1");
    expect(html).not.toContain("Vignettes");
  });

  it("avec plusieurs photos, montre la galerie : la première en grand, le compteur et une vignette par photo", () => {
    const html = rendre(SALLE, {
      photos: [
        "https://exemple.test/a.jpg",
        "https://exemple.test/b.jpg",
        "https://exemple.test/c.jpg",
      ],
    });

    expect(html).toContain('aria-label="Photos de l&#x27;espace commun"');
    expect(html).toContain('alt="Salle commune, photo 1 sur 3"');
    expect(html).toContain("1 sur 3");
    expect(html).toContain("Photo suivante");
    // Sur ordinateur, une vignette par photo, chacune nommée par son rang.
    for (const rang of [1, 2, 3])
      expect(html).toMatch(
        new RegExp(
          `<button[^>]*aria-label="Photo ${rang} sur 3"[^>]*>(?:(?!</button>).)*<img`,
        ),
      );
    expect(html).toContain('aria-current="true"');
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("<h1"));
  });

  it("donne les dimensions avec leur surface et la hauteur sous plafond, avant la capacité", () => {
    const html = rendre(SALLE);

    expect(html).toMatch(
      /<dt[^>]*>(?:(?!<\/dt>).)*Dimensions<\/dt>\s*<dd[^>]*>8 m × 6 m, soit 48 m²/,
    );
    expect(html).toMatch(
      /<dt[^>]*>(?:(?!<\/dt>).)*Hauteur sous plafond<\/dt>\s*<dd[^>]*>2,7 m/,
    );
    expect(html.indexOf("Dimensions")).toBeLessThan(html.indexOf("Capacité"));
    expect(html.indexOf("Hauteur sous plafond")).toBeLessThan(
      html.indexOf("Capacité"),
    );
  });

  it("n'affiche que la hauteur quand il n'y a pas de dimensions, et inversement", () => {
    const hauteurSeule = rendre({
      ...SALLE,
      longueur_m: null,
      largeur_m: null,
    });
    expect(hauteurSeule).not.toContain("Dimensions");
    expect(hauteurSeule).toContain("Hauteur sous plafond");

    const dimensionsSeules = rendre({ ...SALLE, hauteur_plafond_m: null });
    expect(dimensionsSeules).toContain("Dimensions");
    expect(dimensionsSeules).not.toContain("Hauteur sous plafond");
  });

  it("montre le plan de situation dans « Utiliser cet espace », avec un lien pour l'agrandir", () => {
    const html = rendre(SALLE, { plan: "https://exemple.test/plan.jpg" });

    expect(html).toContain('src="https://exemple.test/plan.jpg"');
    expect(html).toContain('alt="Plan de situation de Salle commune"');
    expect(html).toMatch(
      /<a[^>]*href="https:\/\/exemple.test\/plan.jpg"[^>]*target="_blank"[^>]*>(?:(?!<\/a>).)*Agrandir le plan/,
    );
    expect(html.indexOf("Utiliser cet espace")).toBeLessThan(
      html.indexOf("Plan de situation"),
    );
  });

  it("sans plan, n'affiche ni image ni lien de plan", () => {
    const html = rendre(SALLE);

    expect(html).not.toContain("Plan de situation");
    expect(html).not.toContain("Agrandir le plan");
  });

  it("propose « Proposer une activité ici » vers Proposer avec le lieu choisi", () => {
    const html = rendre(SALLE);

    expect(html).toMatch(
      /<a[^>]*href="\/proposer\?espace=salle"[^>]*>(?:(?!<\/a>).)*Proposer une activité ici/,
    );
  });

  it("donne le contact et l'heure de fin dans « Utiliser cet espace »", () => {
    const html = rendre(SALLE);

    expect(html).toContain("Utiliser cet espace");
    expect(html).toContain("Colette, gardienne");
    expect(html).toContain("22h00");
  });

  it("garde toutes les consignes dans le document, les deux premières visibles, les autres dans un dépliage fermé", () => {
    const html = rendre(SALLE);

    for (const ligne of [
      "Rangez les chaises.",
      "Éteignez la cuisine.",
      "La musique s&#x27;arrête à 22h.",
      "Signalez toute casse.",
    ])
      expect(html).toContain(ligne);
    // Fermé au chargement, avec son bouton.
    expect(html).toMatch(
      /<button[^>]*aria-expanded="false"[^>]*>(?:(?!<\/button>).)*Lire toutes les consignes/,
    );
    expect(html).toMatch(/class="[^"]*depliage[^"]*"/);
    expect(html).not.toContain("data-ouvert");
    // Le contenu replié n'est ni cliquable ni lu tant que le dépliage est fermé.
    expect(html).toMatch(
      /<div[^>]*inert[^>]*>(?:(?!<\/div>).)*La musique s&#x27;arrête/,
    );
  });

  it("n'a ni bouton ni dépliage quand il y a deux consignes ou moins", () => {
    const html = rendre({ ...SALLE, consignes: "Une.\nDeux." });

    expect(html).toContain("Une.");
    expect(html).not.toContain("Lire toutes les consignes");
    expect(html).not.toContain("depliage");
  });

  it("n'affiche rien d'un champ non renseigné : ni libellé, ni carte vide", () => {
    const html = rendre(COUR);

    expect(html).toMatch(/<h1[^>]*>Cour<\/h1>/);
    for (const absent of [
      "Caractéristiques",
      "Capacité",
      "Dimensions",
      "Hauteur sous plafond",
      "Plan de situation",
      "Horaires d&#x27;accès",
      "Équipements",
      "Consignes",
      "Contact",
      "Bâtiment",
      "<img",
      "<dl",
    ])
      expect(html).not.toContain(absent);
    // Le bouton reste : proposer une activité ici n'exige aucune donnée.
    expect(html).toContain("Proposer une activité ici");
  });

  it("liste les autres espaces, sans celui de la fiche, chacun vers sa fiche", () => {
    const html = rendre(SALLE, { autres: [AUTRE] });

    expect(html).toContain("Autres espaces communs");
    expect(html).toContain('href="/ma-copro/espaces/jardin"');
    expect(html).not.toContain('href="/ma-copro/espaces/salle"');
  });

  it("n'annonce pas d'autres espaces quand il n'y en a pas", () => {
    expect(rendre(SALLE)).not.toContain("Autres espaces");
  });
});
