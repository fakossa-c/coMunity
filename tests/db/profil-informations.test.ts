import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  aSupprimer,
  clientAdmin,
  clientVisiteur,
  IDENTITE,
  nouveauResident,
  nouveauSyndic,
  nouveauSyndicSansNom,
  nouvelEmail,
  type Compte,
  publierApresJev,
} from "./clients";

// Ticket #18 : Mes informations. Le pseudo est le seul nom que les voisins voient d'un résident,
// membre du conseil syndical compris ; le prénom et le nom réels ne servent qu'au conseil syndical.
// Le téléphone, le bâtiment et l'étage ont chacun une visibilité, masquée par défaut.

const BUCKET = "profils";

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], {
  type: "image/jpeg",
});

const fichiersDeposes: string[] = [];

afterAll(async () => {
  await clientAdmin().storage.from(BUCKET).remove(fichiersDeposes);
});

function profilDe(id: string, colonnes: string) {
  return clientAdmin().from("profil").select(colonnes).eq("id", id).single();
}

function cheminPhoto(compte: Compte) {
  return `${compte.id}/${randomUUID()}.jpg`;
}

function deposer(compte: Compte, chemin = cheminPhoto(compte)) {
  fichiersDeposes.push(chemin);
  return compte.client.storage
    .from(BUCKET)
    .upload(chemin, JPEG, { contentType: "image/jpeg" });
}

/** La personne enregistre une photo : le fichier dans son dossier, puis son chemin sur son profil. */
async function poserPhoto(compte: Compte) {
  const chemin = cheminPhoto(compte);
  const depot = await deposer(compte, chemin);
  if (depot.error) throw depot.error;
  const { error } = await compte.client
    .from("profil")
    .update({ photo_chemin: chemin })
    .eq("id", compte.id);
  if (error) throw error;
  return chemin;
}

describe("pseudo", () => {
  it("un résident a pour pseudo son prénom et l'initiale de son nom", async () => {
    const resident = await nouveauResident();

    const { data } = await profilDe(resident.id, "pseudo");

    expect(data).toEqual({ pseudo: "Danielle M." });
  });

  it("un compte ouvert depuis l'inscription reçoit le même pseudo", async () => {
    const { data, error } = await clientVisiteur().auth.signUp({
      email: nouvelEmail("inscrit"),
      password: "mot-de-passe-de-test",
      options: { data: { prenom: " Colette ", nom: " durand " } },
    });
    expect(error).toBeNull();
    aSupprimer(data.user!.id);

    const { data: profil } = await profilDe(data.user!.id, "pseudo");

    expect(profil).toEqual({ pseudo: "Colette D." });
  });

  it("un membre du syndic amorcé avec son nom reçoit le même pseudo", async () => {
    const syndic = await nouveauSyndic();

    const { data } = await profilDe(syndic.id, "pseudo");

    expect(data).toEqual({ pseudo: "Colette D." });
  });

  it("un collègue invité n'en a pas avant d'avoir saisi son prénom et son nom, puis le reçoit", async () => {
    const collegue = await nouveauSyndicSansNom();
    expect((await profilDe(collegue.id, "pseudo")).data).toEqual({
      pseudo: null,
    });

    const { error } = await collegue.client.rpc("completer_profil", {
      prenom: "Marc",
      nom: "Lefèvre",
    });

    expect(error).toBeNull();
    expect((await profilDe(collegue.id, "pseudo")).data).toEqual({
      pseudo: "Marc L.",
    });
  });

  it("un profil inséré sans pseudo reçoit celui qu'on déduit de son prénom et de son nom", async () => {
    const admin = clientAdmin();
    const email = nouvelEmail("resident");
    const { data } = await admin.auth.admin.createUser({
      email,
      password: "mot-de-passe-de-test",
      email_confirm: true,
    });
    aSupprimer(data.user!.id);

    const { error } = await admin.from("profil").insert({
      id: data.user!.id,
      email,
      role: "resident",
      statut: "valide",
      prenom: "Danielle",
      nom: "Martin",
      pseudo: null,
    });

    expect(error).toBeNull();
    expect((await profilDe(data.user!.id, "pseudo")).data).toEqual({
      pseudo: "Danielle M.",
    });
  });

  it("la personne modifie son pseudo, librement", async () => {
    const resident = await nouveauResident();

    const { error } = await resident.client
      .from("profil")
      .update({ pseudo: "Dany" })
      .eq("id", resident.id);

    expect(error).toBeNull();
    expect((await profilDe(resident.id, "pseudo")).data).toEqual({
      pseudo: "Dany",
    });
  });

  it.each([
    ["vide", "   "],
    ["de plus de 50 caractères", "x".repeat(51)],
  ])("un pseudo %s est refusé", async (_, pseudo) => {
    const resident = await nouveauResident();

    const { error } = await resident.client
      .from("profil")
      .update({ pseudo })
      .eq("id", resident.id);

    expect(error).not.toBeNull();
    expect((await profilDe(resident.id, "pseudo")).data).toEqual({
      pseudo: "Danielle M.",
    });
  });

  it("la personne ne modifie ni son prénom ni son nom", async () => {
    const resident = await nouveauResident();

    const { error } = await resident.client
      .from("profil")
      .update({ prenom: "Autre" })
      .eq("id", resident.id);

    expect(error).not.toBeNull();
    expect((await profilDe(resident.id, "prenom, nom")).data).toEqual(IDENTITE);
  });
});

