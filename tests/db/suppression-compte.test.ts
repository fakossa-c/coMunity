import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, inject, it } from "vitest";
import { cheminPhoto, urlPhoto } from "@/lib/photos-activite";
import { retirerPhotosDesActivites } from "@/lib/suppression-compte";
import {
  clientAdmin,
  clientVisiteur,
  connecter,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";

// Ticket #41 : un résident supprime son compte. Ses informations, ses inscriptions et ses
// réponses aux sondages sont effacées ; ses activités à venir avec des inscrits sont annulées,
// les autres supprimées ; ses activités passées restent sans organisateur ; ses retours restent,
// anonymes ; les photos des activités retirées quittent le bucket public.

const jour = (jours: number) =>
  new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);

const ACTIVITE = {
  titre: "Goûter crêpes",
  categorie: "moments_partages" as const,
  pictogramme: "waving_hand",
  date_activite: jour(30),
  heure_debut: "16:00",
  heure_fin: "18:30",
  lieu: "Jardin partagé",
};

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], {
  type: "image/jpeg",
});

const activitesCreees: string[] = [];
const annoncesCreees: string[] = [];
const fichiersDeposes: string[] = [];

afterAll(async () => {
  const admin = clientAdmin();
  await admin.storage.from("activites").remove(fichiersDeposes);
  await admin.from("activite").delete().in("id", activitesCreees);
  await admin.from("annonce").delete().in("id", annoncesCreees);
});

type ActivitePubliee = { id: string; identifiant: string };

/** Publie une activité au nom de `organisateur` : à venir par défaut, passée avec `passee`. */
async function publier(
  organisateur: Compte,
  { passee = false, titre = ACTIVITE.titre, date = "2020-01-04" } = {},
): Promise<ActivitePubliee> {
  const { data, error } = await organisateur.client
    .from("activite")
    .insert({
      ...ACTIVITE,
      titre,
      ...(passee ? { date_activite: date } : {}),
      organisateur: organisateur.id,
    })
    .select("id, identifiant_public")
    .single();
  if (error) throw error;
  activitesCreees.push(data.id);
  return { id: data.id, identifiant: data.identifiant_public };
}

async function inscrire(resident: Compte, activite: ActivitePubliee) {
  const { error } = await resident.client.rpc("s_inscrire", {
    p_identifiant: activite.identifiant,
  });
  if (error) throw error;
}

/** Dépose une photo de l'activité au nom de son créateur et l'enregistre sur la fiche. */
async function ajouterPhoto(createur: Compte, activite: ActivitePubliee) {
  const chemin = cheminPhoto(activite.id, randomUUID());
  fichiersDeposes.push(chemin);
  const depot = await createur.client.storage
    .from("activites")
    .upload(chemin, JPEG, { contentType: "image/jpeg" });
  if (depot.error) throw depot.error;
  const { error } = await createur.client.rpc("definir_photos_activite", {
    p_identifiant: activite.identifiant,
    p_chemins: [chemin],
  });
  if (error) throw error;
  return chemin;
}

function supprimerCompte(compte: Compte) {
  return compte.client.rpc("supprimer_mon_compte");
}

