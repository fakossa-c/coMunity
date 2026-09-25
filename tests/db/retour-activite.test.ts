import { describe, expect, it } from "vitest";
import {
  clientAdmin,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";

const ACTIVITE_PASSEE = {
  titre: "Atelier compost",
  categorie: "jardin_nature" as const,
  pictogramme: "compost",
  description: "On apprend à composter ensemble.",
  date_activite: "2020-01-04",
  heure_debut: "10:00",
  heure_fin: "12:00",
  lieu: "Jardin partagé",
};

const ACTIVITE_A_VENIR = {
  ...ACTIVITE_PASSEE,
  date_activite: "2099-01-04",
};

/** Publie une activité au nom de `organisateur`, passée par défaut. */
async function publier(
  organisateur: Compte,
  donnees: typeof ACTIVITE_PASSEE = ACTIVITE_PASSEE,
) {
  const { data, error } = await organisateur.client
    .from("activite")
    .insert({ ...donnees, organisateur: organisateur.id })
    .select("id, identifiant_public")
    .single();
  if (error) throw error;
  return data as { id: string; identifiant_public: string };
}

/** Inscrit `resident` à l'activité, en contournant le RLS d'écriture via la RPC. */
async function inscrire(resident: Compte, identifiantPublic: string) {
  const { error } = await resident.client.rpc("s_inscrire", {
    p_identifiant: identifiantPublic,
  });
  if (error) throw error;
}

describe("laisser un retour sur une activité passée", () => {
  it("un participant laisse un retour après la fin de l'activité", async () => {
    const organisateur = await nouveauResident("valide");
    const participant = await nouveauResident("valide");
    const activite = await publier(organisateur);
    await inscrire(participant, activite.identifiant_public);

    const { error } = await participant.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 4,
      p_commentaire: "Très sympa, à refaire.",
    });

    expect(error).toBeNull();
  });

  it("un participant ne peut pas laisser de retour avant la fin de l'activité", async () => {
    const organisateur = await nouveauResident("valide");
    const participant = await nouveauResident("valide");
    const activite = await publier(organisateur, ACTIVITE_A_VENIR);
    await inscrire(participant, activite.identifiant_public);

    const { error } = await participant.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 5,
      p_commentaire: "Anticipé.",
    });

    expect(error).not.toBeNull();
  });

  it("quelqu'un qui n'était pas inscrit ne peut pas laisser de retour", async () => {
    const organisateur = await nouveauResident("valide");
    const nonInscrit = await nouveauResident("valide");
    const activite = await publier(organisateur);

    const { error } = await nonInscrit.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 3,
      p_commentaire: "Je n'y étais pas.",
    });

    expect(error).not.toBeNull();
  });

  it("un participant ne laisse qu'un seul retour par activité : le second écrase le premier", async () => {
    const organisateur = await nouveauResident("valide");
    const participant = await nouveauResident("valide");
    const activite = await publier(organisateur);
    await inscrire(participant, activite.identifiant_public);
    await participant.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 2,
      p_commentaire: "Mitigé.",
    });

    const { error } = await participant.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 5,
      p_commentaire: "Finalement très bien.",
    });

    expect(error).toBeNull();
    const { count } = await clientAdmin()
      .from("retour")
      .select("id", { count: "exact", head: true })
      .eq("activite_id", activite.id);
    expect(count).toBe(1);
  });

  it("une note hors de 1 à 5 est refusée", async () => {
    const organisateur = await nouveauResident("valide");
    const participant = await nouveauResident("valide");
    const activite = await publier(organisateur);
    await inscrire(participant, activite.identifiant_public);

    const { error } = await participant.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 6,
      p_commentaire: "Excessif.",
    });

    expect(error).not.toBeNull();
  });
});

describe("lire les retours d'une activité", () => {
  it("l'organisateur voit la note moyenne et les commentaires", async () => {
    const organisateur = await nouveauResident("valide");
    const premier = await nouveauResident("valide");
    const second = await nouveauResident("valide");
    const activite = await publier(organisateur);
    await inscrire(premier, activite.identifiant_public);
    await inscrire(second, activite.identifiant_public);
    await premier.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 4,
      p_commentaire: "Chouette moment.",
    });
    await second.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 2,
      p_commentaire: "Un peu court.",
    });

    const { data, error } = await organisateur.client
      .rpc("retours_activite", { identifiant: activite.identifiant_public })
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({ note_moyenne: 3 });
    const retours = (
      data as { commentaires: { commentaire: string; note: number }[] }
    ).commentaires;
    expect(retours).toHaveLength(2);
    expect(retours.map((r) => r.commentaire).sort()).toEqual(
      ["Chouette moment.", "Un peu court."].sort(),
    );
  });

  it("le conseil syndical voit la note moyenne et les commentaires", async () => {
    const organisateur = await nouveauResident("valide");
    const participant = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const activite = await publier(organisateur);
    await inscrire(participant, activite.identifiant_public);
    await participant.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 5,
      p_commentaire: "Parfait.",
    });

    const { data, error } = await syndic.client
      .rpc("retours_activite", { identifiant: activite.identifiant_public })
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({ note_moyenne: 5 });
  });

  it("un simple participant ne voit pas les retours des autres", async () => {
    const organisateur = await nouveauResident("valide");
    const premier = await nouveauResident("valide");
    const second = await nouveauResident("valide");
    const activite = await publier(organisateur);
    await inscrire(premier, activite.identifiant_public);
    await inscrire(second, activite.identifiant_public);
    await premier.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 4,
      p_commentaire: "Chouette moment.",
    });

    const { data, error } = await second.client
      .rpc("retours_activite", { identifiant: activite.identifiant_public })
      .single();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("mon_retour indique le retour déjà laissé par la personne connectée", async () => {
    const organisateur = await nouveauResident("valide");
    const participant = await nouveauResident("valide");
    const activite = await publier(organisateur);
    await inscrire(participant, activite.identifiant_public);
    await participant.client.rpc("laisser_retour", {
      p_identifiant: activite.identifiant_public,
      p_note: 4,
      p_commentaire: "Chouette moment.",
    });

    const { data } = await participant.client
      .rpc("fiche_activite", { identifiant: activite.identifiant_public })
      .single();

    expect(data).toMatchObject({
      mon_retour_note: 4,
      mon_retour_commentaire: "Chouette moment.",
    });
  });

  it("mon_retour est nul tant qu'aucun retour n'a été laissé", async () => {
    const organisateur = await nouveauResident("valide");
    const participant = await nouveauResident("valide");
    const activite = await publier(organisateur);
    await inscrire(participant, activite.identifiant_public);

    const { data } = await participant.client
      .rpc("fiche_activite", { identifiant: activite.identifiant_public })
      .single();

    expect(data).toMatchObject({
      mon_retour_note: null,
      mon_retour_commentaire: null,
    });
  });
});
