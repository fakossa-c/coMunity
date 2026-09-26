import { describe, expect, it } from "vitest";
import { clientVisiteur, nouveauResident, type Compte } from "./clients";

// Ticket #12 : le créateur modifie, annule ou supprime son activité ; une activité avec des
// inscrits est annulée plutôt que supprimée, et les inscrits le voient.

const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const ilYAUnMois = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const ACTIVITE = {
  titre: "Goûter crêpes",
  categorie: "moments_partages" as const,
  pictogramme: "waving_hand",
  date_activite: dansUnMois,
  heure_debut: "16:00",
  heure_fin: "18:30",
  lieu: "Jardin partagé",
};

/** Publie une activité au nom de `organisateur` et renvoie son identifiant public. */
async function publier(organisateur: Compte, complements: object = {}) {
  const { data, error } = await organisateur.client
    .from("activite")
    .insert({ ...ACTIVITE, ...complements, organisateur: organisateur.id })
    .select("identifiant_public")
    .single();
  if (error) throw error;
  return data.identifiant_public as string;
}

async function inscrire(resident: Compte, identifiant: string, avec = 0) {
  const { error } = await resident.client.rpc("s_inscrire", {
    p_identifiant: identifiant,
    p_accompagnants: avec,
  });
  if (error) throw error;
}

function fiche(lecteur: Compte, identifiant: string) {
  return lecteur.client.rpc("fiche_activite", { identifiant }).maybeSingle();
}

describe("modification par le créateur", () => {
  it("le créateur modifie sa propre activité, capacité comprise", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await publier(createur, { capacite_max: 12 });

    const { data, error } = await createur.client
      .from("activite")
      .update({ titre: "Goûter crêpes et jeux", capacite_max: 20 })
      .eq("identifiant_public", identifiant)
      .select("identifiant_public");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const { data: apres } = await fiche(createur, identifiant);
    expect(apres).toMatchObject({
      titre: "Goûter crêpes et jeux",
      capacite_max: 20,
    });
  });

  it("la capacité ne descend pas sous le nombre de personnes inscrites, accompagnants compris", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    const identifiant = await publier(createur, { capacite_max: 10 });
    await inscrire(voisin, identifiant, 2);

    const trop = await createur.client
      .from("activite")
      .update({ capacite_max: 2 })
      .eq("identifiant_public", identifiant);
    expect(trop.error?.code).toBe("P0005");

    const juste = await createur.client
      .from("activite")
      .update({ capacite_max: 3 })
      .eq("identifiant_public", identifiant);
    expect(juste.error).toBeNull();
    const { data: apres } = await fiche(createur, identifiant);
    expect(apres).toMatchObject({ capacite_max: 3, places_prises: 3 });
  });

  it("retirer la capacité reste possible même avec des inscrits", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    const identifiant = await publier(createur, { capacite_max: 10 });
    await inscrire(voisin, identifiant, 2);

    const { error } = await createur.client
      .from("activite")
      .update({ capacite_max: null })
      .eq("identifiant_public", identifiant);

    expect(error).toBeNull();
  });

  it("un résident ne modifie pas l'activité d'un autre", async () => {
    const createur = await nouveauResident("valide");
    const intrus = await nouveauResident("valide");
    const identifiant = await publier(createur);

    const { data } = await intrus.client
      .from("activite")
      .update({ titre: "Détourné" })
      .eq("identifiant_public", identifiant)
      .select("identifiant_public");

    expect(data).toEqual([]);
    const { data: apres } = await fiche(createur, identifiant);
    expect(apres).toMatchObject({ titre: ACTIVITE.titre });
  });

  it("une activité annulée ne se modifie plus", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await publier(createur);
    await createur.client.rpc("annuler_activite", {
      p_identifiant: identifiant,
    });

    const { data } = await createur.client
      .from("activite")
      .update({ titre: "Trop tard" })
      .eq("identifiant_public", identifiant)
      .select("identifiant_public");

    expect(data).toEqual([]);
  });

  it("le statut ne se change pas par une modification directe", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await publier(createur);

    const { error } = await createur.client
      .from("activite")
      .update({ statut: "annulee" })
      .eq("identifiant_public", identifiant);

    expect(error).not.toBeNull();
  });
});