async function activiteEnBase(activite: ActivitePubliee) {
  const { data, error } = await clientAdmin()
    .from("activite")
    .select("id, statut, organisateur, photos")
    .eq("id", activite.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function fiche(lecteur: Compte, activite: ActivitePubliee) {
  return lecteur.client
    .rpc("fiche_activite", { identifiant: activite.identifiant })
    .maybeSingle();
}

async function servie(chemin: string) {
  const { url } = inject("supabase");
  return (await fetch(urlPhoto(url, chemin))).ok;
}

describe("réservé au résident qui supprime son propre compte", () => {
  it("un membre du syndic ne peut pas supprimer son compte ici", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await supprimerCompte(syndic);

    expect(error?.code).toBe("42501");
    const { data } = await clientAdmin()
      .from("profil")
      .select("id")
      .eq("id", syndic.id);
    expect(data).toHaveLength(1);
  });

  it("un visiteur sans session ne supprime rien", async () => {
    const { error } = await clientVisiteur().rpc("supprimer_mon_compte");

    expect(error).not.toBeNull();
  });
});

describe("le compte disparaît", () => {
  it("le profil et le compte sont effacés, et l'ancien email ne permet plus de se connecter", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await supprimerCompte(resident);

    expect(error).toBeNull();
    const admin = clientAdmin();
    const { data: profil } = await admin
      .from("profil")
      .select("id")
      .eq("id", resident.id);
    expect(profil).toEqual([]);
    const { data: compte } = await admin.auth.admin.getUserById(resident.id);
    expect(compte.user).toBeNull();
    await expect(connecter(resident.email)).rejects.toThrow();
  });

  it("un résident encore en attente de validation peut aussi supprimer son compte", async () => {
    const resident = await nouveauResident("en_attente");

    const { error } = await supprimerCompte(resident);

    expect(error).toBeNull();
    const { data } = await clientAdmin()
      .from("profil")
      .select("id")
      .eq("id", resident.id);
    expect(data).toEqual([]);
  });

  it("ses inscriptions à des activités d'autres voisins sont effacées", async () => {
    const organisateur = await nouveauResident("valide");
    const resident = await nouveauResident("valide");
    const activite = await publier(organisateur);
    await inscrire(resident, activite);
    const admin = clientAdmin();

    await supprimerCompte(resident);

    const { data } = await admin
      .from("inscription_activite")
      .select("resident_id")
      .eq("activite_id", activite.id);
    expect(data).toEqual([]);
    expect((await activiteEnBase(activite))?.statut).toBe("publiee");
  });

  it("ses réponses aux sondages sont effacées", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const annonce = await syndic.client
      .from("annonce")
      .insert({ type: "sondage", titre: "Horaires du local vélos" })
      .select("id")
      .single();
    if (annonce.error) throw annonce.error;
    annoncesCreees.push(annonce.data.id);
    const sondage = await syndic.client
      .from("sondage")
      .insert({
        annonce_id: annonce.data.id,
        question: "Quel créneau ?",
        options: ["7h à 21h", "6h à 23h"],
        echeance: jour(7),
      })
      .select("id")
      .single();
    if (sondage.error) throw sondage.error;
    const reponse = await resident.client.rpc("repondre_sondage", {
      p_sondage: sondage.data.id,
      p_choix: 1,
    });
    if (reponse.error) throw reponse.error;

    await supprimerCompte(resident);

    const { data } = await clientAdmin()
      .from("reponse_sondage")
      .select("profil_id")
      .eq("sondage_id", sondage.data.id);
    expect(data).toEqual([]);
  });
});

