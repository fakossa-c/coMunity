import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";

// Ticket #42 : Mon syndic, des fiches que le conseil syndical tient et que les résidents lisent.
// Une fiche existe sans compte ; un compte syndic sans fiche n'y figure pas.

const fichesCreees: string[] = [];
const fichiersDeposes: string[] = [];

afterAll(async () => {
  const admin = clientAdmin();
  await admin.from("fiche_syndic").delete().in("id", fichesCreees);
  await admin.storage.from("syndic").remove(fichiersDeposes);
});

type Fiche = {
  id: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  photo_chemin: string | null;
  compte_id: string | null;
};

/** Une fiche créée par `syndic`. */
async function nouvelleFiche(syndic: Compte, champs: object = {}) {
  const { data, error } = await syndic.client
    .from("fiche_syndic")
    .insert({ prenom: "Marc", nom: "Lefèvre", ...champs })
    .select("id, prenom, nom, telephone, email, photo_chemin, compte_id")
    .single();
  if (error) throw error;
  fichesCreees.push(data.id);
  return data as Fiche;
}

/** Ce que `compte` lit dans Mon syndic, parmi les fiches d'identifiants `ids`, dans l'ordre. */
async function fichesVues(compte: Compte, ids: string[]) {
  const { data, error } = await compte.client.rpc("lister_fiches_syndic");
  if (error) throw error;
  return (data as (Fiche & { sur_comunity: boolean })[]).filter((f) =>
    ids.includes(f.id),
  );
}

describe("fiches de Mon syndic : qui lit, qui écrit", () => {
  it("le conseil syndical crée une fiche sans compte, avec ou sans téléphone, e-mail et photo", async () => {
    const syndic = await nouveauSyndic();

    const complete = await nouvelleFiche(syndic, {
      prenom: "Nadia",
      nom: "Benali",
      telephone: "01 23 45 67 89",
      email: "nadia.benali@cabinet-exemple.fr",
    });
    const minimale = await nouvelleFiche(syndic);

    expect(complete).toMatchObject({
      prenom: "Nadia",
      nom: "Benali",
      telephone: "01 23 45 67 89",
      email: "nadia.benali@cabinet-exemple.fr",
      photo_chemin: null,
      compte_id: null,
    });
    expect(minimale).toMatchObject({
      telephone: null,
      email: null,
      compte_id: null,
    });
  });

  it("un résident validé ou en attente lit les fiches, le conseil syndical aussi", async () => {
    const syndic = await nouveauSyndic();
    const fiche = await nouvelleFiche(syndic, { telephone: "0612345678" });

    for (const lecteur of [
      syndic,
      await nouveauResident("valide"),
      await nouveauResident("en_attente"),
    ]) {
      const vues = await fichesVues(lecteur, [fiche.id]);
      expect(vues).toHaveLength(1);
      expect(vues[0]).toMatchObject({
        prenom: "Marc",
        nom: "Lefèvre",
        telephone: "0612345678",
        sur_comunity: false,
      });
    }
  });

  it("un résident refusé ou retiré, et un visiteur, n'en lisent aucune", async () => {
    const syndic = await nouveauSyndic();
    const fiche = await nouvelleFiche(syndic);

    for (const statut of ["refuse", "retire"] as const) {
      const resident = await nouveauResident(statut);
      expect(await fichesVues(resident, [fiche.id])).toEqual([]);
      const { data } = await resident.client
        .from("fiche_syndic")
        .select("id")
        .eq("id", fiche.id);
      expect(data).toEqual([]);
    }
    const parVisiteur = await clientVisiteur().rpc("lister_fiches_syndic");
    expect(parVisiteur.data ?? []).toEqual([]);
    const { data } = await clientVisiteur()
      .from("fiche_syndic")
      .select("id")
      .eq("id", fiche.id);
    expect(data ?? []).toEqual([]);
  });

  it("un résident, même validé, ne crée, ne modifie, ne supprime ni ne réordonne une fiche", async () => {
    const syndic = await nouveauSyndic();
    const fiche = await nouvelleFiche(syndic);
    const autre = await nouvelleFiche(syndic, { prenom: "Autre" });
    const resident = await nouveauResident("valide");

    const creation = await resident.client
      .from("fiche_syndic")
      .insert({ prenom: "Intrus", nom: "Test" });
    await resident.client
      .from("fiche_syndic")
      .update({ prenom: "Renommée" })
      .eq("id", fiche.id);
    await resident.client.from("fiche_syndic").delete().eq("id", fiche.id);
    const deplacement = await resident.client.rpc("deplacer_fiche_syndic", {
      fiche: autre.id,
      vers_le_haut: true,
    });

    expect(creation.error).not.toBeNull();
    expect(deplacement.error).not.toBeNull();
    const { data } = await clientAdmin()
      .from("fiche_syndic")
      .select("prenom")
      .eq("id", fiche.id)
      .single();
    expect(data?.prenom).toBe("Marc");
  });

  it("le conseil syndical modifie puis supprime une fiche", async () => {
    const syndic = await nouveauSyndic();
    const fiche = await nouvelleFiche(syndic);

    const modification = await syndic.client
      .from("fiche_syndic")
      .update({ prenom: "Marcel", email: "marcel@cabinet-exemple.fr" })
      .eq("id", fiche.id)
      .select("prenom, email");
    const suppression = await syndic.client
      .from("fiche_syndic")
      .delete()
      .eq("id", fiche.id)
      .select("id");

    expect(modification.data).toEqual([
      { prenom: "Marcel", email: "marcel@cabinet-exemple.fr" },
    ]);
    expect(suppression.data).toEqual([{ id: fiche.id }]);
  });

  it("refuse une fiche sans prénom ou sans nom, un e-mail sans arobase, une photo hors du bucket", async () => {
    const syndic = await nouveauSyndic();

    for (const champs of [
      { prenom: "  " },
      { nom: "" },
      { email: "pas-un-email" },
      { telephone: "0".repeat(31) },
      { photo_chemin: "../autre-bucket/photo.png" },
    ]) {
      const { error } = await syndic.client
        .from("fiche_syndic")
        .insert({ prenom: "Marc", nom: "Lefèvre", ...champs });
      expect(error, JSON.stringify(champs)).not.toBeNull();
    }
  });
});

