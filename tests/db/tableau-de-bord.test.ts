import { beforeAll, describe, expect, it } from "vitest";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";
import { creneauFinissantDans } from "./paris";

// Ticket #17 : le conseil syndical suit ce qui anime la résidence. Les statistiques sont des
// fonctions SQL réservées à ses membres ; les chiffres se vérifient sur un jeu de données fixe,
// en mars et avril 2020 pour ne croiser aucune donnée des autres fichiers de tests.
//
// Mars 2020, activités publiées et terminées :
//   A1  lundi 2 mars, 10h-12h, moments partagés, résident 1, 10 places : R1 seul, R2 avec 1 accompagnant (3 places)
//   A2  samedi 7 mars, 16h-18h, moments partagés, résident 1, 4 places : R2 et R3 avec 1 accompagnant chacun (4 places)
//   A3  lundi 16 mars, 19h-21h, culture et loisirs, conseil syndical, sans limite : R2, R3, R4
//   A4  samedi 21 mars, 9h-11h, jardin, résident 2, 5 places : R4
// Écartées des chiffres : une activité annulée, une en relecture, une masquée (mars), une publiée en avril.
// Avril 2020 : A8 samedi 4 avril, R1 inscrit.

const MARS = { p_debut: "2020-03-01", p_fin: "2020-03-31" };

type Ligne = Record<string, unknown>;