describe("annulation", () => {
  it("le créateur annule : la fiche et le catalogue des inscrits le montrent, leur inscription reste", async () => {
    const createur = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const identifiant = await publier(createur);
    await inscrire(inscrit, identifiant);

    const { error } = await createur.client.rpc("annuler_activite", {
      p_identifiant: identifiant,
    });

    expect(error).toBeNull();
    const { data: vue } = await fiche(inscrit, identifiant);
    expect(vue).toMatchObject({ statut: "annulee", mes_accompagnants: 0 });
    const { data: catalogue } = await inscrit.client.rpc("catalogue_activites");
    expect(catalogue).toContainEqual(
      expect.objectContaining({
        identifiant_public: identifiant,
        statut: "annulee",
      }),
    );
  });

  it("une activité annulée disparaît du catalogue de qui n'y est pas inscrit", async () => {
    const createur = await nouveauResident("valide");
    const passant = await nouveauResident("valide");
    const identifiant = await publier(createur);
    await createur.client.rpc("annuler_activite", {
      p_identifiant: identifiant,
    });

    const { data: catalogue } = await passant.client.rpc("catalogue_activites");

    expect(
      catalogue?.map(
        (a: { identifiant_public: string }) => a.identifiant_public,
      ),
    ).not.toContain(identifiant);
  });

  it("on ne s'inscrit plus à une activité annulée", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    const identifiant = await publier(createur);
    await createur.client.rpc("annuler_activite", {
      p_identifiant: identifiant,
    });

    const { error } = await voisin.client.rpc("s_inscrire", {
      p_identifiant: identifiant,
      p_accompagnants: 0,
    });

    expect(error?.code).toBe("P0004");
  });

  it("un résident n'annule pas l'activité d'un autre", async () => {
    const createur = await nouveauResident("valide");
    const intrus = await nouveauResident("valide");
    const identifiant = await publier(createur);

    const { error } = await intrus.client.rpc("annuler_activite", {
      p_identifiant: identifiant,
    });

    expect(error?.code).toBe("42501");
    const { data } = await fiche(createur, identifiant);
    expect(data).toMatchObject({ statut: "publiee" });
  });
});

describe("suppression", () => {
  it("sans inscrit, le créateur supprime son activité", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await publier(createur);

    const { error } = await createur.client.rpc("supprimer_activite", {
      p_identifiant: identifiant,
    });

    expect(error).toBeNull();
    const { data } = await fiche(createur, identifiant);
    expect(data).toBeNull();
  });

  it("avec des inscrits, la suppression est refusée : il faut annuler", async () => {
    const createur = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const identifiant = await publier(createur);
    await inscrire(inscrit, identifiant);

    const { error } = await createur.client.rpc("supprimer_activite", {
      p_identifiant: identifiant,
    });

    expect(error?.code).toBe("P0006");
    const { data } = await fiche(createur, identifiant);
    expect(data).not.toBeNull();
  });

  it("un résident ne supprime pas l'activité d'un autre", async () => {
    const createur = await nouveauResident("valide");
    const intrus = await nouveauResident("valide");
    const identifiant = await publier(createur);

    const { error } = await intrus.client.rpc("supprimer_activite", {
      p_identifiant: identifiant,
    });

    expect(error?.code).toBe("42501");
    const { data } = await fiche(createur, identifiant);
    expect(data).not.toBeNull();
  });

  it("aucune suppression directe sur la table, même pour le créateur", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await publier(createur);

    const { error } = await createur.client
      .from("activite")
      .delete()
      .eq("identifiant_public", identifiant);

    expect(error).not.toBeNull();
    const { data } = await fiche(createur, identifiant);
    expect(data).not.toBeNull();
  });
});

describe("activités que j'organise", () => {
  it("livre les activités du créateur, à venir et passées, avec leur statut et leurs inscrits", async () => {
    const createur = await nouveauResident("valide");
    const autre = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const avenir = await publier(createur);
    const passee = await publier(createur, { date_activite: ilYAUnMois });
    const annulee = await publier(createur);
    const dUnAutre = await publier(autre);
    await inscrire(inscrit, avenir, 1);
    await createur.client.rpc("annuler_activite", { p_identifiant: annulee });

    const { data, error } = await createur.client.rpc(
      "mes_activites_organisees",
    );

    expect(error).toBeNull();
    const parIdentifiant = new Map(
      (data as { identifiant_public: string }[]).map((a) => [
        a.identifiant_public,
        a,
      ]),
    );
    expect(parIdentifiant.get(avenir)).toMatchObject({
      statut: "publiee",
      places_prises: 2,
    });
    expect(parIdentifiant.get(passee)).toMatchObject({
      date_activite: ilYAUnMois,
    });
    expect(parIdentifiant.get(annulee)).toMatchObject({ statut: "annulee" });
    expect(parIdentifiant.has(dUnAutre)).toBe(false);
  });

  it("ne livre rien à un visiteur", async () => {
    const { data } = await clientVisiteur().rpc("mes_activites_organisees");

    expect(data ?? []).toEqual([]);
  });
});
