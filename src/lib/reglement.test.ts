import { describe, expect, it } from "vitest";
import {
  decouperTexte,
  dateReglement,
  verifierSection,
  versSection,
} from "./reglement";

const simple = (texte: string) => ({ texte, gras: false });
const gras = (texte: string) => ({ texte, gras: true });

describe("decouperTexte", () => {
  it("sépare les paragraphes à chaque ligne vide", () => {
    expect(decouperTexte("Premier paragraphe.\n\nSecond paragraphe.")).toEqual([
      { type: "paragraphe", morceaux: [simple("Premier paragraphe.")] },
      { type: "paragraphe", morceaux: [simple("Second paragraphe.")] },
    ]);
  });

  it("garde les retours à la ligne simples dans un même paragraphe", () => {
    expect(decouperTexte("Ligne un\nLigne deux")).toEqual([
      { type: "paragraphe", morceaux: [simple("Ligne un\nLigne deux")] },
    ]);
  });

  it("affiche en liste à puces les lignes qui commencent par un tiret", () => {
    expect(decouperTexte("- Musique douce\n- Pas de fête")).toEqual([
      {
        type: "liste",
        elements: [[simple("Musique douce")], [simple("Pas de fête")]],
      },
    ]);
  });

  it("enchaîne un paragraphe et sa liste sans ligne vide entre les deux", () => {
    expect(decouperTexte("Après 22h :\n- silence\n- portes doucement")).toEqual(
      [
        { type: "paragraphe", morceaux: [simple("Après 22h :")] },
        {
          type: "liste",
          elements: [[simple("silence")], [simple("portes doucement")]],
        },
      ],
    );
  });

  it("une ligne vide sépare deux listes", () => {
    expect(decouperTexte("- un\n\n- deux")).toEqual([
      { type: "liste", elements: [[simple("un")]] },
      { type: "liste", elements: [[simple("deux")]] },
    ]);
  });

  it("un tiret collé au mot ne fait pas une puce", () => {
    expect(decouperTexte("-10 degrés au plus")).toEqual([
      { type: "paragraphe", morceaux: [simple("-10 degrés au plus")] },
    ]);
  });

  it("met en gras le texte entre deux étoiles doubles, dans un paragraphe et dans une puce", () => {
    expect(
      decouperTexte("Le **calme** compte.\n\n- **Pas de fête** ici"),
    ).toEqual([
      {
        type: "paragraphe",
        morceaux: [simple("Le "), gras("calme"), simple(" compte.")],
      },
      {
        type: "liste",
        elements: [[gras("Pas de fête"), simple(" ici")]],
      },
    ]);
  });

  it("laisse tel quel un gras jamais refermé", () => {
    expect(decouperTexte("Un **oubli")).toEqual([
      { type: "paragraphe", morceaux: [simple("Un **oubli")] },
    ]);
  });

  it("ne traite jamais le HTML : il reste du texte", () => {
    expect(decouperTexte('<script>alert("x")</script> **<b>y</b>**')).toEqual([
      {
        type: "paragraphe",
        morceaux: [simple('<script>alert("x")</script> '), gras("<b>y</b>")],
      },
    ]);
  });

  it("accepte les fins de ligne Windows et ignore les lignes vides en trop", () => {
    expect(decouperTexte("\r\n\r\nUn\r\n\r\n\r\n\r\nDeux\r\n")).toEqual([
      { type: "paragraphe", morceaux: [simple("Un")] },
      { type: "paragraphe", morceaux: [simple("Deux")] },
    ]);
  });

  it("ne donne rien pour un texte vide", () => {
    expect(decouperTexte("")).toEqual([]);
    expect(decouperTexte("  \n \n")).toEqual([]);
  });
});

describe("verifierSection", () => {
  it("laisse passer un titre et un texte", () => {
    expect(verifierSection({ titre: "Bruit", texte: "Silence." })).toEqual({});
  });

  it("demande un titre, sous le champ titre", () => {
    expect(verifierSection({ titre: "  ", texte: "Silence." })).toEqual({
      champ: "titre",
      erreur: "Donnez un titre à la section.",
    });
  });

  it("demande un texte, sous le champ texte", () => {
    expect(verifierSection({ titre: "Bruit", texte: " \n " })).toEqual({
      champ: "texte",
      erreur: "Écrivez le texte de la section.",
    });
  });

  it("refuse un titre ou un texte trop long, avec la limite", () => {
    expect(
      verifierSection({ titre: "t".repeat(101), texte: "Silence." }),
    ).toEqual({ champ: "titre", erreur: "100 caractères maximum." });
    expect(
      verifierSection({ titre: "Bruit", texte: "a".repeat(5001) }),
    ).toEqual({ champ: "texte", erreur: "5000 caractères maximum." });
  });
});

describe("versSection", () => {
  it("retire les espaces autour du titre et du texte", () => {
    expect(
      versSection({ titre: "  Bruit ", texte: "\n Silence.\n\n" }),
    ).toEqual({ titre: "Bruit", texte: "Silence." });
  });

  it("normalise les fins de ligne Windows", () => {
    expect(versSection({ titre: "Bruit", texte: "Un\r\n\r\nDeux" }).texte).toBe(
      "Un\n\nDeux",
    );
  });
});

describe("dateReglement", () => {
  it("écrit la date en toutes lettres, à l'heure de Paris", () => {
    expect(dateReglement("2026-09-29T10:15:00+00:00")).toBe(
      "29 septembre 2026",
    );
    expect(dateReglement("2026-12-31T23:30:00+00:00")).toBe("1er janvier 2027");
  });
});