describe("nom lu par les voisins", () => {
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

  async function publier(organisateur: Compte) {
    const { data, error } = await organisateur.client
      .from("activite")
      .insert({ ...ACTIVITE, organisateur: organisateur.id })
      .select("identifiant_public")
      .single();
    if (error) throw error;
    await publierApresJev(data.identifiant_public);
    return data.identifiant_public as string;
  }

  async function changerPseudo(compte: Compte, pseudo: string) {
    const { error } = await compte.client
      .from("profil")
      .update({ pseudo })
      .eq("id", compte.id);
    if (error) throw error;
  }

  it("la fiche d'une activité nomme son organisateur par son pseudo", async () => {
    const organisateur = await nouveauResident();
    await changerPseudo(organisateur, "Dany");
    const voisin = await nouveauResident();
    const identifiant = await publier(organisateur);

    const { data } = await voisin.client
      .rpc("fiche_activite", { identifiant })
      .single();

    expect(data).toMatchObject({ organisateur_nom_affiche: "Dany" });
  });

  it("l'organisateur membre du conseil syndical est nommé par son pseudo aussi", async () => {
    const syndic = await nouveauSyndic();
    await changerPseudo(syndic, "Coco");
    const voisin = await nouveauResident();
    const identifiant = await publier(syndic);

    const { data } = await voisin.client
      .rpc("fiche_activite", { identifiant })
      .single();

    expect(data).toMatchObject({ organisateur_nom_affiche: "Coco" });
  });

  it("la liste des participants donne les pseudos", async () => {
    const organisateur = await nouveauResident();
    const inscrit = await nouveauResident();
    await changerPseudo(inscrit, "Voisine du 3");
    const identifiant = await publier(organisateur);
    const inscription = await inscrit.client.rpc("s_inscrire", {
      p_identifiant: identifiant,
      p_accompagnants: 0,
    });
    expect(inscription.error).toBeNull();

    const { data } = await organisateur.client.rpc("participants_activite", {
      identifiant,
    });

    expect(data).toEqual([
      { nom_affiche: "Voisine du 3", accompagnants: 0, photo_chemin: null },
    ]);
  });

  it("la fiche d'une activité rend le chemin de la photo de son organisateur, null sans photo", async () => {
    const organisateur = await nouveauResident();
    const voisin = await nouveauResident();
    const identifiant = await publier(organisateur);

    const sans = await voisin.client
      .rpc("fiche_activite", { identifiant })
      .single();
    const chemin = await poserPhoto(organisateur);
    const avec = await voisin.client
      .rpc("fiche_activite", { identifiant })
      .single();

    expect(sans.data).toMatchObject({ organisateur_photo_chemin: null });
    expect(avec.data).toMatchObject({ organisateur_photo_chemin: chemin });
  });

  it("un visiteur ne lit ni le nom ni la photo de l'organisateur", async () => {
    const organisateur = await nouveauResident();
    await poserPhoto(organisateur);
    const identifiant = await publier(organisateur);

    const { data } = await clientVisiteur()
      .rpc("fiche_activite", { identifiant })
      .single();

    expect(data).toMatchObject({
      organisateur_nom_affiche: null,
      organisateur_photo_chemin: null,
    });
  });

  it("la liste des participants donne le chemin de la photo de chacun", async () => {
    const organisateur = await nouveauResident();
    const inscrit = await nouveauResident();
    const chemin = await poserPhoto(inscrit);
    const identifiant = await publier(organisateur);
    await inscrit.client.rpc("s_inscrire", {
      p_identifiant: identifiant,
      p_accompagnants: 0,
    });

    const { data } = await organisateur.client.rpc("participants_activite", {
      identifiant,
    });

    expect(data).toEqual([
      { nom_affiche: "Danielle M.", accompagnants: 0, photo_chemin: chemin },
    ]);
  });
});

