import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avatar } from "./avatar";
import { BoutonVisibilite } from "./bouton-visibilite";
import { EnTeteProfil } from "./en-tete-profil";

describe("BoutonVisibilite", () => {
  it("dit « Visible » et nomme l'information pour le lecteur d'écran", () => {
    const html = renderToStaticMarkup(
      createElement(BoutonVisibilite, {
        libelle: "Téléphone",
        visible: true,
        onClick: () => {},
      }),
    );

    expect(html).toContain("<button");
    expect(html).toContain("Visible");
    expect(html).toContain("Téléphone");
  });

  it("dit « Masqué » quand l'information ne l'est pas", () => {
    const html = renderToStaticMarkup(
      createElement(BoutonVisibilite, {
        libelle: "Étage",
        visible: false,
        onClick: () => {},
      }),
    );

    expect(html).toContain("Masqué");
  });

  it("n'est pas un bouton quand l'information est verrouillée : cadenas, toujours visible", () => {
    const html = renderToStaticMarkup(
      createElement(BoutonVisibilite, {
        libelle: "Pseudo",
        visible: true,
        verrou: true,
      }),
    );

    expect(html).not.toContain("<button");
    expect(html).toContain("Visible");
    expect(html).toContain("Pseudo");
    expect(html).toContain("toujours");
  });
});

describe("Avatar avec photo", () => {
  it("affiche la photo à la place de l'initiale", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { initiale: "D", photo: "/photo.jpg" }),
    );

    expect(html).toContain('src="/photo.jpg"');
    expect(html).not.toContain(">D<");
  });

  it("garde l'initiale sans photo", () => {
    const html = renderToStaticMarkup(createElement(Avatar, { initiale: "D" }));

    expect(html).toContain(">D<");
    expect(html).not.toContain("<img");
  });
});

describe("EnTeteProfil avec photo", () => {
  it("passe la photo à l'avatar", () => {
    const html = renderToStaticMarkup(
      createElement(EnTeteProfil, {
        initiale: "D",
        nom: "Dany",
        photo: "/photo.jpg",
      }),
    );

    expect(html).toContain('src="/photo.jpg"');
    expect(html).toContain("Dany");
  });
});
