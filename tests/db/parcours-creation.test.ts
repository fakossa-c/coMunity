import { describe, expect, it } from "vitest";
import {
  clientAdmin,
  nouveauResident,
  publierApresJev,
  type Compte,
} from "./clients";
import { jourParis } from "./paris";

// Ticket #9 : les champs que le parcours de création en 4 étapes ajoute à une activité.

const ACTIVITE = {
  titre: "Goûter crêpes",
  categorie: "moments_partages" as const,
  pictogramme: "waving_hand",
  date_activite: "2026-10-24",
  heure_debut: "16:00",
  heure_fin: "18:30",
  lieu: "Jardin partagé",
};

const COMPLEMENTS = {
  precision_acces: "Entrée par le portail vert, au fond de la cour.",
  capacite_max: 12,
  capacite_min: 4,
  etiquettes: ["acces_plain_pied", "chaises_prevues", "enfants_bienvenus"],
  mot_accueil: "Venez comme vous êtes, seul ou en famille.",
  conseils_pratiques: "Prévoyez une petite laine, le jardin est à l'ombre.",
  materiel_prevoir: "Tables et poêles fournies.",
  a_apporter: "Une garniture, un jeu de société.",
};

/** Publie une activité au nom de `organisateur` avec `complements`, et renvoie l'erreur ou l'identifiant public. */
async function publier(organisateur: Compte, complements: object) {
  return organisateur.client
    .from("activite")
    .insert({ ...ACTIVITE, ...complements, organisateur: organisateur.id })
    .select("identifiant_public")
    .single();
}

describe("champs du parcours de création", () => {
  it("l'organisateur enregistre capacité, minimum, étiquettes et textes, que la fiche restitue", async () => {
    const resident = await nouveauResident("valide");

    const { data, error } = await publier(resident, COMPLEMENTS);

    expect(error).toBeNull();
    const { data: fiche } = await resident.client
      .rpc("fiche_activite", { identifiant: data!.identifiant_public })
      .single();
    expect(fiche).toMatchObject(COMPLEMENTS);
  });

  it("sans complément, la fiche donne des étiquettes vides et des textes absents", async () => {
    const resident = await nouveauResident("valide");

    const { data } = await publier(resident, {});

    const { data: fiche } = await resident.client
      .rpc("fiche_activite", { identifiant: data!.identifiant_public })
      .single();
    expect(fiche).toMatchObject({
      capacite_max: null,
      capacite_min: null,
      etiquettes: [],
      mot_accueil: null,
      conseils_pratiques: null,
      materiel_prevoir: null,
      a_apporter: null,
      precision_acces: null,
    });
  });

  it("le minimum de participants ne dépasse pas la capacité maximale", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await publier(resident, {
      capacite_max: 5,
      capacite_min: 10,
    });

    expect(error).not.toBeNull();
  });

  it("un minimum sans capacité maximale est accepté", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await publier(resident, { capacite_min: 4 });

    expect(error).toBeNull();
  });

  it("le mot d'accueil est limité à 300 caractères", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await publier(resident, {
      mot_accueil: "x".repeat(301),
    });

    expect(error).not.toBeNull();
  });

  it("la description est limitée à 600 caractères, à la création comme à la modification", async () => {
    const resident = await nouveauResident("valide");

    const { data, error: accepte } = await publier(resident, {
      description: "x".repeat(600),
    });
    const { error: refusee } = await publier(resident, {
      description: "x".repeat(601),
    });
    await publierApresJev(data!.identifiant_public);
    const { error: modification } = await resident.client
      .from("activite")
      .update({ description: "x".repeat(601) })
      .eq("identifiant_public", data!.identifiant_public);

    expect(accepte).toBeNull();
    expect(refusee).not.toBeNull();
    expect(modification).not.toBeNull();
  });

  it("la précision d'accès est limitée à 120 caractères", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await publier(resident, {
      precision_acces: "x".repeat(121),
    });

    expect(error).not.toBeNull();
  });

  it("une étiquette hors des listes fermées est refusée", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await publier(resident, { etiquettes: ["piscine"] });

    expect(error).not.toBeNull();
  });

  it("le catalogue livre les étiquettes de chaque activité", async () => {
    const resident = await nouveauResident("valide");
    const dansUnMois = jourParis(30);
    const { data } = await publier(resident, {
      date_activite: dansUnMois,
      etiquettes: ["ascenseur", "animaux_acceptes"],
    });

    const { data: catalogue, error } = await resident.client.rpc(
      "catalogue_activites",
    );

    expect(error).toBeNull();
    const carte = (
      catalogue as { identifiant_public: string; etiquettes: string[] }[]
    ).find((a) => a.identifiant_public === data!.identifiant_public);
    expect(carte?.etiquettes).toEqual(["ascenseur", "animaux_acceptes"]);
    await clientAdmin()
      .from("activite")
      .delete()
      .eq("organisateur", resident.id);
  });
});