describe("informations du profil", () => {
  it("le téléphone, le bâtiment et l'étage sont masqués par défaut", async () => {
    const resident = await nouveauResident();

    const { data } = await profilDe(
      resident.id,
      "telephone, batiment, etage, telephone_visible, batiment_visible, etage_visible",
    );

    expect(data).toEqual({
      telephone: null,
      batiment: null,
      etage: null,
      telephone_visible: false,
      batiment_visible: false,
      etage_visible: false,
    });
  });

  it("la personne renseigne ses informations et choisit ce qu'elle rend visible", async () => {
    const resident = await nouveauResident();
    const informations = {
      telephone: "06 12 34 56 78",
      batiment: "Bât. B",
      etage: 2,
      batiment_visible: true,
    };

    const { error } = await resident.client
      .from("profil")
      .update(informations)
      .eq("id", resident.id);

    expect(error).toBeNull();
    expect(
      (
        await profilDe(
          resident.id,
          "telephone, batiment, etage, batiment_visible, telephone_visible",
        )
      ).data,
    ).toEqual({ ...informations, telephone_visible: false });
  });

  it.each([
    ["un étage négatif", { etage: -1 }],
    ["un étage de 100", { etage: 100 }],
    ["un téléphone de 2 caractères", { telephone: "06" }],
    ["un bâtiment vide", { batiment: "  " }],
  ])("%s est refusé", async (_, informations) => {
    const resident = await nouveauResident();

    const { error } = await resident.client
      .from("profil")
      .update(informations)
      .eq("id", resident.id);

    expect(error).not.toBeNull();
  });

  it("la photo enregistrée est un fichier du dossier de la personne", async () => {
    const resident = await nouveauResident();
    const autre = await nouveauResident();

    const sienne = await resident.client
      .from("profil")
      .update({ photo_chemin: cheminPhoto(resident) })
      .eq("id", resident.id);
    const d_autrui = await resident.client
      .from("profil")
      .update({ photo_chemin: cheminPhoto(autre) })
      .eq("id", resident.id);

    expect(sienne.error).toBeNull();
    expect(d_autrui.error).not.toBeNull();
  });
});

describe("ce que lit chaque rôle", () => {
  async function renseigner(compte: Compte) {
    const { error } = await compte.client
      .from("profil")
      .update({
        pseudo: "Dany",
        telephone: "06 12 34 56 78",
        batiment: "Bât. B",
        etage: 2,
      })
      .eq("id", compte.id);
    if (error) throw error;
  }

  it("un résident lit tout son profil", async () => {
    const resident = await nouveauResident();
    await renseigner(resident);

    const { data } = await resident.client
      .from("profil")
      .select("pseudo, prenom, nom, telephone, batiment, etage")
      .eq("id", resident.id)
      .single();

    expect(data).toEqual({
      pseudo: "Dany",
      ...IDENTITE,
      telephone: "06 12 34 56 78",
      batiment: "Bât. B",
      etage: 2,
    });
  });

  it("un résident ne lit pas la ligne d'un autre", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();
    await renseigner(voisin);

    const { data } = await resident.client
      .from("profil")
      .select("pseudo, prenom, nom")
      .eq("id", voisin.id);

    expect(data).toEqual([]);
  });

  it("le conseil syndical lit tout, prénom et nom réels compris", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident();
    await renseigner(resident);

    const { data } = await syndic.client
      .from("profil")
      .select("pseudo, prenom, nom, telephone, batiment, etage")
      .eq("id", resident.id)
      .single();

    expect(data).toEqual({
      pseudo: "Dany",
      ...IDENTITE,
      telephone: "06 12 34 56 78",
      batiment: "Bât. B",
      etage: 2,
    });
  });

  it("un voisin lit le pseudo, et rien d'autre tant que rien n'est rendu visible", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();
    await renseigner(voisin);

    const { data, error } = await resident.client
      .rpc("fiche_voisin", { voisin: voisin.id })
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({
      pseudo: "Dany",
      telephone: null,
      batiment: null,
      etage: null,
      photo_chemin: null,
    });
  });

  it("un voisin lit en plus chaque champ que la personne rend visible, et seulement lui", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();
    await renseigner(voisin);
    await voisin.client
      .from("profil")
      .update({ telephone_visible: true, etage_visible: true })
      .eq("id", voisin.id);

    const { data } = await resident.client
      .rpc("fiche_voisin", { voisin: voisin.id })
      .single();

    expect(data).toEqual({
      pseudo: "Dany",
      telephone: "06 12 34 56 78",
      batiment: null,
      etage: 2,
      photo_chemin: null,
    });
  });

  it("un voisin lit la photo de la personne sans qu'elle ait rien rendu visible", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();
    const chemin = await poserPhoto(voisin);

    const { data } = await resident.client
      .rpc("fiche_voisin", { voisin: voisin.id })
      .single();

    expect(data).toMatchObject({ photo_chemin: chemin, telephone: null });
  });

  it("la fiche d'un voisin ne contient jamais son prénom ni son nom", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();

    const { data } = await resident.client
      .rpc("fiche_voisin", { voisin: voisin.id })
      .single();

    expect(Object.keys(data as object).sort()).toEqual([
      "batiment",
      "etage",
      "photo_chemin",
      "pseudo",
      "telephone",
    ]);
  });

  it("la fiche d'un voisin dont le compte n'est pas validé est vide", async () => {
    const resident = await nouveauResident();
    const enAttente = await nouveauResident("en_attente");

    const { data } = await resident.client
      .rpc("fiche_voisin", { voisin: enAttente.id })
      .maybeSingle();

    expect(data).toBeNull();
  });

  it("un visiteur ou un compte refusé ne lit pas la fiche d'un voisin", async () => {
    const voisin = await nouveauResident();
    const refuse = await nouveauResident("refuse");

    const visiteur = await clientVisiteur().rpc("fiche_voisin", {
      voisin: voisin.id,
    });
    const compteRefuse = await refuse.client
      .rpc("fiche_voisin", { voisin: voisin.id })
      .maybeSingle();

    expect(visiteur.error).not.toBeNull();
    expect(compteRefuse.data).toBeNull();
  });
});