describe("fiches de Mon syndic : la mention « Sur coMunity »", () => {
  it("une fiche reliée à un compte syndic actif porte la mention, une fiche sans compte non", async () => {
    const syndic = await nouveauSyndic();
    const collegue = await nouveauSyndic();
    const reliee = await nouvelleFiche(syndic, { compte_id: collegue.id });
    const seule = await nouvelleFiche(syndic, { prenom: "Sans compte" });

    const vues = await fichesVues(syndic, [reliee.id, seule.id]);

    expect(vues.map((f) => [f.id, f.sur_comunity])).toEqual([
      [reliee.id, true],
      [seule.id, false],
    ]);
  });

  it("un compte syndic sans fiche n'apparaît pas dans Mon syndic", async () => {
    const syndic = await nouveauSyndic();
    const sansFiche = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    await nouvelleFiche(syndic);

    const { data } = await resident.client.rpc("lister_fiches_syndic");

    expect(
      (data as { compte_id: string | null }[]).map((f) => f.compte_id),
    ).not.toContain(sansFiche.id);
    expect(JSON.stringify(data)).not.toContain(sansFiche.email);
  });

  it("la mention disparaît quand l'accès du compte est retiré", async () => {
    const syndic = await nouveauSyndic();
    const collegue = await nouveauSyndic();
    const fiche = await nouvelleFiche(syndic, { compte_id: collegue.id });

    const retrait = await syndic.client.rpc("retirer_membre_syndic", {
      membre: collegue.id,
    });

    expect(retrait.error).toBeNull();
    const vues = await fichesVues(syndic, [fiche.id]);
    expect(vues.map((f) => f.sur_comunity)).toEqual([false]);
  });

  it("une fiche ne se relie qu'à un compte syndic actif, et un compte n'a qu'une fiche", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const retire = await nouveauSyndic();
    await syndic.client.rpc("retirer_membre_syndic", { membre: retire.id });
    const collegue = await nouveauSyndic();
    await nouvelleFiche(syndic, { compte_id: collegue.id });

    const versResident = await syndic.client
      .from("fiche_syndic")
      .insert({ prenom: "A", nom: "B", compte_id: resident.id });
    const versRetire = await syndic.client
      .from("fiche_syndic")
      .insert({ prenom: "A", nom: "B", compte_id: retire.id });
    const versInconnu = await syndic.client
      .from("fiche_syndic")
      .insert({ prenom: "A", nom: "B", compte_id: randomUUID() });
    const doublon = await syndic.client
      .from("fiche_syndic")
      .insert({ prenom: "A", nom: "B", compte_id: collegue.id });

    expect(versResident.error).not.toBeNull();
    expect(versRetire.error).not.toBeNull();
    expect(versInconnu.error).not.toBeNull();
    expect(doublon.error).not.toBeNull();
  });

  it("le conseil syndical lit le compte relié, un résident ne le lit pas", async () => {
    const syndic = await nouveauSyndic();
    const collegue = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const fiche = await nouvelleFiche(syndic, { compte_id: collegue.id });

    const parSyndic = await fichesVues(syndic, [fiche.id]);
    const parResident = await fichesVues(resident, [fiche.id]);

    expect(parSyndic[0].compte_id).toBe(collegue.id);
    expect(parResident[0].compte_id).toBeNull();
    expect(parResident[0].sur_comunity).toBe(true);
  });

  it("la suppression du compte relié garde la fiche, sans mention", async () => {
    const syndic = await nouveauSyndic();
    const collegue = await nouveauSyndic();
    const fiche = await nouvelleFiche(syndic, { compte_id: collegue.id });

    const { error } = await clientAdmin().auth.admin.deleteUser(collegue.id);

    expect(error).toBeNull();
    const vues = await fichesVues(syndic, [fiche.id]);
    expect(vues).toHaveLength(1);
    expect(vues[0]).toMatchObject({ compte_id: null, sur_comunity: false });
  });
});

