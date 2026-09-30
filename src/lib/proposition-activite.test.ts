import { describe, expect, it } from "vitest";
import type { Avertissement } from "@/assistant";
import {
  LIEU_LIBRE,
  LIMITES,
  SAISIE_VIDE,
  appliquerSuggestions,
  avertissementsApplicables,
  blocageDeLEtape,
  changerCategorie,
  descriptionPourAssistant,
  entreeJevDe,
  espaceDeLAdresse,
  pictogrammeDeLaSaisie,
  propositionDe,
  resteARemplir,
  saisieDeCopie,
  saisieDepuisActivite,
  verifierEtape,
  verifierPage,
  versNouvelleActivite,
  type SaisieActivite,
} from "./proposition-activite";

const COMPLETE: SaisieActivite = {
  ...SAISIE_VIDE,
  titre: "Goûter crêpes",
  categorie: "moments_partages",
  description: "Crêpes sucrées et salées, jeux de société pour tous.",
  mot_accueil: "Venez comme vous êtes.",
  date_activite: "2026-10-24",
  heure_debut: "16:00",
  heure_fin: "18:30",
  espace_commun: LIEU_LIBRE,
  lieu: "Jardin partagé",
  precision_acces: "Portail vert",
  places: "limitees",
  capacite_max: "12",
  capacite_min: "4",
  etiquettes: ["acces_plain_pied", "enfants_bienvenus"],
  conseils_pratiques: "Une petite laine.",
  materiel_prevoir: "Poêles fournies.",
  a_apporter: "Une garniture.",
};

describe("limites de saisie", () => {
  it("titre 50, description 600, précision d'accès 120, mot d'accueil 300", () => {
    expect(LIMITES).toEqual({
      titre: 50,
      description: 600,
      precision_acces: 120,
      mot_accueil: 300,
    });
  });
});

describe("saisie de départ", () => {
  it("une nouvelle activité démarre avec un minimum d'un participant", () => {
    expect(SAISIE_VIDE.capacite_min).toBe("1");
  });
});

describe("vérification d'une étape", () => {
  it("une saisie complète passe les trois étapes", () => {
    expect(verifierEtape(1, COMPLETE)).toEqual({});
    expect(verifierEtape(2, COMPLETE)).toEqual({});
    expect(verifierEtape(3, COMPLETE)).toEqual({});
  });

  it("étape 1 : le titre est obligatoire", () => {
    expect(verifierEtape(1, { ...COMPLETE, titre: "   " })).toMatchObject({
      champ: "titre",
    });
  });

  it("étape 1 : le titre tient en 50 caractères", () => {
    expect(
      verifierEtape(1, { ...COMPLETE, titre: "x".repeat(51) }),
    ).toMatchObject({ champ: "titre" });
  });

  it("étape 1 : la description tient en 600 caractères, 600 passent", () => {
    expect(
      verifierEtape(1, { ...COMPLETE, description: "x".repeat(600) }),
    ).toEqual({});
    expect(
      verifierEtape(1, { ...COMPLETE, description: "x".repeat(601) }),
    ).toEqual({ champ: "description", erreur: "600 caractères maximum." });
  });

  it("étape 1 : une description vide est permise", () => {
    expect(verifierEtape(1, { ...COMPLETE, description: "" })).toEqual({});
  });

  it("étape 1 : le mot d'accueil tient en 300 caractères", () => {
    expect(
      verifierEtape(1, { ...COMPLETE, mot_accueil: "x".repeat(301) }),
    ).toMatchObject({ champ: "mot_accueil" });
  });

  it("étape 2 : date, heures et lieu sont obligatoires", () => {
    expect(verifierEtape(2, { ...COMPLETE, date_activite: "" })).toMatchObject({
      champ: "date_activite",
    });
    expect(verifierEtape(2, { ...COMPLETE, heure_debut: "" })).toMatchObject({
      champ: "heure_debut",
    });
    expect(verifierEtape(2, { ...COMPLETE, lieu: " " })).toMatchObject({
      champ: "lieu",
    });
  });

  it("étape 2 : l'heure de fin suit l'heure de début", () => {
    expect(
      verifierEtape(2, {
        ...COMPLETE,
        heure_debut: "18:00",
        heure_fin: "16:00",
      }),
    ).toMatchObject({
      champ: "heure_fin",
      erreur: "L'heure de fin doit être après l'heure de début.",
    });
  });

  it("étape 2 : la précision d'accès tient en 120 caractères", () => {
    expect(
      verifierEtape(2, { ...COMPLETE, precision_acces: "x".repeat(121) }),
    ).toMatchObject({ champ: "precision_acces" });
  });

  it("étape 3 : des places limitées demandent un nombre", () => {
    expect(verifierEtape(3, { ...COMPLETE, capacite_max: "" })).toMatchObject({
      champ: "capacite_max",
    });
    expect(verifierEtape(3, { ...COMPLETE, capacite_max: "0" })).toMatchObject({
      champ: "capacite_max",
    });
  });

  it("étape 3 : le minimum ne dépasse pas la capacité", () => {
    expect(
      verifierEtape(3, { ...COMPLETE, capacite_max: "5", capacite_min: "10" }),
    ).toMatchObject({ champ: "capacite_min" });
  });

  it("étape 3 : sans limite de places, le nombre saisi est ignoré et le minimum reste libre", () => {
    expect(
      verifierEtape(3, {
        ...COMPLETE,
        places: "sans_limite",
        capacite_max: "",
        capacite_min: "30",
      }),
    ).toEqual({});
  });
});

