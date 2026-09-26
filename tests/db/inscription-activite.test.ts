import { describe, expect, it } from "vitest";
import { clientAdmin, IDENTITE, nouveauResident, type Compte } from "./clients";

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

/** Publie une activité au nom de `organisateur`, avec une capacité si `capaciteMax` est donné. */
async function publier(
  organisateur: Compte,
  capaciteMax: number | null = null,
) {
  const { data, error } = await organisateur.client
    .from("activite")
    .insert({
      ...ACTIVITE,
      organisateur: organisateur.id,
      capacite_max: capaciteMax,
    })
    .select("id, identifiant_public")
    .single();
  if (error) throw error;
  return data as { id: string; identifiant_public: string };
}

describe("inscription à une activité", () => {
  it("un résident validé s'inscrit sans accompagnant", async () => {
    const organisateur = await nouveauResident("valide");
    const resident = await nouveauResident("valide");
    const activite = await publier(organisateur);

    const { error } = await resident.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
    });

    expect(error).toBeNull();
    const { data: fiche } = await resident.client
      .rpc("fiche_activite", { identifiant: activite.identifiant_public })
      .single();
    expect(fiche).toMatchObject({ places_prises: 1, mes_accompagnants: 0 });
  });

  it("un résident s'inscrit avec des accompagnants : ils comptent dans la jauge", async () => {
    const organisateur = await nouveauResident("valide");
    const resident = await nouveauResident("valide");
    const activite = await publier(organisateur, 12);

    await resident.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
      p_accompagnants: 2,
    });

    const { data: fiche } = await resident.client
      .rpc("fiche_activite", { identifiant: activite.identifiant_public })
      .single();
    expect(fiche).toMatchObject({ places_prises: 3, mes_accompagnants: 2 });
  });

  it("une activité sans capacité n'a pas de limite de places", async () => {
    const organisateur = await nouveauResident("valide");
    const activite = await publier(organisateur, null);
    const inscrits = await Promise.all(
      Array.from({ length: 5 }, () => nouveauResident("valide")),
    );

    for (const resident of inscrits) {
      const { error } = await resident.client.rpc("s_inscrire", {
        p_identifiant: activite.identifiant_public,
      });
      expect(error).toBeNull();
    }

    const { data: fiche } = await organisateur.client
      .rpc("fiche_activite", { identifiant: activite.identifiant_public })
      .single();
    expect(fiche).toMatchObject({ places_prises: 5, capacite_max: null });
  });

  it("un résident en attente ne peut pas s'inscrire", async () => {
    const organisateur = await nouveauResident("valide");
    const enAttente = await nouveauResident("en_attente");
    const activite = await publier(organisateur);

    const { error } = await enAttente.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
    });

    expect(error).not.toBeNull();
  });

  it("une activité complète refuse une nouvelle inscription", async () => {
    const organisateur = await nouveauResident("valide");
    const activite = await publier(organisateur, 2);
    const premier = await nouveauResident("valide");
    const second = await nouveauResident("valide");

    await premier.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
      p_accompagnants: 1,
    });
    const { error } = await second.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
    });

    expect(error).not.toBeNull();
  });

  it("les accompagnants ne dépassent pas les places restantes", async () => {
    const organisateur = await nouveauResident("valide");
    const activite = await publier(organisateur, 3);
    const resident = await nouveauResident("valide");

    const { error } = await resident.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
      p_accompagnants: 3,
    });

    expect(error).not.toBeNull();
  });

  it("deux inscriptions simultanées sur la dernière place : une seule réussit", async () => {
    const organisateur = await nouveauResident("valide");
    const activite = await publier(organisateur, 1);
    const premier = await nouveauResident("valide");
    const second = await nouveauResident("valide");

    const resultats = await Promise.all([
      premier.client.rpc("s_inscrire", {
        p_identifiant: activite.identifiant_public,
      }),
      second.client.rpc("s_inscrire", {
        p_identifiant: activite.identifiant_public,
      }),
    ]);

    const reussies = resultats.filter((r) => r.error === null);
    const echouees = resultats.filter((r) => r.error !== null);
    expect(reussies).toHaveLength(1);
    expect(echouees).toHaveLength(1);
  });

  it("un résident annule son inscription", async () => {
    const organisateur = await nouveauResident("valide");
    const resident = await nouveauResident("valide");
    const activite = await publier(organisateur);
    await resident.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
    });

    const { error } = await resident.client.rpc("se_desister", {
      p_identifiant: activite.identifiant_public,
    });

    expect(error).toBeNull();
    const { data: fiche } = await resident.client
      .rpc("fiche_activite", { identifiant: activite.identifiant_public })
      .single();
    expect(fiche).toMatchObject({ places_prises: 0, mes_accompagnants: null });
  });

  it("annuler une inscription inexistante échoue", async () => {
    const organisateur = await nouveauResident("valide");
    const resident = await nouveauResident("valide");
    const activite = await publier(organisateur);

    const { error } = await resident.client.rpc("se_desister", {
      p_identifiant: activite.identifiant_public,
    });

    expect(error).not.toBeNull();
  });

  it("un résident validé voit les participants nommés", async () => {
    const organisateur = await nouveauResident("valide");
    const resident = await nouveauResident("valide");
    const activite = await publier(organisateur, 12);
    await resident.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
      p_accompagnants: 1,
    });

    const { data } = await organisateur.client.rpc("participants_activite", {
      identifiant: activite.identifiant_public,
    });

    expect(data).toMatchObject([
      {
        nom_affiche: `${IDENTITE.prenom} ${IDENTITE.nom.charAt(0)}.`,
        accompagnants: 1,
      },
    ]);
  });

  it("un résident refusé ne voit aucun participant", async () => {
    const organisateur = await nouveauResident("valide");
    const resident = await nouveauResident("valide");
    const refuse = await nouveauResident("refuse");
    const activite = await publier(organisateur);
    await resident.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
    });

    const { data } = await refuse.client.rpc("participants_activite", {
      identifiant: activite.identifiant_public,
    });

    expect(data ?? []).toHaveLength(0);
  });

  it("réinscrire met à jour le nombre d'accompagnants plutôt que de dupliquer", async () => {
    const organisateur = await nouveauResident("valide");
    const resident = await nouveauResident("valide");
    const activite = await publier(organisateur, 12);
    await resident.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
      p_accompagnants: 1,
    });

    const { error } = await resident.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
      p_accompagnants: 2,
    });

    expect(error).toBeNull();
    const { count } = await clientAdmin()
      .from("inscription_activite")
      .select("id", { count: "exact", head: true })
      .eq("activite_id", activite.id);
    expect(count).toBe(1);
  });
});