describe("photo de profil", () => {
  it("la personne dépose sa photo dans son dossier et la relit", async () => {
    const resident = await nouveauResident();
    const chemin = cheminPhoto(resident);

    const depot = await deposer(resident, chemin);
    const lecture = await resident.client.storage.from(BUCKET).download(chemin);

    expect(depot.error).toBeNull();
    expect(lecture.error).toBeNull();
  });

  it("personne ne dépose dans le dossier d'un autre", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();

    const { error } = await deposer(resident, cheminPhoto(voisin));

    expect(error).not.toBeNull();
  });

  it("un fichier qui n'est pas du JPEG est refusé", async () => {
    const resident = await nouveauResident();
    const chemin = cheminPhoto(resident);
    fichiersDeposes.push(chemin);

    const { error } = await resident.client.storage
      .from(BUCKET)
      .upload(chemin, new Blob(["texte"], { type: "text/plain" }), {
        contentType: "text/plain",
      });

    expect(error).not.toBeNull();
  });

  it("les résidents validés et en attente et le conseil syndical lisent la photo d'un autre", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();
    const enAttente = await nouveauResident("en_attente");
    const syndic = await nouveauSyndic();
    const chemin = cheminPhoto(resident);
    await deposer(resident, chemin);

    const parVoisin = await voisin.client.storage.from(BUCKET).download(chemin);
    const parEnAttente = await enAttente.client.storage
      .from(BUCKET)
      .download(chemin);
    const parSyndic = await syndic.client.storage.from(BUCKET).download(chemin);

    expect(parVoisin.error).toBeNull();
    expect(parEnAttente.error).toBeNull();
    expect(parSyndic.error).toBeNull();
  });

  it("un compte refusé ou retiré, et un visiteur, ne lisent pas la photo d'un autre", async () => {
    const resident = await nouveauResident();
    const refuse = await nouveauResident("refuse");
    const retire = await nouveauResident("retire");
    const chemin = cheminPhoto(resident);
    await deposer(resident, chemin);

    const parRefuse = await refuse.client.storage.from(BUCKET).download(chemin);
    const parRetire = await retire.client.storage.from(BUCKET).download(chemin);
    const parVisiteur = await clientVisiteur()
      .storage.from(BUCKET)
      .download(chemin);

    expect(parRefuse.error).not.toBeNull();
    expect(parRetire.error).not.toBeNull();
    expect(parVisiteur.error).not.toBeNull();
  });

  it("un voisin signe l'adresse de la photo d'un autre", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();
    const chemin = cheminPhoto(resident);
    await deposer(resident, chemin);

    const { data, error } = await voisin.client.storage
      .from(BUCKET)
      .createSignedUrl(chemin, 60);

    expect(error).toBeNull();
    expect(data?.signedUrl).toBeTruthy();
  });

  it("la personne retire sa photo, un voisin ne retire pas celle d'un autre", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();
    const chemin = cheminPhoto(resident);
    await deposer(resident, chemin);

    await voisin.client.storage.from(BUCKET).remove([chemin]);
    const encore = await clientAdmin().storage.from(BUCKET).download(chemin);
    await resident.client.storage.from(BUCKET).remove([chemin]);
    const apres = await clientAdmin().storage.from(BUCKET).download(chemin);

    expect(encore.error).toBeNull();
    expect(apres.error).not.toBeNull();
  });
});