describe("conversion vers l'activité à publier", () => {
  it("reprend la saisie, avec les nombres convertis et le pictogramme de la catégorie", () => {
    expect(versNouvelleActivite(COMPLETE)).toEqual({
      titre: "Goûter crêpes",
      categorie: "moments_partages",
      pictogramme: "waving_hand",
      description: "Crêpes sucrées et salées, jeux de société pour tous.",
      mot_accueil: "Venez comme vous êtes.",
      date_activite: "2026-10-24",
      heure_debut: "16:00",
      heure_fin: "18:30",
      espace_commun_id: null,
      lieu: "Jardin partagé",
      precision_acces: "Portail vert",
      capacite_max: 12,
      capacite_min: 4,
      etiquettes: ["acces_plain_pied", "enfants_bienvenus"],
      conseils_pratiques: "Une petite laine.",
      materiel_prevoir: "Poêles fournies.",
      a_apporter: "Une garniture.",
    });
  });

  it("les champs vides deviennent null, sans limite de places donne une capacité nulle", () => {
    expect(
      versNouvelleActivite({
        ...COMPLETE,
        places: "sans_limite",
        capacite_max: "12",
        capacite_min: "",
        precision_acces: "  ",
        description: "   ",
        mot_accueil: "",
        conseils_pratiques: "",
        materiel_prevoir: "",
        a_apporter: "",
        etiquettes: [],
      }),
    ).toMatchObject({
      capacite_max: null,
      capacite_min: null,
      precision_acces: null,
      description: null,
      mot_accueil: null,
      conseils_pratiques: null,
      materiel_prevoir: null,
      a_apporter: null,
      etiquettes: [],
    });
  });
});

/** Une activité telle que la base la livre : heures avec secondes, champs absents à `null`. */
const EXISTANTE = {
  titre: "Goûter crêpes",
  categorie: "moments_partages" as const,
  pictogramme: "waving_hand",
  description: "Crêpes sucrées et salées, jeux de société pour tous.",
  mot_accueil: "Venez comme vous êtes.",
  date_activite: "2026-10-24",
  heure_debut: "16:00:00",
  heure_fin: "18:30:00",
  espace_commun_id: null,
  lieu: "Jardin partagé",
  precision_acces: "Portail vert",
  capacite_max: 12,
  capacite_min: 4,
  etiquettes: ["acces_plain_pied" as const, "enfants_bienvenus" as const],
  conseils_pratiques: "Une petite laine.",
  materiel_prevoir: null,
  a_apporter: null,
};

