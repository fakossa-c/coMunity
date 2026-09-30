import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReglementInterieur } from "./reglement-interieur";

const SECTIONS = [
  {
    id: "bruit",
    titre: "Bruit et tranquillité",
    texte: "Le calme est **essentiel**.\n\n- Musique douce\n- Pas de fête",
  },
  { id: "dechets", titre: "Déchets", texte: "Triez vos déchets." },
];

function rendre(
  sections = SECTIONS,
  misAJourLe: string | null = "2026-09-29T10:15:00+00:00",
) {
  return renderToStaticMarkup(
    createElement(ReglementInterieur, {
      sections,
      misAJourLe,
      ancreEspaces: "#titre-espaces-communs",
    }),
  );
}

describe("ReglementInterieur", () => {
  it("présente les sections dans l'ordre, repliées, avec leur titre", () => {
    const html = rendre();

    expect(html.indexOf("Bruit et tranquillité")).toBeLessThan(
      html.indexOf("Déchets"),
    );
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(html).not.toContain('aria-expanded="true"');
    // Le texte est dans le document mais masqué tant que la section est repliée.
    expect(html.match(/role="region"[^>]*hidden/g)).toHaveLength(2);
  });

  it("lie chaque titre à son texte pour le lecteur d'écran", () => {
    const html = rendre();

    const controle = /aria-controls="([^"]+)"/.exec(html)![1];
    expect(html).toContain(`id="${controle}"`);
    // Sous l'intertitre « Règlement intérieur » de Ma copro : les sections sont des titres de niveau 3.
    expect(html).toContain("<h3");
    expect(html).not.toContain("<h2");
  });

  it("propose « Tout déplier » et la date de dernière mise à jour", () => {
    const html = rendre();

    expect(html).toContain("Tout déplier");
    expect(html).toContain("Mis à jour le 29 septembre 2026");
  });

  it("rend paragraphes, liste à puces et gras", () => {
    const html = rendre();

    expect(html).toContain("<strong>essentiel</strong>");
    expect(html).toContain("<ul");
    expect(html).toContain("<li>Musique douce</li>");
    expect(html).toContain("Triez vos déchets.");
  });

  it("n'injecte jamais de HTML, ni dans le texte ni dans le titre", () => {
    const html = rendre([
      {
        id: "piege",
        titre: "<img src=x onerror=alert(1)>",
        texte: '<script>alert("x")</script>\n\n- <b>gras ?</b>',
      },
    ]);

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("dit clairement qu'il n'y a pas encore de règlement, sans bouton ni date", () => {
    const html = rendre([], null);

    expect(html).toContain(
      "Le conseil syndical n&#x27;a pas encore publié le règlement intérieur.",
    );
    expect(html).not.toContain("Tout déplier");
    expect(html).not.toContain("Mis à jour");
  });

  it("porte un sommaire nommé, réservé à l'ordinateur : lien vers les espaces communs d'abord, puis les sections dans l'ordre", () => {
    const html = rendre();

    const sommaire =
      /<nav[^>]*aria-label="Sommaire du règlement"[^>]*>[\s\S]*?<\/nav>/.exec(
        html,
      )![0];
    expect(sommaire).toMatch(/class="[^"]*\bhidden\b[^"]*desktop:block/);
    expect(sommaire).toContain('href="#titre-espaces-communs"');
    expect(sommaire).toContain("Espaces communs");
    expect(sommaire.indexOf("Espaces communs")).toBeLessThan(
      sommaire.indexOf("Bruit et tranquillité"),
    );
    expect(sommaire.indexOf("Bruit et tranquillité")).toBeLessThan(
      sommaire.indexOf("Déchets"),
    );
    // Des liens vers les sections : ils ne doublent pas les boutons des titres.
    expect(sommaire).not.toContain("<button");
    expect((sommaire.match(/<a /g) ?? []).length).toBe(3);
  });
});