describe("fiches de Mon syndic : l'ordre", () => {
  it("les fiches se rangent dans l'ordre de création", async () => {
    const syndic = await nouveauSyndic();

    const premiere = await nouvelleFiche(syndic, { prenom: "Première" });
    const seconde = await nouvelleFiche(syndic, { prenom: "Seconde" });

    const vues = await fichesVues(syndic, [premiere.id, seconde.id]);
    expect(vues.map((f) => f.id)).toEqual([premiere.id, seconde.id]);
  });

  it("le conseil syndical monte et descend une fiche ; sans voisine, rien ne bouge", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const a = await nouvelleFiche(syndic, { prenom: "A" });
    const b = await nouvelleFiche(syndic, { prenom: "B" });
    const c = await nouvelleFiche(syndic, { prenom: "C" });
    const ids = [a.id, b.id, c.id];
    const ordre = async () =>
      (await fichesVues(resident, ids)).map((f) => f.prenom);

    await syndic.client.rpc("deplacer_fiche_syndic", {
      fiche: c.id,
      vers_le_haut: true,
    });
    expect(await ordre()).toEqual(["A", "C", "B"]);

    await syndic.client.rpc("deplacer_fiche_syndic", {
      fiche: a.id,
      vers_le_haut: false,
    });
    expect(await ordre()).toEqual(["C", "A", "B"]);

    await syndic.client.rpc("deplacer_fiche_syndic", {
      fiche: c.id,
      vers_le_haut: true,
    });
    await syndic.client.rpc("deplacer_fiche_syndic", {
      fiche: b.id,
      vers_le_haut: false,
    });
    expect(await ordre()).toEqual(["C", "A", "B"]);
  });

  it("déplacer une fiche inconnue échoue", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await syndic.client.rpc("deplacer_fiche_syndic", {
      fiche: randomUUID(),
      vers_le_haut: true,
    });

    expect(error).not.toBeNull();
  });

  it("la position ne s'écrit pas directement", async () => {
    const syndic = await nouveauSyndic();
    const fiche = await nouvelleFiche(syndic);

    const { error } = await syndic.client
      .from("fiche_syndic")
      .update({ position: 0 })
      .eq("id", fiche.id);

    expect(error).not.toBeNull();
  });
});