describe("centres d'intérêt", () => {
  function ajouter(compte: Compte, libelle: string) {
    return compte.client
      .from("centre_interet")
      .insert({ profil_id: compte.id, libelle })
      .select("id, libelle")
      .single();
  }

  it("la personne ajoute, modifie, lit et supprime ses centres d'intérêt", async () => {
    const resident = await nouveauResident();

    const ajout = await ajouter(resident, "Jardinage");
    expect(ajout.error).toBeNull();
    const modification = await resident.client
      .from("centre_interet")
      .update({ libelle: "Potager" })
      .eq("id", ajout.data!.id)
      .select("libelle");
    const lecture = await resident.client
      .from("centre_interet")
      .select("libelle");
    const suppression = await resident.client
      .from("centre_interet")
      .delete()
      .eq("id", ajout.data!.id)
      .select("id");
    const apres = await resident.client.from("centre_interet").select("id");

    expect(modification.data).toEqual([{ libelle: "Potager" }]);
    expect(lecture.data).toEqual([{ libelle: "Potager" }]);
    expect(suppression.data).toHaveLength(1);
    expect(apres.data).toEqual([]);
  });

  it("un libellé est libre, sans espaces autour", async () => {
    const resident = await nouveauResident();

    const { data } = await ajouter(resident, "  Jeux de société ");

    expect(data!.libelle).toBe("Jeux de société");
  });

  it.each([
    ["vide", "  "],
    ["de plus de 40 caractères", "x".repeat(41)],
  ])("un libellé %s est refusé", async (_, libelle) => {
    const resident = await nouveauResident();

    const { error } = await ajouter(resident, libelle);

    expect(error).not.toBeNull();
  });

  it("le même centre d'intérêt ne s'ajoute pas deux fois, majuscules comprises", async () => {
    const resident = await nouveauResident();
    await ajouter(resident, "Cuisine");

    const { error } = await ajouter(resident, "cuisine");

    expect(error?.code).toBe("23505");
  });

  it("personne n'ajoute un centre d'intérêt au nom d'un autre", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();

    const { error } = await resident.client
      .from("centre_interet")
      .insert({ profil_id: voisin.id, libelle: "Yoga" });

    expect(error).not.toBeNull();
  });

  it("un voisin ne lit, ne modifie et ne supprime pas ceux d'un autre", async () => {
    const resident = await nouveauResident();
    const voisin = await nouveauResident();
    const { data } = await ajouter(voisin, "Yoga");

    const lecture = await resident.client.from("centre_interet").select("id");
    const modification = await resident.client
      .from("centre_interet")
      .update({ libelle: "Piratage" })
      .eq("id", data!.id)
      .select("id");
    const suppression = await resident.client
      .from("centre_interet")
      .delete()
      .eq("id", data!.id)
      .select("id");

    expect(lecture.data).toEqual([]);
    expect(modification.data).toEqual([]);
    expect(suppression.data).toEqual([]);
  });

  it("le conseil syndical les lit", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident();
    await ajouter(resident, "Yoga");

    const { data } = await syndic.client
      .from("centre_interet")
      .select("libelle")
      .eq("profil_id", resident.id);

    expect(data).toEqual([{ libelle: "Yoga" }]);
  });

  it("un visiteur n'en lit aucun", async () => {
    const { data } = await clientVisiteur().from("centre_interet").select("id");

    expect(data ?? []).toEqual([]);
  });

  it("la suppression du compte efface les centres d'intérêt", async () => {
    const resident = await nouveauResident();
    await ajouter(resident, "Yoga");

    const { error } = await resident.client.rpc("supprimer_mon_compte");

    expect(error).toBeNull();
    const { data } = await clientAdmin()
      .from("centre_interet")
      .select("id")
      .eq("profil_id", resident.id);
    expect(data).toEqual([]);
  });
});
