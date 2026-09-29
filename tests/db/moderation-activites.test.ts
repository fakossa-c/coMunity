import { describe, expect, it } from "vitest";
import {
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";

// Ticket #14 : le conseil syndical modère les activités. Une activité en relecture ou masquée
// n'est visible que de son créateur et du conseil syndical, lien public compris ; le conseil
// syndical publie, refuse, masque, rétablit, modifie ou annule ; le créateur voit l'état et le
// message. Sans Jev, une nouvelle activité est publiée directement.

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

async function publier(organisateur: Compte, complements: object = {}) {
  const { data, error } = await organisateur.client
    .from("activite")
    .insert({ ...ACTIVITE, ...complements, organisateur: organisateur.id })
    .select("identifiant_public")
    .single();
  if (error) throw error;
  return data.identifiant_public as string;
}

async function inscrire(resident: Compte, identifiant: string) {
  const { error } = await resident.client.rpc("s_inscrire", {
    p_identifiant: identifiant,
    p_accompagnants: 0,
  });
  if (error) throw error;
}

/** Met l'activité en relecture au nom de son créateur, comme le fera Jev (#20). */
async function mettreEnRelecture(
  createur: Compte,
  identifiant: string,
  raison = "Le titre semble commercial",
) {
  const { error } = await createur.client.rpc("mettre_en_relecture", {
    p_identifiant: identifiant,
    p_raison: raison,
  });
  if (error) throw error;
}

async function moderer(
  syndic: Compte,
  identifiant: string,
  decision: "publier" | "masquer",
  message: string | null = null,
) {
  return syndic.client.rpc("moderer_activite", {
    p_identifiant: identifiant,
    p_decision: decision,
    p_message: message,
  });
}

function fiche(
  lecteur: Compte | ReturnType<typeof clientVisiteur>,
  id: string,
) {
  const client = "client" in lecteur ? lecteur.client : lecteur;
  return client.rpc("fiche_activite", { identifiant: id }).maybeSingle();
}

async function statutDe(syndic: Compte, identifiant: string) {
  const { data } = await fiche(syndic, identifiant);
  return (data as { statut?: string } | null)?.statut;
}

describe("sans Jev, la publication est directe", () => {
  it("une nouvelle activité est publiée, sans relecture ni message", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await publier(createur);

    const { data } = await fiche(createur, identifiant);

    expect(data).toMatchObject({
      statut: "publiee",
      message_moderation: null,
      raison_relecture: null,
    });
  });
});

describe.each(["en_relecture", "masquee"] as const)(
  "une activité %s",
  (statut) => {
    /** Une activité du créateur, dans l'état voulu, avec un inscrit. */
    async function activiteDansLEtat() {
      const createur = await nouveauResident("valide");
      const syndic = await nouveauSyndic();
      const inscrit = await nouveauResident("valide");
      const identifiant = await publier(createur);
      await inscrire(inscrit, identifiant);
      if (statut === "en_relecture") {
        await mettreEnRelecture(createur, identifiant);
      } else {
        const { error } = await moderer(
          syndic,
          identifiant,
          "masquer",
          "Hors sujet",
        );
        expect(error).toBeNull();
      }
      return { createur, syndic, inscrit, identifiant };
    }

    it("reste visible de son créateur et du conseil syndical", async () => {
      const { createur, syndic, identifiant } = await activiteDansLEtat();

      expect((await fiche(createur, identifiant)).data).toMatchObject({
        statut,
        est_organisateur: true,
      });
      expect((await fiche(syndic, identifiant)).data).toMatchObject({
        statut,
        est_organisateur: false,
      });
      const { data } = await syndic.client
        .from("activite")
        .select("identifiant_public")
        .eq("identifiant_public", identifiant);
      expect(data).toHaveLength(1);
    });

    it("disparaît pour un autre résident, même inscrit, et pour un visiteur (lien public compris)", async () => {
      const { inscrit, identifiant } = await activiteDansLEtat();
      const voisin = await nouveauResident("valide");

      for (const lecteur of [voisin, inscrit, clientVisiteur()]) {
        expect((await fiche(lecteur, identifiant)).data).toBeNull();
      }
      for (const lecteur of [voisin, inscrit]) {
        const { data } = await lecteur.client
          .from("activite")
          .select("identifiant_public")
          .eq("identifiant_public", identifiant);
        expect(data).toEqual([]);
      }
    });

    it("n'est plus au catalogue d'un autre résident, mais reste à celui de son créateur", async () => {
      const { createur, syndic, inscrit, identifiant } =
        await activiteDansLEtat();
      const voisin = await nouveauResident("valide");

      const dans = async (lecteur: Compte) => {
        const { data } = await lecteur.client.rpc("catalogue_activites");
        return (data ?? []).some(
          (a: { identifiant_public: string }) =>
            a.identifiant_public === identifiant,
        );
      };

      expect(await dans(createur)).toBe(true);
      expect(await dans(voisin)).toBe(false);
      expect(await dans(inscrit)).toBe(false);
      expect(await dans(syndic)).toBe(false);
    });

    it("ne livre ni ses participants ni ses inscriptions à un autre résident", async () => {
      const { createur, inscrit, identifiant } = await activiteDansLEtat();
      const voisin = await nouveauResident("valide");

      const vu = await voisin.client.rpc("participants_activite", {
        identifiant,
      });
      expect(vu.data).toEqual([]);
      const chezCreateur = await createur.client.rpc("participants_activite", {
        identifiant,
      });
      expect(chezCreateur.data).toHaveLength(1);

      const { data: lignes } = await voisin.client
        .from("inscription_activite")
        .select("resident_id")
        .eq("resident_id", inscrit.id);
      expect(lignes).toEqual([]);
    });

    it("refuse toute nouvelle inscription", async () => {
      const { identifiant } = await activiteDansLEtat();
      const voisin = await nouveauResident("valide");

      const { error } = await voisin.client.rpc("s_inscrire", {
        p_identifiant: identifiant,
        p_accompagnants: 0,
      });

      expect(error?.code).toBe("P0002");
    });
  },
);