describe("ses activités", () => {
  it("une activité à venir avec des inscrits est annulée, et l'inscrit la voit annulée", async () => {
    const createur = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const activite = await publier(createur);
    await inscrire(inscrit, activite);

    const { error } = await supprimerCompte(createur);

    expect(error).toBeNull();
    expect(await activiteEnBase(activite)).toMatchObject({
      statut: "annulee",
      organisateur: null,
    });
    const { data: catalogue } = await inscrit.client.rpc("catalogue_activites");
    expect(catalogue).toContainEqual(
      expect.objectContaining({ id: activite.id, statut: "annulee" }),
    );
    const { data: laFiche } = await fiche(inscrit, activite);
    expect(laFiche).toMatchObject({
      statut: "annulee",
      organisateur_nom_affiche: null,
      est_organisateur: false,
    });
  });

  it("l'inscription de l'inscrit est conservée sur l'activité annulée", async () => {
    const createur = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const activite = await publier(createur);
    await inscrire(inscrit, activite);

    await supprimerCompte(createur);

    const { data } = await clientAdmin()
      .from("inscription_activite")
      .select("resident_id")
      .eq("activite_id", activite.id);
    expect(data).toEqual([{ resident_id: inscrit.id }]);
  });

  it("une activité à venir sans inscrit est supprimée", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);

    await supprimerCompte(createur);

    expect(await activiteEnBase(activite)).toBeNull();
  });

  it("une activité à venir dont le seul inscrit est son créateur est supprimée, pas annulée", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);
    await inscrire(createur, activite);

    await supprimerCompte(createur);

    expect(await activiteEnBase(activite)).toBeNull();
  });

  it("une activité à venir en relecture ou masquée est supprimée, même avec des inscrits", async () => {
    const createur = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const enRelecture = await publier(createur);
    await inscrire(inscrit, enRelecture);
    const relecture = await createur.client.rpc("mettre_en_relecture", {
      p_identifiant: enRelecture.identifiant,
      p_raison: "Contenu à vérifier",
    });
    if (relecture.error) throw relecture.error;

    await supprimerCompte(createur);

    expect(await activiteEnBase(enRelecture)).toBeNull();
  });

  it("une activité passée reste, sans nom d'organisateur, avec ses photos", async () => {
    const createur = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const passee = await publier(createur, { passee: true });
    await inscrire(inscrit, passee);
    const photo = await ajouterPhoto(createur, passee);

    await supprimerCompte(createur);

    expect(await activiteEnBase(passee)).toMatchObject({
      statut: "publiee",
      organisateur: null,
      photos: [photo],
    });
    const { data } = await fiche(inscrit, passee);
    expect(data).toMatchObject({
      titre: ACTIVITE.titre,
      organisateur_nom_affiche: null,
      proposee_par_syndic: false,
      est_organisateur: false,
    });
  });

  it("une activité à venir déjà annulée sans inscrit est supprimée, avec inscrits elle reste annulée", async () => {
    const createur = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const annuleeSansInscrit = await publier(createur);
    const annuleeAvecInscrit = await publier(createur);
    await inscrire(inscrit, annuleeAvecInscrit);
    for (const activite of [annuleeSansInscrit, annuleeAvecInscrit]) {
      const { error } = await createur.client.rpc("annuler_activite", {
        p_identifiant: activite.identifiant,
      });
      if (error) throw error;
    }

    await supprimerCompte(createur);

    expect(await activiteEnBase(annuleeSansInscrit)).toBeNull();
    expect(await activiteEnBase(annuleeAvecInscrit)).toMatchObject({
      statut: "annulee",
      organisateur: null,
    });
  });
});

describe("la file de modération du conseil syndical", () => {
  it("garde une activité passée masquée dont le créateur a supprimé son compte, sans nom", async () => {
    const syndic = await nouveauSyndic();
    const createur = await nouveauResident("valide");
    const passee = await publier(createur, { passee: true });
    const masquage = await syndic.client.rpc("moderer_activite", {
      p_identifiant: passee.identifiant,
      p_decision: "masquer",
      p_message: "Contenu à revoir",
    });
    if (masquage.error) throw masquage.error;

    await supprimerCompte(createur);

    const { data, error } = await syndic.client.rpc("activites_a_moderer");
    expect(error).toBeNull();
    expect(data).toContainEqual(
      expect.objectContaining({
        identifiant_public: passee.identifiant,
        organisateur_nom_affiche: null,
      }),
    );
  });
});

describe("ses retours", () => {
  it("ses retours restent, sans nom, pour l'organisateur et le conseil syndical", async () => {
    const organisateur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const participant = await nouveauResident("valide");
    const passee = await publier(organisateur, { passee: true });
    await inscrire(participant, passee);
    const retour = await participant.client.rpc("laisser_retour", {
      p_identifiant: passee.identifiant,
      p_note: 4,
      p_commentaire: "Très sympa, à refaire.",
    });
    if (retour.error) throw retour.error;

    await supprimerCompte(participant);

    const { data } = await clientAdmin()
      .from("retour")
      .select("resident_id, note, commentaire")
      .eq("activite_id", passee.id);
    expect(data).toEqual([
      {
        resident_id: null,
        note: 4,
        commentaire: "Très sympa, à refaire.",
      },
    ]);
    for (const lecteur of [organisateur, syndic]) {
      const { data: retours } = await lecteur.client
        .rpc("retours_activite", { identifiant: passee.identifiant })
        .maybeSingle();
      expect(retours).toMatchObject({ nombre_retours: 1, note_moyenne: 4 });
    }
  });

  it("le retour d'un participant reste lisible quand c'est l'organisateur qui supprime son compte", async () => {
    const organisateur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const participant = await nouveauResident("valide");
    const passee = await publier(organisateur, { passee: true });
    await inscrire(participant, passee);
    const retour = await participant.client.rpc("laisser_retour", {
      p_identifiant: passee.identifiant,
      p_note: 5,
      p_commentaire: "Parfait.",
    });
    if (retour.error) throw retour.error;

    await supprimerCompte(organisateur);

    const { data } = await syndic.client
      .rpc("retours_activite", { identifiant: passee.identifiant })
      .maybeSingle();
    expect(data).toMatchObject({ nombre_retours: 1, note_moyenne: 5 });
  });
});

