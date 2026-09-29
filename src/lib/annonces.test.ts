import { describe, expect, it } from "vitest";
import {
  cheminAnnonce,
  cheminDeDepot,
  estCheminDeFichier,
  estExpiree,
  estNouvelle,
  filtreAnnonce,
  infosAnnonce,
  libelleDocument,
  libellePublication,
  messageWhatsAppAnnonce,
  saisieCopie,
  saisieDepuisAnnonce,
  typesDuFiltre,
  verifierAnnonce,
  verifierFichier,
  versLigneAnnonce,
  type Annonce,
  type SaisieAnnonce,
} from "./annonces";

/** Une annonce telle que la base la livre : champs absents à `null`. */
const ANNONCE: Annonce = {
  id: "a1",
  identifiant_public: "k3m9x2q7ab4d",
  type: "assemblee",
  titre: "Assemblée générale annuelle",
  texte: "L'ordre du jour est disponible.",
  quand: "Jeudi 12 novembre à 18h30",
  lieu: "Salle commune",
  photo_chemin: null,
  document_chemin: "a1/convocation.pdf",
  epinglee: true,
  expire_le: "2026-11-13",
  publiee_le: "2026-10-20T08:30:00+00:00",
};

const SAISIE: SaisieAnnonce = {
  type: "travaux",
  titre: "  Rénovation du hall  ",
  texte: "L'entrée se fait par la cour.",
  quand: "Du 2 au 20 novembre",
  lieu: "",
  epinglee: false,
  expire_le: "2026-11-20",
  photo_chemin: null,
  document_chemin: null,
};

describe("filtres de la liste", () => {
  it("chaque filtre garde ses types ; « Travaux & infos » en réunit deux", () => {
    expect(typesDuFiltre("toutes")).toBeNull();
    expect(typesDuFiltre("assemblees")).toEqual(["assemblee"]);
    expect(typesDuFiltre("sondages")).toEqual(["sondage"]);
    expect(typesDuFiltre("travaux-infos")).toEqual(["travaux", "info"]);
  });

  it("un paramètre inconnu ou absent donne « Toutes »", () => {
    expect(filtreAnnonce("sondages")).toBe("sondages");
    expect(filtreAnnonce("n'importe quoi")).toBe("toutes");
    expect(filtreAnnonce(undefined)).toBe("toutes");
  });

  it("un nom hérité de tout objet ne passe pas pour un filtre", () => {
    expect(filtreAnnonce("constructor")).toBe("toutes");
    expect(filtreAnnonce("toString")).toBe("toutes");
    expect(filtreAnnonce("__proto__")).toBe("toutes");
  });
});

describe("étiquette « Nouveau »", () => {
  const publiee = "2026-10-20T08:30:00+00:00";

  it("une annonce est nouvelle pendant les 7 jours qui suivent sa publication", () => {
    expect(estNouvelle(publiee, new Date("2026-10-20T09:00:00Z"))).toBe(true);
    expect(estNouvelle(publiee, new Date("2026-10-27T08:29:00Z"))).toBe(true);
  });

  it("elle ne l'est plus au bout de 7 jours", () => {
    expect(estNouvelle(publiee, new Date("2026-10-27T08:30:00Z"))).toBe(false);
    expect(estNouvelle(publiee, new Date("2026-12-01T00:00:00Z"))).toBe(false);
  });
});

describe("expiration", () => {
  it("le jour d'expiration, l'annonce n'est pas encore expirée", () => {
    expect(estExpiree("2026-11-13", "2026-11-13")).toBe(false);
    expect(estExpiree("2026-11-13", "2026-11-14")).toBe(true);
  });

  it("sans date, elle n'expire pas", () => {
    expect(estExpiree(null, "2030-01-01")).toBe(false);
  });
});

