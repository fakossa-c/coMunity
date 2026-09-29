import { describe, expect, it } from "vitest";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";

// Ticket #101 : une activité n'est jamais publique avant l'avis de Jev. Créée ou modifiée par son
// créateur avec sa session (clé publiable), elle passe en relecture ; seul le serveur, avec la clé
// secrète, la publie ou la laisse au conseil syndical une fois Jev entendu.

const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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

/** Ce que fait le parcours de création : une insertion avec la session du créateur. */
async function creer(createur: Compte, complements: object = {}) {
  const { data, error } = await createur.client
    .from("activite")
    .insert({ ...ACTIVITE, ...complements, organisateur: createur.id })
    .select("id, identifiant_public")
    .single();
  if (error) throw error;
  return data as { id: string; identifiant_public: string };
}

/** Ce que fait le serveur une fois Jev entendu : sans raison il publie, avec une raison il laisse en relecture. */
function conclure(identifiant: string, raison: string | null = null) {
  return clientAdmin().rpc("conclure_pre_moderation", {
    p_identifiant: identifiant,
    p_raison: raison,
  });
}

/** Une activité créée puis publiée, comme un Jev sans objection. */
async function creerEtPublier(createur: Compte, complements: object = {}) {
  const activite = await creer(createur, complements);
  const { error } = await conclure(activite.identifiant_public);
  if (error) throw error;
  return activite.identifiant_public;
}

function fiche(
  lecteur: Compte | ReturnType<typeof clientVisiteur>,
  identifiant: string,
) {
  const client = "client" in lecteur ? lecteur.client : lecteur;
  return client.rpc("fiche_activite", { identifiant }).maybeSingle();
}

async function statutDe(identifiant: string) {
  const { data } = await clientAdmin()
    .from("activite")
    .select("statut")
    .eq("identifiant_public", identifiant)
    .single();
  return data?.statut as string;
}

describe("la création", () => {
  it("met l'activité en relecture d'emblée : le créateur la voit, un voisin et un visiteur non", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");

    const { identifiant_public } = await creer(createur);

    expect(await statutDe(identifiant_public)).toBe("en_relecture");
    expect((await fiche(createur, identifiant_public)).data).toMatchObject({
      statut: "en_relecture",
    });
    expect((await fiche(voisin, identifiant_public)).data).toBeNull();
    expect((await fiche(clientVisiteur(), identifiant_public)).data).toBeNull();
  });

  it("met aussi en relecture l'activité d'un membre du syndic", async () => {
    const syndic = await nouveauSyndic();

    const { identifiant_public } = await creer(syndic);

    expect(await statutDe(identifiant_public)).toBe("en_relecture");
  });

  it("n'apparaît pas au catalogue d'un voisin avant la conclusion", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    const { identifiant_public } = await creer(createur);

    const { data } = await voisin.client.rpc("catalogue_activites");

    expect(
      (data as { identifiant_public: string }[]).map(
        (a) => a.identifiant_public,
      ),
    ).not.toContain(identifiant_public);
  });
});

describe("le contournement de Jev", () => {
  it("le créateur ne publie pas son activité lui-même : ni par la modération, ni par la conclusion, ni par une écriture du statut", async () => {
    const createur = await nouveauResident("valide");
    const { identifiant_public } = await creer(createur);

    const moderation = await createur.client.rpc("moderer_activite", {
      p_identifiant: identifiant_public,
      p_decision: "publier",
      p_message: null,
    });
    const conclusion = await createur.client.rpc("conclure_pre_moderation", {
      p_identifiant: identifiant_public,
      p_raison: null,
    });
    const ecriture = await createur.client
      .from("activite")
      .update({ statut: "publiee" })
      .eq("identifiant_public", identifiant_public);

    expect(moderation.error?.code).toBe("42501");
    expect(conclusion.error?.code).toBe("42501");
    expect(ecriture.error).not.toBeNull();
    expect(await statutDe(identifiant_public)).toBe("en_relecture");
  });

  it("une insertion qui annonce le statut publiée n'y échappe pas", async () => {
    const createur = await nouveauResident("valide");

    const { error } = await createur.client
      .from("activite")
      .insert({ ...ACTIVITE, statut: "publiee", organisateur: createur.id });

    expect(error).not.toBeNull();
  });

  it("le conseil syndical ne publie pas par la conclusion réservée au serveur", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const { identifiant_public } = await creer(createur);

    const { error } = await syndic.client.rpc("conclure_pre_moderation", {
      p_identifiant: identifiant_public,
      p_raison: null,
    });

    expect(error?.code).toBe("42501");
  });
});

