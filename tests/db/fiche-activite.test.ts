import { describe, expect, it } from "vitest";
import {
  clientAdmin,
  clientVisiteur,
  IDENTITE,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";

const ACTIVITE = {
  titre: "Goûter crêpes",
  categorie: "moments_partages" as const,
  pictogramme: "waving_hand",
  description: "Venez comme vous êtes.",
  date_activite: "2026-10-24",
  heure_debut: "16:00",
  heure_fin: "18:30",
  lieu: "Jardin partagé",
};

/** Publie une activité au nom de `organisateur` et renvoie son identifiant public. */
async function publier(organisateur: Compte) {
  const { data, error } = await organisateur.client
    .from("activite")
    .insert({ ...ACTIVITE, organisateur: organisateur.id })
    .select("identifiant_public")
    .single();
  if (error) throw error;
  return data.identifiant_public as string;
}

describe("identifiant public d'une activité", () => {
  it("chaque activité reçoit un identifiant public court et distinct", async () => {
    const resident = await nouveauResident("valide");

    const premier = await publier(resident);
    const second = await publier(resident);

    expect(premier).toMatch(/^[a-z0-9]{12}$/);
    expect(second).toMatch(/^[a-z0-9]{12}$/);
    expect(premier).not.toBe(second);
  });

  it("l'organisateur ne choisit pas l'identifiant public", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await resident.client.from("activite").insert({
      ...ACTIVITE,
      organisateur: resident.id,
      identifiant_public: "choisi000000",
    });

    expect(error).not.toBeNull();
  });
});

describe("fiche publique d'une activité", () => {
  it("un visiteur lit la fiche par son identifiant public", async () => {
    const resident = await nouveauResident("valide");
    const identifiant = await publier(resident);

    const { data, error } = await clientVisiteur()
      .rpc("fiche_activite", { identifiant })
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      identifiant_public: identifiant,
      titre: ACTIVITE.titre,
      categorie: ACTIVITE.categorie,
      pictogramme: ACTIVITE.pictogramme,
      description: ACTIVITE.description,
      date_activite: ACTIVITE.date_activite,
      heure_debut: "16:00:00",
      heure_fin: "18:30:00",
      lieu: ACTIVITE.lieu,
      proposee_par_syndic: false,
      est_organisateur: false,
    });
  });

  it("un visiteur ne voit aucun nom ni identifiant de personne", async () => {
    const resident = await nouveauResident("valide");
    const identifiant = await publier(resident);

    const { data } = await clientVisiteur()
      .rpc("fiche_activite", { identifiant })
      .single();

    expect(data).toMatchObject({ organisateur_prenom: null });
    const reponse = JSON.stringify(data);
    expect(reponse).not.toContain(IDENTITE.prenom);
    expect(reponse).not.toContain(IDENTITE.nom);
    expect(reponse).not.toContain(resident.id);
    expect(reponse).not.toContain(resident.email);
  });

  it("un visiteur ne lit ni les profils ni la table des activités", async () => {
    const resident = await nouveauResident("valide");
    await publier(resident);
    const visiteur = clientVisiteur();

    const profils = await visiteur.from("profil").select("prenom");
    const activites = await visiteur.from("activite").select("organisateur");

    expect(profils.data ?? []).toHaveLength(0);
    expect(activites.data ?? []).toHaveLength(0);
  });

  it("un résident voit le prénom de l'organisateur", async () => {
    const organisateur = await nouveauResident("valide");
    const voisin = await nouveauResident("en_attente");
    const identifiant = await publier(organisateur);

    const { data } = await voisin.client
      .rpc("fiche_activite", { identifiant })
      .single();

    expect(data).toMatchObject({
      organisateur_prenom: IDENTITE.prenom,
      est_organisateur: false,
    });
  });

  it("un résident refusé ne voit pas le prénom de l'organisateur", async () => {
    const organisateur = await nouveauResident("valide");
    const refuse = await nouveauResident("refuse");
    const identifiant = await publier(organisateur);

    const { data } = await refuse.client
      .rpc("fiche_activite", { identifiant })
      .single();

    expect(data).toMatchObject({ organisateur_prenom: null });
  });

  it("l'organisateur se reconnaît sur sa fiche", async () => {
    const organisateur = await nouveauResident("valide");
    const identifiant = await publier(organisateur);

    const { data } = await organisateur.client
      .rpc("fiche_activite", { identifiant })
      .single();

    expect(data).toMatchObject({ est_organisateur: true });
  });

  it("une activité du syndic est marquée comme telle", async () => {
    const syndic = await nouveauSyndic();
    const identifiant = await publier(syndic);

    const { data } = await clientVisiteur()
      .rpc("fiche_activite", { identifiant })
      .single();

    expect(data).toMatchObject({ proposee_par_syndic: true });
  });

  it("un identifiant inconnu ne renvoie aucune fiche", async () => {
    const { data, error } = await clientVisiteur().rpc("fiche_activite", {
      identifiant: "inconnu00000",
    });

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("l'identifiant interne ne donne pas accès à la fiche", async () => {
    const resident = await nouveauResident("valide");
    await publier(resident);
    const { data: activite } = await clientAdmin()
      .from("activite")
      .select("id")
      .eq("organisateur", resident.id)
      .single();

    const { data } = await clientVisiteur().rpc("fiche_activite", {
      identifiant: activite!.id,
    });

    expect(data).toEqual([]);
  });
});