describe("saisie pré-remplie depuis une activité existante", () => {
  it("modifier reprend tout, heures sans les secondes, places limitées", () => {
    expect(saisieDepuisActivite(EXISTANTE)).toEqual({
      titre: "Goûter crêpes",
      categorie: "moments_partages",
      pictogramme: "",
      description: "Crêpes sucrées et salées, jeux de société pour tous.",
      mot_accueil: "Venez comme vous êtes.",
      date_activite: "2026-10-24",
      heure_debut: "16:00",
      heure_fin: "18:30",
      espace_commun: LIEU_LIBRE,
      lieu: "Jardin partagé",
      precision_acces: "Portail vert",
      places: "limitees",
      capacite_max: "12",
      capacite_min: "4",
      etiquettes: ["acces_plain_pied", "enfants_bienvenus"],
      conseils_pratiques: "Une petite laine.",
      materiel_prevoir: "",
      a_apporter: "",
    });
  });

  it("sans capacité ni minimum : places sans limite et champs vides", () => {
    const saisie = saisieDepuisActivite({
      ...EXISTANTE,
      capacite_max: null,
      capacite_min: null,
      precision_acces: null,
      description: null,
      mot_accueil: null,
    });

    expect(saisie).toMatchObject({
      places: "sans_limite",
      capacite_max: "",
      capacite_min: "",
      precision_acces: "",
      description: "",
      mot_accueil: "",
    });
  });

  it("dupliquer reprend tout sauf la date", () => {
    expect(saisieDeCopie(EXISTANTE)).toEqual({
      ...saisieDepuisActivite(EXISTANTE),
      date_activite: "",
    });
  });

  it("la saisie rechargée se republie telle quelle", () => {
    expect(versNouvelleActivite(saisieDepuisActivite(EXISTANTE))).toMatchObject(
      {
        titre: "Goûter crêpes",
        heure_debut: "16:00",
        capacite_max: 12,
        capacite_min: 4,
        materiel_prevoir: null,
      },
    );
  });
});

describe("capacité et personnes déjà inscrites", () => {
  const limitees = (max: string): SaisieActivite => ({
    ...COMPLETE,
    places: "limitees",
    capacite_max: max,
    capacite_min: "",
  });

  it("refuse une capacité sous les personnes inscrites, sous le champ concerné", () => {
    expect(verifierEtape(3, limitees("4"), { placesPrises: 5 })).toEqual({
      champ: "capacite_max",
      erreur: "Indiquez au moins 5 places : elles sont déjà prises.",
    });
  });

  it("une seule personne inscrite : la capacité minimale est 1", () => {
    expect(verifierEtape(3, limitees("1"), { placesPrises: 1 })).toEqual({});
  });

  it("accepte une capacité égale aux personnes inscrites", () => {
    expect(verifierEtape(3, limitees("5"), { placesPrises: 5 })).toEqual({});
  });

  it("des places sans limite ne posent jamais problème", () => {
    expect(
      verifierEtape(
        3,
        { ...COMPLETE, places: "sans_limite" },
        { placesPrises: 50 },
      ),
    ).toEqual({});
  });
});

describe("lieu : espace commun ou lieu libre", () => {
  const SALLE = { id: "salle", nom: "Salle commune" };
  const dansLaSalle: SaisieActivite = {
    ...COMPLETE,
    espace_commun: "salle",
    lieu: "",
  };

  it("étape 2 : il faut choisir un espace commun ou « Autre »", () => {
    expect(verifierEtape(2, { ...COMPLETE, espace_commun: "" })).toEqual({
      champ: "espace_commun",
      erreur: "Choisissez où se tient l'activité.",
    });
  });

  it("étape 2 : un espace commun choisi n'a pas besoin de lieu libre", () => {
    expect(verifierEtape(2, dansLaSalle)).toEqual({});
  });

  it("publie l'espace commun choisi, avec son nom comme lieu", () => {
    expect(versNouvelleActivite(dansLaSalle, [SALLE])).toMatchObject({
      espace_commun_id: "salle",
      lieu: "Salle commune",
    });
  });

  it("« Autre » publie le lieu libre, sans espace commun", () => {
    expect(versNouvelleActivite(COMPLETE, [SALLE])).toMatchObject({
      espace_commun_id: null,
      lieu: "Jardin partagé",
    });
  });

  it("modifier une activité d'un espace commun le reprend, sans lieu libre", () => {
    expect(
      saisieDepuisActivite({
        ...EXISTANTE,
        espace_commun_id: "salle",
        lieu: "Salle commune",
      }),
    ).toMatchObject({ espace_commun: "salle", lieu: "" });
  });

  it("l'assistant reçoit l'espace commun, ou le lieu libre, et les places", () => {
    expect(propositionDe(dansLaSalle)).toEqual({
      titre: "Goûter crêpes",
      description:
        "Crêpes sucrées et salées, jeux de société pour tous.\n\nVenez comme vous êtes.",
      categorie: "moments_partages",
      date: "2026-10-24",
      heureDebut: "16:00",
      heureFin: "18:30",
      lieu: { type: "espace_commun", idEspace: "salle" },
      capaciteMax: 12,
    });
    expect(propositionDe(COMPLETE).lieu).toEqual({
      type: "libre",
      libelle: "Jardin partagé",
    });
  });
});