describe("tableau de bord du conseil syndical", () => {
  let syndic: Compte;
  let resident1: Compte;
  let resident2: Compte;
  let resident3: Compte;
  let resident4: Compte;
  let enAttente: Compte;
  let identifiants: Record<string, string>;

  async function activite(
    organisateur: Compte,
    date: string,
    debut: string,
    fin: string,
    categorie: string,
    complements: Record<string, unknown> = {},
  ) {
    const { data, error } = await clientAdmin()
      .from("activite")
      .insert({
        titre: `Activité du ${date}`,
        categorie,
        pictogramme: "waving_hand",
        date_activite: date,
        heure_debut: debut,
        heure_fin: fin,
        lieu: "Salle commune",
        organisateur: organisateur.id,
        ...complements,
      })
      .select("id, identifiant_public")
      .single();
    if (error) throw error;
    return data as { id: string; identifiant_public: string };
  }

  async function inscrire(
    a: { id: string },
    resident: Compte,
    accompagnants = 0,
  ) {
    const { error } = await clientAdmin().from("inscription_activite").insert({
      activite_id: a.id,
      resident_id: resident.id,
      accompagnants,
    });
    if (error) throw error;
  }

  async function retour(
    a: { id: string },
    resident: Compte,
    note: number,
    commentaire: string,
  ) {
    const { error } = await clientAdmin().from("retour").insert({
      activite_id: a.id,
      resident_id: resident.id,
      note,
      commentaire,
    });
    if (error) throw error;
  }

  beforeAll(async () => {
    [syndic, resident1, resident2, resident3, resident4, enAttente] =
      await Promise.all([
        nouveauSyndic(),
        nouveauResident(),
        nouveauResident(),
        nouveauResident(),
        nouveauResident(),
        nouveauResident("en_attente"),
      ]);

    const a1 = await activite(
      resident1,
      "2020-03-02",
      "10:00",
      "12:00",
      "moments_partages",
      { capacite_max: 10 },
    );
    const a2 = await activite(
      resident1,
      "2020-03-07",
      "16:00",
      "18:00",
      "moments_partages",
      { capacite_max: 4 },
    );
    const a3 = await activite(
      syndic,
      "2020-03-16",
      "19:00",
      "21:00",
      "culture_loisirs",
    );
    const a4 = await activite(
      resident2,
      "2020-03-21",
      "09:00",
      "11:00",
      "jardin_nature",
      { capacite_max: 5 },
    );
    const annulee = await activite(
      resident3,
      "2020-03-10",
      "10:00",
      "11:00",
      "entraide_partage",
      { statut: "annulee" },
    );
    const relecture = await activite(
      resident3,
      "2020-03-11",
      "10:00",
      "11:00",
      "entraide_partage",
      { statut: "en_relecture" },
    );
    const masquee = await activite(
      resident3,
      "2020-03-12",
      "10:00",
      "11:00",
      "entraide_partage",
      { statut: "masquee" },
    );
    const a8 = await activite(
      resident2,
      "2020-04-04",
      "10:00",
      "12:00",
      "jardin_nature",
    );

    await inscrire(a1, resident1);
    await inscrire(a1, resident2, 1);
    await inscrire(a2, resident2, 1);
    await inscrire(a2, resident3, 1);
    await inscrire(a3, resident2);
    await inscrire(a3, resident3);
    await inscrire(a3, resident4);
    await inscrire(a4, resident4);
    await inscrire(annulee, resident1);
    await inscrire(relecture, resident1);
    await inscrire(masquee, resident1);
    await inscrire(a8, resident1);

    await retour(a2, resident2, 5, "Très bonne ambiance");
    await retour(a2, resident3, 4, "Un peu serré");
    await retour(a1, resident1, 3, "Bien");
    await retour(a3, resident2, 5, "À refaire");
    await retour(annulee, resident1, 5, "Jamais eu lieu");

    identifiants = {
      a1: a1.identifiant_public,
      a2: a2.identifiant_public,
      a3: a3.identifiant_public,
    };
  });

  describe("synthèse", () => {
    it("compte les activités, inscriptions et participants distincts de la période", async () => {
      const { data, error } = await syndic.client
        .rpc("tableau_bord_synthese", MARS)
        .single<Ligne>();
      expect(error).toBeNull();
      expect(data).toMatchObject({
        nombre_activites: 4,
        nombre_inscriptions: 8,
        nombre_participants: 4,
        activites_par_residents: 3,
        activites_par_conseil: 1,
      });
    });

    it("compte les résidents validés et en attente, quelle que soit la période", async () => {
      const { data } = await syndic.client
        .rpc("tableau_bord_synthese", {
          p_debut: "2020-01-01",
          p_fin: "2020-01-02",
        })
        .single<Ligne>();
      // D'autres fichiers créent des résidents en parallèle : au moins ceux de ce fichier.
      expect(data!.residents_valides as number).toBeGreaterThanOrEqual(4);
      expect(data!.residents_en_attente as number).toBeGreaterThanOrEqual(1);
      expect(data).toMatchObject({
        nombre_activites: 0,
        nombre_participants: 0,
      });
    });

    it("ne compte pas les activités qui n'ont pas encore eu lieu", async () => {
      const demain = new Date(Date.now() + 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);
      const a = await activite(
        resident4,
        demain,
        "23:00",
        "23:59",
        "moments_partages",
      );
      await inscrire(a, resident4);
      const { data } = await syndic.client
        .rpc("tableau_bord_synthese", { p_debut: demain, p_fin: demain })
        .single<Ligne>();
      expect(data).toMatchObject({
        nombre_activites: 0,
        nombre_inscriptions: 0,
      });
    });
  });

  describe("remplissage", () => {
    async function lignes(dimension: string) {
      const { data, error } = await syndic.client.rpc(
        "tableau_bord_remplissage",
        MARS,
      );
      expect(error).toBeNull();
      return Object.fromEntries(
        (data as Ligne[])
          .filter((l) => l.dimension === dimension)
          .map((l) => [l.cle as string, l]),
      );
    }

    it("donne le nombre d'activités et le taux moyen par catégorie", async () => {
      const categories = await lignes("categorie");
      expect(Object.keys(categories).sort()).toEqual([
        "culture_loisirs",
        "jardin_nature",
        "moments_partages",
      ]);
      expect(categories.moments_partages).toMatchObject({
        nombre_activites: 2,
        taux_remplissage: 65,
      });
      expect(categories.jardin_nature).toMatchObject({
        nombre_activites: 1,
        taux_remplissage: 20,
      });
      // Une activité sans limite de places n'a pas de taux de remplissage.
      expect(categories.culture_loisirs).toMatchObject({
        nombre_activites: 1,
        taux_remplissage: null,
      });
    });

    it("donne le taux par jour de la semaine, lundi = 1", async () => {
      const jours = await lignes("jour");
      expect(Object.keys(jours).sort()).toEqual(["1", "6"]);
      expect(jours["1"]).toMatchObject({
        nombre_activites: 2,
        taux_remplissage: 30,
      });
      expect(jours["6"]).toMatchObject({
        nombre_activites: 2,
        taux_remplissage: 60,
      });
    });

    it("donne le taux par tranche horaire : matin, après-midi, soir", async () => {
      const creneaux = await lignes("creneau");
      expect(creneaux.matin).toMatchObject({
        nombre_activites: 2,
        taux_remplissage: 25,
      });
      expect(creneaux.apres_midi).toMatchObject({
        nombre_activites: 1,
        taux_remplissage: 100,
      });
      expect(creneaux.soir).toMatchObject({
        nombre_activites: 1,
        taux_remplissage: null,
      });
    });
  });

  describe("classement", () => {
    it("classe les activités par note moyenne, avec leurs commentaires", async () => {
      const { data, error } = await syndic.client.rpc(
        "tableau_bord_classement",
        {
          ...MARS,
          p_limite: 10,
        },
      );
      expect(error).toBeNull();
      const lignes = data as Ligne[];
      expect(lignes.map((l) => l.identifiant_public)).toEqual([
        identifiants.a3,
        identifiants.a2,
        identifiants.a1,
      ]);
      expect(lignes[1]).toMatchObject({ note_moyenne: 4.5, nombre_retours: 2 });
      expect(lignes[1].commentaires).toHaveLength(2);
      expect(lignes[1].commentaires).toContainEqual({
        note: 5,
        commentaire: "Très bonne ambiance",
      });
    });

    it("compte une activité tenue à son heure de fin de Paris, pas avec 1 à 2 h de retard", async () => {
      const fin = creneauFinissantDans(-30);
      const terminee = await activite(
        resident4,
        fin.date_activite,
        fin.heure_debut,
        fin.heure_fin,
        "moments_partages",
      );
      await inscrire(terminee, resident1);
      await retour(terminee, resident1, 5, "Terminée il y a une demi-heure");

      const { data, error } = await syndic.client.rpc(
        "tableau_bord_classement",
        {
          p_debut: fin.date_activite,
          p_fin: fin.date_activite,
          p_limite: 100,
        },
      );

      expect(error).toBeNull();
      expect((data as Ligne[]).map((l) => l.identifiant_public)).toContain(
        terminee.identifiant_public,
      );
    });

    it("respecte la limite demandée", async () => {
      const { data } = await syndic.client.rpc("tableau_bord_classement", {
        ...MARS,
        p_limite: 1,
      });
      expect(data as Ligne[]).toHaveLength(1);
    });
  });

  describe("participants par mois", () => {
    it("donne une ligne par mois de la période, mois vides compris", async () => {
      const { data, error } = await syndic.client.rpc("tableau_bord_par_mois", {
        p_debut: "2020-02-10",
        p_fin: "2020-04-30",
      });
      expect(error).toBeNull();
      expect(data).toEqual([
        { mois: "2020-02-01", nombre_activites: 0, nombre_participants: 0 },
        { mois: "2020-03-01", nombre_activites: 4, nombre_participants: 4 },
        { mois: "2020-04-01", nombre_activites: 1, nombre_participants: 1 },
      ]);
    });
  });

  describe("accès", () => {
    const fonctions = [
      ["tableau_bord_synthese", MARS],
      ["tableau_bord_remplissage", MARS],
      ["tableau_bord_classement", { ...MARS, p_limite: 5 }],
      ["tableau_bord_par_mois", MARS],
    ] as const;

    for (const [nom, args] of fonctions) {
      it(`${nom} : refusée à un résident validé`, async () => {
        const { data, error } = await resident1.client.rpc(nom, args);
        expect(data).toBeNull();
        expect(error?.code).toBe("42501");
      });

      it(`${nom} : refusée à un résident en attente`, async () => {
        const { data, error } = await enAttente.client.rpc(nom, args);
        expect(data).toBeNull();
        expect(error?.code).toBe("42501");
      });

      it(`${nom} : refusée à une personne non connectée`, async () => {
        const { data, error } = await clientVisiteur().rpc(nom, args);
        expect(data).toBeNull();
        expect(error).not.toBeNull();
      });
    }
  });
});