describe("fiches de Mon syndic : la photo", () => {
  const JPEG = new Blob(["\xff\xd8\xff\xe0 photo"], { type: "image/jpeg" });

  async function deposer(compte: Compte, chemin: string, fichier = JPEG) {
    fichiersDeposes.push(chemin);
    return compte.client.storage
      .from("syndic")
      .upload(chemin, fichier, { contentType: fichier.type });
  }

  it("le conseil syndical dépose une photo, que lisent les résidents validés et en attente", async () => {
    const syndic = await nouveauSyndic();
    const chemin = `${randomUUID()}.jpg`;

    const depot = await deposer(syndic, chemin);

    expect(depot.error).toBeNull();
    for (const lecteur of [
      syndic,
      await nouveauResident("valide"),
      await nouveauResident("en_attente"),
    ]) {
      const { data, error } = await lecteur.client.storage
        .from("syndic")
        .createSignedUrl(chemin, 60);
      expect(error).toBeNull();
      const reponse = await fetch(data!.signedUrl);
      expect(reponse.status).toBe(200);
    }
  });

  it("le bucket n'est pas public : ni l'adresse publique, ni un visiteur, ni un résident refusé ou retiré ne lisent la photo", async () => {
    const syndic = await nouveauSyndic();
    const chemin = `${randomUUID()}.jpg`;
    await deposer(syndic, chemin);

    const { publicUrl } = clientVisiteur()
      .storage.from("syndic")
      .getPublicUrl(chemin).data;
    expect((await fetch(publicUrl)).status).not.toBe(200);

    const parVisiteur = await clientVisiteur()
      .storage.from("syndic")
      .createSignedUrl(chemin, 60);
    expect(parVisiteur.error).not.toBeNull();
    for (const statut of ["refuse", "retire"] as const) {
      const resident = await nouveauResident(statut);
      const { error } = await resident.client.storage
        .from("syndic")
        .createSignedUrl(chemin, 60);
      expect(error).not.toBeNull();
    }
  });

  it("un résident ne dépose ni ne retire aucune photo", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const chemin = `${randomUUID()}.jpg`;
    await deposer(syndic, chemin);

    const depot = await deposer(resident, `${randomUUID()}.jpg`);
    const retrait = await resident.client.storage
      .from("syndic")
      .remove([chemin]);

    expect(depot.error).not.toBeNull();
    expect(retrait.data ?? []).toEqual([]);
  });

  it("le bucket refuse ce qui n'est pas une photo JPEG, ou un nom hors de la forme attendue", async () => {
    const syndic = await nouveauSyndic();

    const pdf = await deposer(
      syndic,
      `${randomUUID()}.jpg`,
      new Blob(["%PDF-1.4"], { type: "application/pdf" }),
    );
    const mauvaisNom = await deposer(syndic, "photo.jpg");

    expect(pdf.error).not.toBeNull();
    expect(mauvaisNom.error).not.toBeNull();
  });

  it("le conseil syndical retire une photo", async () => {
    const syndic = await nouveauSyndic();
    const chemin = `${randomUUID()}.jpg`;
    await deposer(syndic, chemin);

    const retrait = await syndic.client.storage.from("syndic").remove([chemin]);

    expect(retrait.data).toHaveLength(1);
  });

  it("une fiche garde le chemin de sa photo", async () => {
    const syndic = await nouveauSyndic();
    const chemin = `${randomUUID()}.jpg`;

    const fiche = await nouvelleFiche(syndic, { photo_chemin: chemin });

    expect(fiche.photo_chemin).toBe(chemin);
  });
});