describe("règles bloquantes de l'assistant dans le parcours", () => {
  const heureLimite: Avertissement = {
    regle: "heure_fin_max",
    bloquant: true,
    message: "L'espace ferme à 21h00.",
  };
  const capacite: Avertissement = {
    regle: "capacite_espace",
    bloquant: true,
    message: "L'espace accueille 20 personnes au plus.",
  };
  const calme: Avertissement = {
    regle: "heure_calme",
    bloquant: false,
    message: "Pensez aux voisins.",
  };

  it("étape 2 : l'heure limite de l'espace s'affiche sous l'heure de fin", () => {
    expect(
      blocageDeLEtape(2, [calme, heureLimite, capacite], COMPLETE),
    ).toEqual({ champ: "heure_fin", erreur: "L'espace ferme à 21h00." });
  });

  it("étape 3 : la capacité de l'espace s'affiche sous le nombre de places", () => {
    expect(blocageDeLEtape(3, [heureLimite, capacite], COMPLETE)).toEqual({
      champ: "capacite_max",
      erreur: "L'espace accueille 20 personnes au plus.",
    });
  });

  it("étape 3 : sans limite de places, elle s'affiche en tête de l'étape", () => {
    expect(
      blocageDeLEtape(3, [capacite], { ...COMPLETE, places: "sans_limite" }),
    ).toEqual({ erreur: "L'espace accueille 20 personnes au plus." });
  });

  it("récapitulatif : toute règle bloquante empêche de publier", () => {
    expect(blocageDeLEtape(4, [calme, capacite], COMPLETE)).toEqual({
      erreur: "L'espace accueille 20 personnes au plus.",
    });
  });

  it("un simple avertissement ne bloque aucune étape", () => {
    expect(blocageDeLEtape(2, [calme], COMPLETE)).toEqual({});
    expect(blocageDeLEtape(4, [calme], COMPLETE)).toEqual({});
  });
});

describe("règles d'un espace commun en modification", () => {
  const capacite: Avertissement = {
    regle: "capacite_espace",
    bloquant: true,
    message: "L'espace commun accueille 10 personnes au plus.",
  };
  const reference: SaisieActivite = { ...COMPLETE, espace_commun: "salle" };

  it("à la création, une règle bloquante bloque", () => {
    expect(avertissementsApplicables([capacite], reference)).toEqual([
      capacite,
    ]);
  });

  it("une modification qui ne touche ni l'espace, ni l'heure de fin, ni les places n'est plus bloquée", () => {
    expect(
      avertissementsApplicables(
        [capacite],
        { ...reference, titre: "Nouveau titre" },
        reference,
      ),
    ).toEqual([{ ...capacite, bloquant: false }]);
  });

  it("une modification de l'espace, de l'heure de fin ou des places reste bloquée", () => {
    for (const changement of [
      { espace_commun: "cour" },
      { heure_fin: "19:00" },
      { capacite_max: "15" },
    ]) {
      expect(
        avertissementsApplicables(
          [capacite],
          { ...reference, ...changement },
          reference,
        ),
      ).toEqual([capacite]);
    }
  });
});

describe("pictogramme de l'activité", () => {
  it("par défaut, celui de la catégorie", () => {
    expect(pictogrammeDeLaSaisie(COMPLETE)).toBe("waving_hand");
    expect(versNouvelleActivite(COMPLETE).pictogramme).toBe("waving_hand");
  });

  it("un pictogramme choisi prime sur celui de la catégorie", () => {
    const saisie = { ...COMPLETE, pictogramme: "kitchen" };

    expect(pictogrammeDeLaSaisie(saisie)).toBe("kitchen");
    expect(versNouvelleActivite(saisie).pictogramme).toBe("kitchen");
  });

  it("modifier reprend un pictogramme propre à l'activité, pas celui de sa catégorie", () => {
    expect(
      saisieDepuisActivite({ ...EXISTANTE, pictogramme: "kitchen" })
        .pictogramme,
    ).toBe("kitchen");
    expect(saisieDepuisActivite(EXISTANTE).pictogramme).toBe("");
  });

  it("changer de catégorie rend le pictogramme de la nouvelle catégorie", () => {
    const saisie = changerCategorie(
      { ...COMPLETE, pictogramme: "kitchen" },
      "jardin_nature",
    );

    expect(saisie.categorie).toBe("jardin_nature");
    expect(pictogrammeDeLaSaisie(saisie)).toBe("potted_plant");
  });
});