describe("mise en relecture", () => {
  it("le créateur met son activité en relecture avec la raison, que seul le conseil syndical lit", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);

    await mettreEnRelecture(createur, identifiant, "Titre commercial");

    expect((await fiche(syndic, identifiant)).data).toMatchObject({
      statut: "en_relecture",
      raison_relecture: "Titre commercial",
    });
    expect((await fiche(createur, identifiant)).data).toMatchObject({
      statut: "en_relecture",
      raison_relecture: null,
    });
  });

  it("le conseil syndical peut aussi mettre une activité en relecture", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);

    const { error } = await syndic.client.rpc("mettre_en_relecture", {
      p_identifiant: identifiant,
      p_raison: "Signalée par un voisin",
    });

    expect(error).toBeNull();
    expect(await statutDe(syndic, identifiant)).toBe("en_relecture");
  });

  it("un autre résident ne met pas l'activité d'autrui en relecture", async () => {
    const createur = await nouveauResident("valide");
    const intrus = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);

    const { error } = await intrus.client.rpc("mettre_en_relecture", {
      p_identifiant: identifiant,
      p_raison: "Pour nuire",
    });

    expect(error?.code).toBe("42501");
    expect(await statutDe(syndic, identifiant)).toBe("publiee");
  });

  it("exige une raison", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await publier(createur);

    const { error } = await createur.client.rpc("mettre_en_relecture", {
      p_identifiant: identifiant,
      p_raison: "   ",
    });

    expect(error?.code).toBe("23514");
  });

  it("ne touche qu'une activité publiée", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);
    await moderer(syndic, identifiant, "masquer", "Hors sujet");

    const { error } = await createur.client.rpc("mettre_en_relecture", {
      p_identifiant: identifiant,
      p_raison: "Encore",
    });

    expect(error?.code).toBe("P0011");
    expect(await statutDe(syndic, identifiant)).toBe("masquee");
  });

  it("le statut ne se change pas par une modification directe, même du conseil syndical", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);

    for (const auteur of [createur, syndic]) {
      const { error } = await auteur.client
        .from("activite")
        .update({ statut: "masquee" })
        .eq("identifiant_public", identifiant);
      expect(error).not.toBeNull();
    }
    expect(await statutDe(syndic, identifiant)).toBe("publiee");
  });
});