describe("carte d'une annonce", () => {
  it("date la publication au jour de la résidence, pas au jour UTC", () => {
    expect(libellePublication("2026-10-19T23:30:00+00:00")).toBe(
      "Publiée le 20 octobre par le conseil syndical",
    );
    expect(libellePublication("2026-12-19T23:30:00+00:00")).toBe(
      "Publiée le 20 décembre par le conseil syndical",
    );
  });

  it("dit qui publie, avec le mot du glossaire", () => {
    expect(libellePublication("2026-10-20T08:30:00+00:00")).toBe(
      "Publiée le 20 octobre par le conseil syndical",
    );
  });

  it("montre la date puis le lieu, chacun sur sa ligne", () => {
    expect(infosAnnonce(ANNONCE)).toEqual([
      { icone: "event", titre: "Jeudi 12 novembre à 18h30" },
      { icone: "location_on", titre: "Salle commune" },
    ]);
  });

  it("une période de travaux prend le pictogramme des dates", () => {
    expect(
      infosAnnonce({
        ...ANNONCE,
        type: "travaux",
        quand: "Du 2 au 20 novembre",
        lieu: null,
      }),
    ).toEqual([{ icone: "date_range", titre: "Du 2 au 20 novembre" }]);
  });

  it("sans date ni lieu, aucune ligne", () => {
    expect(infosAnnonce({ ...ANNONCE, quand: null, lieu: null })).toEqual([]);
  });

  it("le bouton du PDF s'appelle « Lire la convocation » pour une assemblée", () => {
    expect(libelleDocument("assemblee")).toBe("Lire la convocation");
    expect(libelleDocument("travaux")).toBe("Lire le document");
  });
});

describe("partage d'une annonce", () => {
  it("le chemin public tient l'identifiant", () => {
    expect(cheminAnnonce("k3m9x2q7ab4d")).toBe("/annonces/k3m9x2q7ab4d");
  });

  it("le message WhatsApp donne le titre, les infos et le lien", () => {
    expect(
      messageWhatsAppAnnonce(
        ANNONCE,
        "https://comunity.test/annonces/k3m9x2q7ab4d",
      ),
    ).toBe(
      [
        "📢 Assemblée générale annuelle",
        "📅 Jeudi 12 novembre à 18h30",
        "📍 Salle commune",
        "https://comunity.test/annonces/k3m9x2q7ab4d",
      ].join("\n"),
    );
  });

  it("le message omet les lignes vides", () => {
    expect(
      messageWhatsAppAnnonce(
        { ...ANNONCE, quand: null, lieu: null },
        "https://comunity.test/annonces/x",
      ),
    ).toBe("📢 Assemblée générale annuelle\nhttps://comunity.test/annonces/x");
  });
});

describe("saisie d'une annonce", () => {
  it("une saisie complète passe", () => {
    expect(verifierAnnonce(SAISIE, "2026-10-20")).toEqual({});
  });

  it("le titre est obligatoire", () => {
    expect(verifierAnnonce({ ...SAISIE, titre: "  " }, "2026-10-20")).toEqual({
      champ: "titre",
      erreur: "Donnez un titre à l'annonce.",
    });
  });

  it("chaque texte respecte la longueur de la base", () => {
    expect(
      verifierAnnonce({ ...SAISIE, titre: "a".repeat(101) }, "2026-10-20"),
    ).toEqual({ champ: "titre", erreur: "100 caractères maximum." });
    expect(
      verifierAnnonce({ ...SAISIE, texte: "a".repeat(2001) }, "2026-10-20"),
    ).toEqual({ champ: "texte", erreur: "2000 caractères maximum." });
    expect(
      verifierAnnonce({ ...SAISIE, quand: "a".repeat(121) }, "2026-10-20"),
    ).toEqual({ champ: "quand", erreur: "120 caractères maximum." });
  });

  it("l'expiration ne peut pas être déjà passée", () => {
    expect(
      verifierAnnonce({ ...SAISIE, expire_le: "2026-10-19" }, "2026-10-20"),
    ).toEqual({
      champ: "expire_le",
      erreur:
        "Cette date est déjà passée : l'annonce n'apparaîtrait nulle part.",
    });
    expect(
      verifierAnnonce({ ...SAISIE, expire_le: "2026-10-20" }, "2026-10-20"),
    ).toEqual({});
  });

  it("une annonce expirée s'enregistre tant que sa date d'expiration ne change pas", () => {
    const expiree = { ...SAISIE, expire_le: "2026-10-01" };
    expect(verifierAnnonce(expiree, "2026-10-20", "2026-10-01")).toEqual({});
    expect(verifierAnnonce(expiree, "2026-10-20", "2026-09-01")).toEqual({
      champ: "expire_le",
      erreur:
        "Cette date est déjà passée : l'annonce n'apparaîtrait nulle part.",
    });
  });

  it("la saisie devient une ligne : textes nettoyés, vides à null", () => {
    expect(versLigneAnnonce(SAISIE)).toEqual({
      type: "travaux",
      titre: "Rénovation du hall",
      texte: "L'entrée se fait par la cour.",
      quand: "Du 2 au 20 novembre",
      lieu: null,
      epinglee: false,
      expire_le: "2026-11-20",
      photo_chemin: null,
      document_chemin: null,
    });
    expect(versLigneAnnonce({ ...SAISIE, expire_le: "" }).expire_le).toBeNull();
  });

  it("modifier une annonce préremplit la saisie", () => {
    expect(saisieDepuisAnnonce(ANNONCE)).toEqual({
      type: "assemblee",
      titre: "Assemblée générale annuelle",
      texte: "L'ordre du jour est disponible.",
      quand: "Jeudi 12 novembre à 18h30",
      lieu: "Salle commune",
      epinglee: true,
      expire_le: "2026-11-13",
      photo_chemin: null,
      document_chemin: "a1/convocation.pdf",
    });
  });

  it("dupliquer garde le contenu, mais ni l'épingle ni l'échéance", () => {
    expect(saisieCopie(ANNONCE)).toEqual({
      ...saisieDepuisAnnonce(ANNONCE),
      epinglee: false,
      expire_le: "",
    });
  });
});