describe("suggestions de l'assistant appliquées à la saisie", () => {
  const rien = { categorie: false, pictogramme: false };
  const avis = (
    categorieSuggeree: string | null,
    pictogrammeSuggere: string | null,
  ) => ({ categorieSuggeree, pictogrammeSuggere });

  it("présélectionne la catégorie et le pictogramme suggérés", () => {
    const saisie = appliquerSuggestions(
      COMPLETE,
      avis("culture_loisirs", "kitchen"),
      rien,
    );

    expect(saisie.categorie).toBe("culture_loisirs");
    expect(pictogrammeDeLaSaisie(saisie)).toBe("kitchen");
  });

  it("sans suggestion, ne change rien", () => {
    expect(appliquerSuggestions(COMPLETE, avis(null, null), rien)).toEqual(
      COMPLETE,
    );
  });

  it("une catégorie suggérée sans pictogramme rend celui de la catégorie", () => {
    const saisie = appliquerSuggestions(
      { ...COMPLETE, pictogramme: "kitchen" },
      avis("jardin_nature", null),
      rien,
    );

    expect(pictogrammeDeLaSaisie(saisie)).toBe("potted_plant");
  });

  it("un pictogramme suggéré qui est celui de la catégorie n'est pas retenu à part", () => {
    const saisie = appliquerSuggestions(
      COMPLETE,
      avis("jardin_nature", "potted_plant"),
      rien,
    );

    expect(saisie.pictogramme).toBe("");
  });

  it("laisse la catégorie que le créateur a choisie", () => {
    const saisie = appliquerSuggestions(
      { ...COMPLETE, categorie: "entraide_partage" },
      avis("culture_loisirs", "kitchen"),
      { categorie: true, pictogramme: false },
    );

    expect(saisie.categorie).toBe("entraide_partage");
    expect(pictogrammeDeLaSaisie(saisie)).toBe("kitchen");
  });

  it("laisse le pictogramme que le créateur a gardé", () => {
    const saisie = appliquerSuggestions(
      COMPLETE,
      avis("culture_loisirs", "kitchen"),
      { categorie: false, pictogramme: true },
    );

    expect(saisie.categorie).toBe("culture_loisirs");
    expect(pictogrammeDeLaSaisie(saisie)).toBe("menu_book");
  });
});

describe("description et mot d'accueil pour l'assistant", () => {
  it("l'assistant lit la description, puis le mot d'accueil", () => {
    expect(descriptionPourAssistant(COMPLETE)).toBe(
      "Crêpes sucrées et salées, jeux de société pour tous.\n\nVenez comme vous êtes.",
    );
  });

  it("un seul des deux textes suffit, sans ligne vide en trop", () => {
    expect(descriptionPourAssistant({ ...COMPLETE, mot_accueil: "  " })).toBe(
      "Crêpes sucrées et salées, jeux de société pour tous.",
    );
    expect(descriptionPourAssistant({ ...COMPLETE, description: "" })).toBe(
      "Venez comme vous êtes.",
    );
    expect(
      descriptionPourAssistant({
        ...COMPLETE,
        description: "",
        mot_accueil: "",
      }),
    ).toBe("");
  });

  it("Jev reçoit les deux textes, bornés à la somme des deux limites", () => {
    expect(entreeJevDe(COMPLETE).description).toBe(
      descriptionPourAssistant(COMPLETE),
    );
    expect(LIMITES.description + LIMITES.mot_accueil).toBe(900);
  });
});

