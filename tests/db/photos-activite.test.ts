import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, inject, it } from "vitest";
import { cheminPhoto, urlPhoto } from "@/lib/photos-activite";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";

// Ticket #10 : jusqu'à 5 photos par activité, dans le bucket public `activites`. Le créateur et
// le conseil syndical les déposent et les retirent, tout le monde les lit ; la liste ordonnée
// vit dans `activite.photos`, que seule la fonction `definir_photos_activite` écrit.

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

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], {
  type: "image/jpeg",
});

const fichiersDeposes: string[] = [];

afterAll(async () => {
  await clientAdmin().storage.from("activites").remove(fichiersDeposes);
});

type ActivitePubliee = { id: string; identifiant: string };

/** Publie une activité au nom de `organisateur`. */
async function publier(organisateur: Compte): Promise<ActivitePubliee> {
  const { data, error } = await organisateur.client
    .from("activite")
    .insert({ ...ACTIVITE, organisateur: organisateur.id })
    .select("id, identifiant_public")
    .single();
  if (error) throw error;
  return { id: data.id, identifiant: data.identifiant_public };
}

/** Le chemin d'une nouvelle photo de l'activité. */
function nouveauChemin(activite: ActivitePubliee) {
  return cheminPhoto(activite.id, randomUUID());
}

function deposer(compte: Compte, chemin: string, fichier: Blob = JPEG) {
  fichiersDeposes.push(chemin);
  return compte.client.storage
    .from("activites")
    .upload(chemin, fichier, { contentType: fichier.type });
}

function definir(compte: Compte, activite: ActivitePubliee, chemins: string[]) {
  return compte.client.rpc("definir_photos_activite", {
    p_identifiant: activite.identifiant,
    p_chemins: chemins,
  });
}

function fiche(lecteur: { client: Compte["client"] }, identifiant: string) {
  return lecteur.client.rpc("fiche_activite", { identifiant }).maybeSingle();
}

describe("dépôt dans le bucket", () => {
  it("le créateur dépose une photo, lisible par tout visiteur à son adresse", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);
    const chemin = nouveauChemin(activite);

    const { error } = await deposer(createur, chemin);

    expect(error).toBeNull();
    const reponse = await fetch(urlPhoto(inject("supabase").url, chemin));
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get("content-type")).toBe("image/jpeg");
  });

  it("un autre résident ne dépose rien dans le dossier de l'activité d'autrui", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    const activite = await publier(createur);

    const { error } = await deposer(voisin, nouveauChemin(activite));

    expect(error).not.toBeNull();
  });

  it("le conseil syndical dépose dans le dossier d'une activité de résident", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const activite = await publier(createur);

    const { error } = await deposer(syndic, nouveauChemin(activite));

    expect(error).toBeNull();
  });

  it("personne ne dépose dans le dossier d'une activité qui n'existe pas", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await deposer(
      resident,
      cheminPhoto(randomUUID(), randomUUID()),
    );

    expect(error).not.toBeNull();
  });

  it("un compte en attente de validation ne dépose rien, même dans le dossier de son activité", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);
    await clientAdmin()
      .from("profil")
      .update({ statut: "retire" })
      .eq("id", createur.id);

    const { error } = await deposer(createur, nouveauChemin(activite));

    expect(error).not.toBeNull();
  });

  it("le bucket ne garde que du JPEG : ni GIF ni PDF", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);

    const gif = await deposer(
      createur,
      nouveauChemin(activite),
      new Blob(["GIF89a"], { type: "image/gif" }),
    );
    const pdf = await deposer(
      createur,
      nouveauChemin(activite),
      new Blob(["%PDF-1.4"], { type: "application/pdf" }),
    );

    expect(gif.error).not.toBeNull();
    expect(pdf.error).not.toBeNull();
  });

  it("le bucket refuse une photo de plus de 2 Mo", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);
    const lourde = new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], {
      type: "image/jpeg",
    });

    const { error } = await deposer(createur, nouveauChemin(activite), lourde);

    expect(error).not.toBeNull();
  });

  it("un nom de fichier hors du modèle « <photo>.jpg » est refusé", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);

    const { error } = await deposer(createur, `${activite.id}/autre.jpg`);

    expect(error).not.toBeNull();
  });
});

describe("retrait dans le bucket", () => {
  it("le créateur retire sa photo, pas un autre résident", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    const activite = await publier(createur);
    const chemin = nouveauChemin(activite);
    await deposer(createur, chemin);

    const parVoisin = await voisin.client.storage
      .from("activites")
      .remove([chemin]);
    const parCreateur = await createur.client.storage
      .from("activites")
      .remove([chemin]);

    expect(parVoisin.data ?? []).toEqual([]);
    expect(parCreateur.data).toHaveLength(1);
  });

  it("le conseil syndical retire la photo d'une activité de résident", async () => {
    const createur = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const activite = await publier(createur);
    const chemin = nouveauChemin(activite);
    await deposer(createur, chemin);

    const { data } = await syndic.client.storage
      .from("activites")
      .remove([chemin]);

    expect(data).toHaveLength(1);
  });

  it("une fois l'activité supprimée, ses photos restantes se retirent par n'importe quel compte connecté", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    const activite = await publier(createur);
    const chemin = nouveauChemin(activite);
    await deposer(createur, chemin);
    const suppression = await createur.client.rpc("supprimer_activite", {
      p_identifiant: activite.identifiant,
    });
    expect(suppression.error).toBeNull();

    const { data } = await voisin.client.storage
      .from("activites")
      .remove([chemin]);

    expect(data).toHaveLength(1);
  });
});