describe("les photos des activités retirées", () => {
  it("la fonction rend les activités supprimées ou annulées, jamais les passées", async () => {
    const createur = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const supprimee = await publier(createur);
    const annulee = await publier(createur);
    await inscrire(inscrit, annulee);
    const passee = await publier(createur, { passee: true });

    const { data, error } = await supprimerCompte(createur);

    expect(error).toBeNull();
    expect([...(data as string[])].sort()).toEqual(
      [supprimee.id, annulee.id].sort(),
    );
    expect(data).not.toContain(passee.id);
  });

  it("une activité annulée ne garde aucune photo sur sa fiche", async () => {
    const createur = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const activite = await publier(createur);
    await inscrire(inscrit, activite);
    await ajouterPhoto(createur, activite);

    await supprimerCompte(createur);

    expect((await activiteEnBase(activite))?.photos).toEqual([]);
  });

  it("aucun fichier du bucket n'est encore servi pour une activité supprimée ou annulée, celui d'une activité passée l'est toujours", async () => {
    const createur = await nouveauResident("valide");
    const inscrit = await nouveauResident("valide");
    const supprimee = await publier(createur);
    const annulee = await publier(createur);
    await inscrire(inscrit, annulee);
    const passee = await publier(createur, { passee: true });
    const photoSupprimee = await ajouterPhoto(createur, supprimee);
    const photoAnnulee = await ajouterPhoto(createur, annulee);
    // Un envoi resté en plan : déposé, jamais enregistré sur la fiche.
    const photoOrpheline = cheminPhoto(supprimee.id, randomUUID());
    fichiersDeposes.push(photoOrpheline);
    const depot = await createur.client.storage
      .from("activites")
      .upload(photoOrpheline, JPEG, { contentType: "image/jpeg" });
    if (depot.error) throw depot.error;
    const photoPassee = await ajouterPhoto(createur, passee);
    expect(await servie(photoSupprimee)).toBe(true);

    const { data, error } = await supprimerCompte(createur);
    expect(error).toBeNull();
    await retirerPhotosDesActivites(clientAdmin(), data as string[]);

    expect(await servie(photoSupprimee)).toBe(false);
    expect(await servie(photoOrpheline)).toBe(false);
    expect(await servie(photoAnnulee)).toBe(false);
    expect(await servie(photoPassee)).toBe(true);
  });
});

describe("le tableau de bord du conseil syndical", () => {
  it("compte toujours l'activité passée d'un résident dont le compte est supprimé, parmi celles des résidents", async () => {
    const syndic = await nouveauSyndic();
    const createur = await nouveauResident("valide");
    const jourPropre = "2018-06-09";
    await publier(createur, { passee: true, date: jourPropre });
    const synthese = async () => {
      const { data, error } = await syndic.client
        .rpc("tableau_bord_synthese", {
          p_debut: jourPropre,
          p_fin: jourPropre,
        })
        .single<Record<string, number>>();
      if (error) throw error;
      return data;
    };
    expect(await synthese()).toMatchObject({
      nombre_activites: 1,
      activites_par_residents: 1,
    });

    await supprimerCompte(createur);

    expect(await synthese()).toMatchObject({
      nombre_activites: 1,
      activites_par_residents: 1,
      activites_par_conseil: 0,
    });
  });
});