describe("fichiers joints", () => {
  const MO = 1024 * 1024;

  it("accepte une photo JPEG, PNG ou WebP de 5 Mo au plus", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(verifierFichier({ type, size: 2 * MO }, "photo")).toBeNull();
    }
    expect(verifierFichier({ type: "image/jpeg", size: 6 * MO }, "photo")).toBe(
      "Ce fichier pèse plus de 5 Mo.",
    );
    expect(
      verifierFichier({ type: "application/pdf", size: MO }, "photo"),
    ).toBe("Choisissez une photo au format JPEG, PNG ou WebP.");
  });

  it("accepte un document PDF de 5 Mo au plus", () => {
    expect(
      verifierFichier({ type: "application/pdf", size: MO }, "document"),
    ).toBeNull();
    expect(verifierFichier({ type: "image/png", size: MO }, "document")).toBe(
      "Choisissez un document au format PDF.",
    );
    expect(
      verifierFichier({ type: "application/pdf", size: 6 * MO }, "document"),
    ).toBe("Ce fichier pèse plus de 5 Mo.");
  });
});

describe("chemin d'un fichier déposé", () => {
  const ID = "0b9a8c1e-5d2f-4a7b-9c3d-1e2f3a4b5c6d";

  it("garde le nom du fichier, nettoyé, dans un dossier qui lui est propre", () => {
    expect(
      cheminDeDepot(ID, "Convocation AG 2026.pdf", "application/pdf"),
    ).toBe(`${ID}/convocation-ag-2026.pdf`);
    expect(cheminDeDepot(ID, "Été à la cour.JPG", "image/jpeg")).toBe(
      `${ID}/ete-a-la-cour.jpg`,
    );
  });

  it("l'extension suit le format réel, pas le nom donné", () => {
    expect(cheminDeDepot(ID, "photo.exe", "image/png")).toBe(`${ID}/photo.png`);
    expect(cheminDeDepot(ID, "!!!", "application/pdf")).toBe(
      `${ID}/fichier.pdf`,
    );
  });

  it("ne reconnaît que les chemins que l'app a produits", () => {
    expect(estCheminDeFichier(`${ID}/convocation.pdf`)).toBe(true);
    expect(estCheminDeFichier("../secret.pdf")).toBe(false);
    expect(estCheminDeFichier(`${ID}/../autre/x.pdf`)).toBe(false);
    expect(estCheminDeFichier(`${ID}/Convocation.pdf`)).toBe(false);
    expect(estCheminDeFichier("https://exemple.fr/x.pdf")).toBe(false);
  });
});