describe("liste ordonnée des photos", () => {
  it("le créateur fixe jusqu'à 5 photos, la fiche les rend dans l'ordre, le catalogue donne la première", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);
    const chemins = Array.from({ length: 5 }, () => nouveauChemin(activite));

    const { error } = await definir(createur, activite, chemins);

    expect(error).toBeNull();
    const { data } = await fiche(createur, activite.identifiant);
    expect(data).toMatchObject({ photos: chemins });
    const catalogue = await createur.client.rpc("catalogue_activites");
    expect(
      (catalogue.data as { id: string; photo: string | null }[]).find(
        (a) => a.id === activite.id,
      )?.photo,
    ).toBe(chemins[0]);
  });

  it("une activité sans photo a une liste vide, et pas de photo au catalogue", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);

    const { data } = await fiche(createur, activite.identifiant);
    expect(data).toMatchObject({ photos: [] });
    const catalogue = await createur.client.rpc("catalogue_activites");
    expect(
      (catalogue.data as { id: string; photo: string | null }[]).find(
        (a) => a.id === activite.id,
      )?.photo,
    ).toBeNull();
  });

  it("un visiteur lit les photos d'une fiche publique", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);
    const chemin = nouveauChemin(activite);
    await definir(createur, activite, [chemin]);

    const { data } = await fiche(
      { client: clientVisiteur() },
      activite.identifiant,
    );

    expect(data).toMatchObject({ photos: [chemin] });
  });

  it("la fonction rend les chemins retirés, pour que le serveur supprime leurs fichiers", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);
    const [a, b, c] = [1, 2, 3].map(() => nouveauChemin(activite));
    await definir(createur, activite, [a, b, c]);

    const { data, error } = await definir(createur, activite, [c, a]);

    expect(error).toBeNull();
    expect(data).toEqual([b]);
    const { data: apres } = await fiche(createur, activite.identifiant);
    expect(apres).toMatchObject({ photos: [c, a] });
  });

  it("refuse une sixième photo", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);
    const chemins = Array.from({ length: 6 }, () => nouveauChemin(activite));

    const { error } = await definir(createur, activite, chemins);

    expect(error?.code).toBe("P0009");
  });

  it("refuse un chemin d'une autre activité, ou hors du modèle", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);
    const autre = await publier(createur);

    const autreActivite = await definir(createur, activite, [
      nouveauChemin(autre),
    ]);
    const horsModele = await definir(createur, activite, [
      `${activite.id}/../${randomUUID()}.jpg`,
    ]);
    const doublon = nouveauChemin(activite);
    const deuxFois = await definir(createur, activite, [doublon, doublon]);

    expect(autreActivite.error?.code).toBe("22023");
    expect(horsModele.error?.code).toBe("22023");
    expect(deuxFois.error?.code).toBe("22023");
  });

  it("un autre résident ne change pas les photos, le conseil syndical si", async () => {
    const createur = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    const syndic = await nouveauSyndic();
    const activite = await publier(createur);
    const chemin = nouveauChemin(activite);
    await definir(createur, activite, [chemin]);

    const parVoisin = await definir(voisin, activite, []);
    expect(parVoisin.error?.code).toBe("42501");
    expect((await fiche(createur, activite.identifiant)).data).toMatchObject({
      photos: [chemin],
    });

    const parSyndic = await definir(syndic, activite, []);
    expect(parSyndic.error).toBeNull();
    expect((await fiche(createur, activite.identifiant)).data).toMatchObject({
      photos: [],
    });
  });

  it("un visiteur ne change rien", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);

    const { error } = await clientVisiteur().rpc("definir_photos_activite", {
      p_identifiant: activite.identifiant,
      p_chemins: [],
    });

    expect(error).not.toBeNull();
  });

  it("la colonne ne s'écrit pas directement, même par le créateur", async () => {
    const createur = await nouveauResident("valide");
    const activite = await publier(createur);

    const { error } = await createur.client
      .from("activite")
      .update({ photos: [nouveauChemin(activite)] })
      .eq("id", activite.id);

    expect(error).not.toBeNull();
  });

  it("une activité inconnue est signalée", async () => {
    const createur = await nouveauResident("valide");

    const { error } = await createur.client.rpc("definir_photos_activite", {
      p_identifiant: "inexistant0000",
      p_chemins: [],
    });

    expect(error?.code).toBe("P0002");
  });
});