describe("liste « À relire » du conseil syndical", () => {
  it("regroupe les activités en relecture avec leur raison, et les masquées à part", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const enRelecture = await publier(createur, { titre: "Vente de savons" });
    const masquee = await publier(createur, { titre: "Hors sujet" });
    const publiee = await publier(createur, { titre: "Reste publiée" });
    await mettreEnRelecture(createur, enRelecture, "Titre commercial");
    await moderer(syndic, masquee, "masquer", "Hors sujet");

    const { data, error } = await syndic.client.rpc("activites_a_moderer");

    expect(error).toBeNull();
    const lignes = data as {
      identifiant_public: string;
      statut: string;
      raison_relecture: string | null;
      message_moderation: string | null;
      organisateur_nom_affiche: string;
    }[];
    const parId = new Map(lignes.map((l) => [l.identifiant_public, l]));
    expect(parId.get(enRelecture)).toMatchObject({
      statut: "en_relecture",
      raison_relecture: "Titre commercial",
      organisateur_nom_affiche: "Danielle M.",
    });
    expect(parId.get(masquee)).toMatchObject({
      statut: "masquee",
      message_moderation: "Hors sujet",
    });
    expect(parId.has(publiee)).toBe(false);
    // Les activités à relire passent avant les masquées.
    const rang = (id: string) =>
      lignes.findIndex((l) => l.identifiant_public === id);
    expect(rang(enRelecture)).toBeLessThan(rang(masquee));
  });

  it("n'est livrée ni à un résident ni à un visiteur", async () => {
    const createur = await nouveauResident("valide");
    const identifiant = await publier(createur);
    await mettreEnRelecture(createur, identifiant);

    const chezCreateur = await createur.client.rpc("activites_a_moderer");
    expect(chezCreateur.data).toEqual([]);
    const chezVisiteur = await clientVisiteur().rpc("activites_a_moderer");
    expect(chezVisiteur.error).not.toBeNull();
  });
});

describe("décision du conseil syndical", () => {
  it("publie une activité en relecture avec un message que le créateur lit", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const voisin = await nouveauResident("valide");
    const identifiant = await publier(createur);
    await mettreEnRelecture(createur, identifiant);

    const { error } = await moderer(
      syndic,
      identifiant,
      "publier",
      "C'est bon, merci d'avoir précisé le lieu.",
    );

    expect(error).toBeNull();
    expect((await fiche(createur, identifiant)).data).toMatchObject({
      statut: "publiee",
      message_moderation: "C'est bon, merci d'avoir précisé le lieu.",
    });
    // Publiée, elle est de nouveau visible de tous, mais le message reste au créateur.
    expect((await fiche(voisin, identifiant)).data).toMatchObject({
      statut: "publiee",
      message_moderation: null,
    });
    expect((await fiche(clientVisiteur(), identifiant)).data).toMatchObject({
      statut: "publiee",
      message_moderation: null,
    });
  });

  it("refuse une activité en relecture : elle est masquée, avec le message du refus", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);
    await mettreEnRelecture(createur, identifiant);

    const { error } = await moderer(
      syndic,
      identifiant,
      "masquer",
      "Les ventes ne sont pas des activités.",
    );

    expect(error).toBeNull();
    expect((await fiche(createur, identifiant)).data).toMatchObject({
      statut: "masquee",
      message_moderation: "Les ventes ne sont pas des activités.",
    });
  });

  it("masque puis rétablit une activité publiée : le message du masquage disparaît", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);

    await moderer(syndic, identifiant, "masquer", "Signalement en cours");
    expect(await statutDe(syndic, identifiant)).toBe("masquee");
    await moderer(syndic, identifiant, "publier");

    expect((await fiche(createur, identifiant)).data).toMatchObject({
      statut: "publiee",
      message_moderation: null,
    });
  });

  it("exige un message pour masquer ou refuser, pas pour publier", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);

    const sans = await moderer(syndic, identifiant, "masquer", "  ");
    expect(sans.error?.code).toBe("23514");
    expect(await statutDe(syndic, identifiant)).toBe("publiee");

    const publie = await moderer(syndic, identifiant, "publier");
    expect(publie.error).toBeNull();
  });

  it("refuse une décision inconnue et une activité annulée", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);

    const inconnue = await syndic.client.rpc("moderer_activite", {
      p_identifiant: identifiant,
      p_decision: "supprimer",
      p_message: "x",
    });
    expect(inconnue.error?.code).toBe("22023");

    await syndic.client.rpc("annuler_activite", { p_identifiant: identifiant });
    const surAnnulee = await moderer(
      syndic,
      identifiant,
      "masquer",
      "Trop tard",
    );
    expect(surAnnulee.error?.code).toBe("P0011");
  });

  it("est réservée au conseil syndical", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const intrus = await nouveauResident("valide");
    const identifiant = await publier(createur);

    for (const auteur of [createur, intrus]) {
      const { error } = await auteur.client.rpc("moderer_activite", {
        p_identifiant: identifiant,
        p_decision: "masquer",
        p_message: "Je me masque",
      });
      expect(error?.code).toBe("42501");
    }
    expect(await statutDe(syndic, identifiant)).toBe("publiee");
  });

  it("répond que l'activité n'existe pas quand l'identifiant est inconnu", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await moderer(syndic, "inconnu00000", "publier");

    expect(error?.code).toBe("P0002");
  });
});