describe("catalogue des activités à venir", () => {
  it("indique mes accompagnants sur une activité où je suis inscrit", async () => {
    const organisateur = await nouveauResident("valide");
    const resident = await nouveauResident("valide");
    const activite = await publier(organisateur, 12);
    await resident.client.rpc("s_inscrire", {
      p_identifiant: activite.identifiant_public,
      p_accompagnants: 1,
    });

    const { data } = await resident.client.rpc("catalogue_activites");

    const ligne = (
      data as { id: string; mes_accompagnants: number | null }[]
    )?.find((a) => a.id === activite.id);
    expect(ligne).toMatchObject({ mes_accompagnants: 1 });
  });

  it("n'indique aucune inscription pour une activité où je ne suis pas inscrit", async () => {
    const organisateur = await nouveauResident("valide");
    const resident = await nouveauResident("valide");
    const activite = await publier(organisateur, 12);

    const { data } = await resident.client.rpc("catalogue_activites");

    const ligne = (
      data as { id: string; mes_accompagnants: number | null }[]
    )?.find((a) => a.id === activite.id);
    expect(ligne).toMatchObject({ mes_accompagnants: null });
  });

  it("un résident refusé ne voit pas le catalogue", async () => {
    const refuse = await nouveauResident("refuse");

    const { data } = await refuse.client.rpc("catalogue_activites");

    expect(data ?? []).toHaveLength(0);
  });
});
