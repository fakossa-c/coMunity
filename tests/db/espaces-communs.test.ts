import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";

// Ticket #11 : les espaces communs de la résidence, gérés par le conseil syndical, l'heure de
// calme, et les règles bloquantes que la base applique à une activité tenue dans un espace commun.

const espacesCrees: string[] = [];

afterAll(async () => {
  await clientAdmin().from("espace_commun").delete().in("id", espacesCrees);
});

function nomUnique(nom: string) {
  return `${nom} ${randomUUID().slice(0, 6)}`;
}

const SALLE = {
  batiment: "Bâtiment B",
  localisation: "Rez-de-chaussée, à gauche du hall",
  description: "Une grande pièce claire avec une cuisine.",
  capacite: 20,
  equipements: ["acces_plain_pied", "chaises", "cuisine"],
  heure_fin_max: "21:00:00",
  consignes: "Laissez la salle propre et fermez les fenêtres.",
  horaires_acces: "Tous les jours de 9h à 21h",
  contact: "Colette, gardienne : 06 12 34 56 78",
};

/** Un espace commun créé par `syndic`, avec les champs de `SALLE` sauf mention contraire. */
async function nouvelEspace(syndic: Compte, champs: object = {}) {
  const { data, error } = await syndic.client
    .from("espace_commun")
    .insert({ nom: nomUnique("Salle commune"), ...SALLE, ...champs })
    .select()
    .single();
  if (error) throw error;
  espacesCrees.push(data.id);
  return data as { id: string; nom: string };
}

const ACTIVITE = {
  titre: "Goûter crêpes",
  categorie: "moments_partages" as const,
  pictogramme: "waving_hand",
  date_activite: "2026-10-24",
  heure_debut: "16:00",
  heure_fin: "18:00",
  lieu: "Salle commune",
  capacite_max: 12,
};

/** Publie une activité au nom de `organisateur`, et renvoie l'erreur ou la ligne créée. */
async function publier(organisateur: Compte, champs: object) {
  return organisateur.client
    .from("activite")
    .insert({ ...ACTIVITE, ...champs, organisateur: organisateur.id })
    .select("identifiant_public, lieu, espace_commun_id")
    .single();
}

describe("espaces communs : qui lit, qui écrit", () => {
  it("le conseil syndical crée un espace commun avec tous ses champs", async () => {
    const syndic = await nouveauSyndic();

    const espace = await nouvelEspace(syndic);

    expect(espace).toMatchObject(SALLE);
  });

  it("un résident validé ou en attente lit les espaces communs", async () => {
    const syndic = await nouveauSyndic();
    const espace = await nouvelEspace(syndic);

    for (const statut of ["valide", "en_attente"] as const) {
      const resident = await nouveauResident(statut);
      const { data } = await resident.client
        .from("espace_commun")
        .select("nom, consignes")
        .eq("id", espace.id);
      expect(data).toEqual([{ nom: espace.nom, consignes: SALLE.consignes }]);
    }
  });

  it("un résident refusé ou retiré, et un visiteur, n'en lisent aucun", async () => {
    const syndic = await nouveauSyndic();
    const espace = await nouvelEspace(syndic);

    for (const statut of ["refuse", "retire"] as const) {
      const resident = await nouveauResident(statut);
      const { data } = await resident.client
        .from("espace_commun")
        .select("id")
        .eq("id", espace.id);
      expect(data).toEqual([]);
    }
    const { data } = await clientVisiteur()
      .from("espace_commun")
      .select("id")
      .eq("id", espace.id);
    expect(data ?? []).toEqual([]);
  });

  it("un résident ne crée, ne modifie ni ne supprime un espace commun", async () => {
    const syndic = await nouveauSyndic();
    const espace = await nouvelEspace(syndic);
    const resident = await nouveauResident("valide");

    const creation = await resident.client
      .from("espace_commun")
      .insert({ nom: nomUnique("Ma salle") });
    await resident.client
      .from("espace_commun")
      .update({ nom: "Renommée" })
      .eq("id", espace.id);
    await resident.client.from("espace_commun").delete().eq("id", espace.id);

    expect(creation.error).not.toBeNull();
    const { data } = await clientAdmin()
      .from("espace_commun")
      .select("nom")
      .eq("id", espace.id)
      .single();
    expect(data?.nom).toBe(espace.nom);
  });

  it("le conseil syndical modifie puis supprime un espace commun", async () => {
    const syndic = await nouveauSyndic();
    const espace = await nouvelEspace(syndic);

    const modification = await syndic.client
      .from("espace_commun")
      .update({ capacite: 30, heure_fin_max: null })
      .eq("id", espace.id)
      .select("capacite, heure_fin_max")
      .single();
    const suppression = await syndic.client
      .from("espace_commun")
      .delete()
      .eq("id", espace.id)
      .select("id");

    expect(modification.data).toEqual({ capacite: 30, heure_fin_max: null });
    expect(suppression.data).toHaveLength(1);
  });

  it("un équipement hors de la liste fermée est refusé", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await syndic.client
      .from("espace_commun")
      .insert({ nom: nomUnique("Piscine"), equipements: ["plongeoir"] });

    expect(error).not.toBeNull();
  });
});