describe("la conclusion du serveur", () => {
  it("sans raison, publie l'activité pour tous", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    const { identifiant_public } = await creer(createur);

    const { error } = await conclure(identifiant_public);

    expect(error).toBeNull();
    expect((await fiche(voisin, identifiant_public)).data).toMatchObject({
      statut: "publiee",
    });
    expect(
      (await fiche(clientVisiteur(), identifiant_public)).data,
    ).toMatchObject({ statut: "publiee" });
  });

  it("avec une raison, laisse l'activité en relecture et la donne au conseil syndical seul", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const voisin = await nouveauResident("valide");
    const { identifiant_public } = await creer(createur);

    const { error } = await conclure(
      identifiant_public,
      "Nuisances sonores : l'activité risque de gêner le voisinage.",
    );

    expect(error).toBeNull();
    expect((await fiche(syndic, identifiant_public)).data).toMatchObject({
      statut: "en_relecture",
      raison_relecture:
        "Nuisances sonores : l'activité risque de gêner le voisinage.",
    });
    expect((await fiche(createur, identifiant_public)).data).toMatchObject({
      statut: "en_relecture",
      raison_relecture: null,
    });
    expect((await fiche(voisin, identifiant_public)).data).toBeNull();
    const { data } = await syndic.client.rpc("activites_a_moderer");
    expect(
      (data as { identifiant_public: string }[]).map(
        (a) => a.identifiant_public,
      ),
    ).toContain(identifiant_public);
  });

  it("une raison blanche vaut pas de raison : l'activité est publiée", async () => {
    const createur = await nouveauResident("valide");
    const { identifiant_public } = await creer(createur);

    const { error } = await conclure(identifiant_public, "   ");

    expect(error).toBeNull();
    expect(await statutDe(identifiant_public)).toBe("publiee");
  });

  it("ne touche pas une activité déjà publiée", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await creerEtPublier(createur);

    const { error } = await conclure(identifiant, "Trop tard");

    expect(error?.code).toBe("P0011");
    expect(await statutDe(identifiant)).toBe("publiee");
  });

  it("ne publie pas une activité que le conseil syndical a déjà à relire", async () => {
    const createur = await nouveauResident("valide");
    const { identifiant_public } = await creer(createur);
    await conclure(identifiant_public, "Nuisances sonores");

    const { error } = await conclure(identifiant_public);

    expect(error?.code).toBe("P0011");
    expect(await statutDe(identifiant_public)).toBe("en_relecture");
  });

  it("ne publie pas une activité masquée", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await creerEtPublier(createur);
    await syndic.client.rpc("moderer_activite", {
      p_identifiant: identifiant,
      p_decision: "masquer",
      p_message: "Hors sujet",
    });

    const { error } = await conclure(identifiant);

    expect(error?.code).toBe("P0011");
    expect(await statutDe(identifiant)).toBe("masquee");
  });

  it("dit d'une activité inconnue qu'elle n'existe pas", async () => {
    const { error } = await conclure("inconnue");

    expect(error?.code).toBe("P0002");
  });
});

describe("la modification par son créateur", () => {
  it("remet l'activité en relecture jusqu'à l'avis de Jev : un voisin ne la voit plus", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    const identifiant = await creerEtPublier(createur);

    const { error } = await createur.client
      .from("activite")
      .update({ titre: "Goûter bruyant" })
      .eq("identifiant_public", identifiant);

    expect(error).toBeNull();
    expect(await statutDe(identifiant)).toBe("en_relecture");
    expect((await fiche(voisin, identifiant)).data).toBeNull();
    expect((await fiche(createur, identifiant)).data).toMatchObject({
      titre: "Goûter bruyant",
      statut: "en_relecture",
    });
  });

  it("est republiée par la conclusion du serveur, sans raison", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await creerEtPublier(createur);
    await createur.client
      .from("activite")
      .update({ titre: "Goûter du soir" })
      .eq("identifiant_public", identifiant);

    const { error } = await conclure(identifiant);

    expect(error).toBeNull();
    expect(await statutDe(identifiant)).toBe("publiee");
  });

  it("reste au conseil syndical quand Jev la refuse", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await creerEtPublier(createur);
    await createur.client
      .from("activite")
      .update({ titre: "Fête bruyante" })
      .eq("identifiant_public", identifiant);

    await conclure(identifiant, "Nuisances sonores");

    expect((await fiche(syndic, identifiant)).data).toMatchObject({
      statut: "en_relecture",
      raison_relecture: "Nuisances sonores",
    });
  });

  it("peut être relue de nouveau après une première décision du conseil syndical", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const { identifiant_public } = await creer(createur);
    await conclure(identifiant_public, "Nuisances sonores");
    await syndic.client.rpc("moderer_activite", {
      p_identifiant: identifiant_public,
      p_decision: "publier",
      p_message: null,
    });
    await createur.client
      .from("activite")
      .update({ titre: "Goûter du soir" })
      .eq("identifiant_public", identifiant_public);

    const { error } = await conclure(identifiant_public);

    expect(error).toBeNull();
    expect(await statutDe(identifiant_public)).toBe("publiee");
  });

  it("qui ne change rien laisse l'activité publiée", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await creerEtPublier(createur);

    const { data, error } = await createur.client
      .from("activite")
      .update({ titre: ACTIVITE.titre, lieu: ACTIVITE.lieu })
      .eq("identifiant_public", identifiant)
      .select("identifiant_public");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(await statutDe(identifiant)).toBe("publiee");
  });

  it("n'est pas relue quand seules les photos changent", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await creerEtPublier(createur);

    const { error } = await createur.client.rpc("definir_photos_activite", {
      p_identifiant: identifiant,
      p_chemins: [],
    });

    expect(error).toBeNull();
    expect(await statutDe(identifiant)).toBe("publiee");
  });

  it("d'un membre du syndic sur sa propre activité est relue aussi", async () => {
    const syndic = await nouveauSyndic();
    const identifiant = await creerEtPublier(syndic);

    await syndic.client
      .from("activite")
      .update({ titre: "Apéro de l'immeuble" })
      .eq("identifiant_public", identifiant);

    expect(await statutDe(identifiant)).toBe("en_relecture");
  });

  it("par le conseil syndical sur l'activité d'un résident n'est pas relue : il modère lui-même", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await creerEtPublier(createur);

    const { error } = await syndic.client
      .from("activite")
      .update({ lieu: "Salle commune" })
      .eq("identifiant_public", identifiant);

    expect(error).toBeNull();
    expect(await statutDe(identifiant)).toBe("publiee");
  });
});