describe("vérification de la page entière", () => {
  it("une saisie complète passe", () => {
    expect(verifierPage(COMPLETE)).toEqual({});
  });

  it("rend la première erreur, dans l'ordre de la page", () => {
    expect(
      verifierPage({ ...COMPLETE, titre: "", date_activite: "" }),
    ).toMatchObject({ champ: "titre" });
    expect(
      verifierPage({ ...COMPLETE, date_activite: "", espace_commun: "" }),
    ).toMatchObject({ champ: "date_activite" });
    expect(
      verifierPage({ ...COMPLETE, places: "limitees", capacite_max: "" }),
    ).toMatchObject({ champ: "capacite_max" });
  });

  it("une description trop longue est refusée avant la date", () => {
    expect(
      verifierPage({
        ...COMPLETE,
        description: "x".repeat(601),
        date_activite: "",
      }),
    ).toMatchObject({ champ: "description" });
  });

  it("garde le plancher des places déjà prises en modification", () => {
    expect(
      verifierPage(
        { ...COMPLETE, places: "limitees", capacite_max: "3" },
        { placesPrises: 5 },
      ),
    ).toMatchObject({ champ: "capacite_max" });
  });
});

describe("« Il reste à remplir »", () => {
  const vide = SAISIE_VIDE;

  it("une nouvelle activité a tout à remplir : titre, date et heure, lieu, puis la description conseillée", () => {
    expect(resteARemplir(vide)).toEqual([
      {
        cle: "titre",
        libelle: "Titre",
        fait: false,
        obligatoire: true,
        etat: "à saisir",
        bloc: "titre-description",
      },
      {
        cle: "date_heure",
        libelle: "Date et heure",
        fait: false,
        obligatoire: true,
        etat: "à choisir",
        bloc: "date-heure",
      },
      {
        cle: "lieu",
        libelle: "Lieu",
        fait: false,
        obligatoire: true,
        etat: "à choisir",
        bloc: "lieu",
      },
      {
        cle: "description",
        libelle: "Description",
        fait: false,
        obligatoire: false,
        etat: "conseillée",
        bloc: "titre-description",
      },
    ]);
  });

  it("une saisie complète n'a plus rien d'obligatoire à remplir", () => {
    const points = resteARemplir(COMPLETE);
    expect(points.every((point) => point.fait)).toBe(true);
    expect(points.map((point) => point.etat)).toEqual(["", "", "", ""]);
  });

  it("« Autre lieu » sans nom demande de le nommer", () => {
    const lieu = resteARemplir({
      ...COMPLETE,
      espace_commun: LIEU_LIBRE,
      lieu: " ",
    }).find((point) => point.cle === "lieu");
    expect(lieu).toMatchObject({ fait: false, etat: "à nommer" });
  });

  it("un espace commun choisi suffit pour le lieu", () => {
    const lieu = resteARemplir({
      ...COMPLETE,
      espace_commun: "salle",
      lieu: "",
    }).find((point) => point.cle === "lieu");
    expect(lieu).toMatchObject({ fait: true });
  });

  it("la date sans heure de début ou de fin n'est pas faite", () => {
    const date = (saisie: SaisieActivite) =>
      resteARemplir(saisie).find((point) => point.cle === "date_heure");
    expect(date({ ...COMPLETE, heure_fin: "" })).toMatchObject({
      fait: false,
      etat: "à choisir",
    });
    expect(date({ ...COMPLETE, date_activite: "" })).toMatchObject({
      fait: false,
    });
  });

  it("des places limitées sans nombre s'ajoutent à la liste", () => {
    const points = resteARemplir({
      ...COMPLETE,
      places: "limitees",
      capacite_max: "",
    });
    expect(points.find((point) => point.cle === "places")).toMatchObject({
      fait: false,
      obligatoire: true,
      etat: "à indiquer",
      bloc: "precisions",
    });
    expect(
      resteARemplir(COMPLETE).some((point) => point.cle === "places"),
    ).toBe(false);
  });
});

describe("paramètre d'adresse `espace`", () => {
  const ESPACES = [{ id: "salle" }, { id: "jardin" }];

  it("un identifiant d'espace commun de la résidence préchoisit le lieu", () => {
    expect(espaceDeLAdresse(ESPACES, "jardin")).toBe("jardin");
  });

  it("un identifiant inconnu, vide ou absent est ignoré", () => {
    expect(espaceDeLAdresse(ESPACES, "inconnu")).toBe("");
    expect(espaceDeLAdresse(ESPACES, "")).toBe("");
    expect(espaceDeLAdresse(ESPACES, undefined)).toBe("");
    expect(espaceDeLAdresse([], "jardin")).toBe("");
  });
});