describe("heure de calme de la résidence", () => {
  it("le conseil syndical la règle, un résident non", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const admin = clientAdmin();

    try {
      await resident.client
        .from("residence")
        .update({ heure_calme: "20:00" })
        .eq("id", true);
      const apresResident = await admin
        .from("residence")
        .select("heure_calme")
        .single();
      const { error } = await syndic.client
        .from("residence")
        .update({ heure_calme: "21:30" })
        .eq("id", true);
      const apresSyndic = await admin
        .from("residence")
        .select("heure_calme")
        .single();

      expect(apresResident.data?.heure_calme).toBe("22:00:00");
      expect(error).toBeNull();
      expect(apresSyndic.data?.heure_calme).toBe("21:30:00");
    } finally {
      await admin
        .from("residence")
        .update({ heure_calme: "22:00" })
        .eq("id", true);
    }
  });
});

describe("activité dans un espace commun", () => {
  it("prend le nom de l'espace comme lieu, et la fiche donne ses consignes", async () => {
    const syndic = await nouveauSyndic();
    const espace = await nouvelEspace(syndic);
    const resident = await nouveauResident("valide");

    const { data, error } = await publier(resident, {
      espace_commun_id: espace.id,
      lieu: "Nom saisi à la main",
    });

    expect(error).toBeNull();
    expect(data?.lieu).toBe(espace.nom);
    const { data: fiche } = await clientVisiteur()
      .rpc("fiche_activite", { identifiant: data!.identifiant_public })
      .single();
    expect(fiche).toMatchObject({
      lieu: espace.nom,
      espace_commun_id: espace.id,
      consignes_espace: SALLE.consignes,
    });
  });

  it("un lieu libre n'a ni espace ni consignes", async () => {
    const resident = await nouveauResident("valide");

    const { data } = await publier(resident, { lieu: "Chez Danielle" });

    const { data: fiche } = await resident.client
      .rpc("fiche_activite", { identifiant: data!.identifiant_public })
      .single();
    expect(fiche).toMatchObject({
      lieu: "Chez Danielle",
      espace_commun_id: null,
      consignes_espace: null,
    });
  });

  it("refuse un créneau qui finit après l'heure de fin maximale de l'espace", async () => {
    const syndic = await nouveauSyndic();
    const espace = await nouvelEspace(syndic);
    const resident = await nouveauResident("valide");

    const trop = await publier(resident, {
      espace_commun_id: espace.id,
      heure_fin: "21:30",
    });
    const pile = await publier(resident, {
      espace_commun_id: espace.id,
      heure_fin: "21:00",
    });

    expect(trop.error?.code).toBe("P0007");
    expect(pile.error).toBeNull();
  });

  it("refuse plus de places que l'espace n'en accueille, ou pas de limite", async () => {
    const syndic = await nouveauSyndic();
    const espace = await nouvelEspace(syndic);
    const resident = await nouveauResident("valide");

    const trop = await publier(resident, {
      espace_commun_id: espace.id,
      capacite_max: 25,
    });
    const sansLimite = await publier(resident, {
      espace_commun_id: espace.id,
      capacite_max: null,
    });

    expect(trop.error?.code).toBe("P0008");
    expect(sansLimite.error?.code).toBe("P0008");
  });

  it("un lieu libre échappe aux règles des espaces communs", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await publier(resident, {
      lieu: "Salle commune",
      heure_fin: "23:30",
      capacite_max: null,
    });

    expect(error).toBeNull();
  });

  it("une modification est vérifiée aussi, sauf si elle ne touche ni le créneau ni l'espace ni les places", async () => {
    const syndic = await nouveauSyndic();
    const espace = await nouvelEspace(syndic);
    const resident = await nouveauResident("valide");
    const { data } = await publier(resident, { espace_commun_id: espace.id });
    // Le conseil syndical avance l'heure de fermeture après la publication.
    await syndic.client
      .from("espace_commun")
      .update({ heure_fin_max: "17:00" })
      .eq("id", espace.id);

    const titre = await resident.client
      .from("activite")
      .update({ ...ACTIVITE, titre: "Goûter crêpes et jeux" })
      .eq("identifiant_public", data!.identifiant_public);
    const creneau = await resident.client
      .from("activite")
      .update({ heure_fin: "18:30" })
      .eq("identifiant_public", data!.identifiant_public);

    expect(titre.error).toBeNull();
    expect(creneau.error?.code).toBe("P0007");
  });

  it("renommer l'espace renomme le lieu de ses activités ; le supprimer leur laisse son nom", async () => {
    const syndic = await nouveauSyndic();
    const espace = await nouvelEspace(syndic);
    const resident = await nouveauResident("valide");
    const { data } = await publier(resident, { espace_commun_id: espace.id });
    const nouveauNom = nomUnique("Salle des fêtes");
    const admin = clientAdmin();
    const lire = () =>
      admin
        .from("activite")
        .select("lieu, espace_commun_id")
        .eq("identifiant_public", data!.identifiant_public)
        .single();

    await syndic.client
      .from("espace_commun")
      .update({ nom: nouveauNom })
      .eq("id", espace.id);
    const renommee = await lire();
    await syndic.client.from("espace_commun").delete().eq("id", espace.id);
    const supprimee = await lire();

    expect(renommee.data).toEqual({
      lieu: nouveauNom,
      espace_commun_id: espace.id,
    });
    expect(supprimee.data).toEqual({
      lieu: nouveauNom,
      espace_commun_id: null,
    });
  });
});