describe("le conseil syndical modifie ou annule toute activité", () => {
  it("modifie l'activité d'un résident, masquée ou en relecture comprise", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);

    const publiee = await syndic.client
      .from("activite")
      .update({ titre: "Goûter crêpes (titre corrigé)" })
      .eq("identifiant_public", identifiant)
      .select("identifiant_public");
    expect(publiee.data).toHaveLength(1);

    await mettreEnRelecture(createur, identifiant);
    const enRelecture = await syndic.client
      .from("activite")
      .update({ description: "Description reprise" })
      .eq("identifiant_public", identifiant)
      .select("identifiant_public");
    expect(enRelecture.data).toHaveLength(1);
    expect((await fiche(syndic, identifiant)).data).toMatchObject({
      titre: "Goûter crêpes (titre corrigé)",
      description: "Description reprise",
    });
  });

  it("ne modifie pas une activité annulée", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const identifiant = await publier(createur);
    await syndic.client.rpc("annuler_activite", { p_identifiant: identifiant });

    const { data } = await syndic.client
      .from("activite")
      .update({ titre: "Trop tard" })
      .eq("identifiant_public", identifiant)
      .select("identifiant_public");

    expect(data).toEqual([]);
  });

  it("annule l'activité publiée d'un résident, inscrits gardés", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const inscrit = await nouveauResident("valide");
    const identifiant = await publier(createur);
    await inscrire(inscrit, identifiant);

    const { error } = await syndic.client.rpc("annuler_activite", {
      p_identifiant: identifiant,
    });

    expect(error).toBeNull();
    expect(await statutDe(syndic, identifiant)).toBe("annulee");
    expect((await fiche(inscrit, identifiant)).data).toMatchObject({
      statut: "annulee",
      mes_accompagnants: 0,
    });
  });

  it("n'annule pas une activité en relecture ou masquée : annulée, elle deviendrait publique", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const enRelecture = await publier(createur);
    const masquee = await publier(createur);
    await mettreEnRelecture(createur, enRelecture);
    await moderer(syndic, masquee, "masquer", "Hors sujet");

    for (const identifiant of [enRelecture, masquee]) {
      for (const auteur of [createur, syndic]) {
        const { error } = await auteur.client.rpc("annuler_activite", {
          p_identifiant: identifiant,
        });
        expect(error?.code).toBe("P0011");
      }
      expect((await fiche(clientVisiteur(), identifiant)).data).toBeNull();
    }
    expect(await statutDe(syndic, enRelecture)).toBe("en_relecture");
    expect(await statutDe(syndic, masquee)).toBe("masquee");
  });

  it("n'accepte plus de retour sur une activité masquée ou en relecture", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const inscrit = await nouveauResident("valide");
    const identifiant = await publier(createur, {
      date_activite: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    });
    await inscrire(inscrit, identifiant);
    await moderer(syndic, identifiant, "masquer", "Signalement");

    const { error } = await inscrit.client.rpc("laisser_retour", {
      p_identifiant: identifiant,
      p_note: 4,
      p_commentaire: "Très bien",
    });

    expect(error?.code).toBe("P0002");
  });

  it("un résident n'annule toujours pas l'activité d'autrui", async () => {
    const createur = await nouveauResident("valide");
    const intrus = await nouveauResident("valide");
    const identifiant = await publier(createur);

    const { error } = await intrus.client.rpc("annuler_activite", {
      p_identifiant: identifiant,
    });

    expect(error?.code).toBe("42501");
  });
});
