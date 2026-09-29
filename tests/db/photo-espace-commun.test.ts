import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { cheminPhotoEspace } from "@/lib/photo-espace-commun";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";

// Ticket #93 : la photo d'un espace commun. Le conseil syndical la dépose, la remplace et la
// retire ; les résidents validés et en attente la lisent, les autres comptes non. La colonne
// `espace_commun.photo_chemin` dit laquelle des photos du bucket privé `espaces-communs` est
// celle de l'espace.

const BUCKET = "espaces-communs";

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], {
  type: "image/jpeg",
});

const espacesCrees: string[] = [];
const fichiersDeposes: string[] = [];

afterAll(async () => {
  const admin = clientAdmin();
  await admin.storage.from(BUCKET).remove(fichiersDeposes);
  await admin.from("espace_commun").delete().in("id", espacesCrees);
});

async function nouvelEspace() {
  const { data, error } = await clientAdmin()
    .from("espace_commun")
    .insert({ nom: `Salle ${randomUUID().slice(0, 8)}` })
    .select("id")
    .single();
  if (error) throw error;
  espacesCrees.push(data.id);
  return data.id as string;
}

function deposer(
  compte: Compte,
  chemin = cheminPhotoEspace(randomUUID()),
  fichier: Blob = JPEG,
) {
  fichiersDeposes.push(chemin);
  return compte.client.storage
    .from(BUCKET)
    .upload(chemin, fichier, { contentType: fichier.type });
}

/** Vrai quand le fichier est dans le bucket, vu par l'administration. */
async function existe(chemin: string) {
  const { data } = await clientAdmin().storage.from(BUCKET).download(chemin);
  return data !== null;
}

describe("dépôt et retrait dans le bucket", () => {
  it("le conseil syndical dépose une photo", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await deposer(syndic);

    expect(error).toBeNull();
  });

  it("un résident, même validé, ne dépose rien", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await deposer(resident);

    expect(error).not.toBeNull();
  });

  it("un visiteur ne dépose rien", async () => {
    const { error } = await clientVisiteur()
      .storage.from(BUCKET)
      .upload(cheminPhotoEspace(randomUUID()), JPEG, {
        contentType: "image/jpeg",
      });

    expect(error).not.toBeNull();
  });

  it("le conseil syndical ne dépose que sous un nom de photo d'espace commun", async () => {
    const syndic = await nouveauSyndic();

    for (const chemin of [
      "photo.jpg",
      `dossier/${randomUUID()}.jpg`,
      `${randomUUID()}.jpeg`,
    ]) {
      const { error } = await deposer(syndic, chemin);
      expect(error, chemin).not.toBeNull();
    }
  });

  it("le bucket refuse tout ce qui n'est pas du JPEG, et au-delà de 2 Mo", async () => {
    const syndic = await nouveauSyndic();

    const png = await deposer(
      syndic,
      cheminPhotoEspace(randomUUID()),
      new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
        type: "image/png",
      }),
    );
    const lourde = await deposer(
      syndic,
      cheminPhotoEspace(randomUUID()),
      new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: "image/jpeg" }),
    );

    expect(png.error).not.toBeNull();
    expect(lourde.error).not.toBeNull();
  });

  it("le conseil syndical retire une photo, un résident non", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const chemin = cheminPhotoEspace(randomUUID());
    await deposer(syndic, chemin);

    const parResident = await resident.client.storage
      .from(BUCKET)
      .remove([chemin]);
    expect(parResident.data ?? []).toEqual([]);
    expect(await existe(chemin)).toBe(true);

    const parSyndic = await syndic.client.storage.from(BUCKET).remove([chemin]);
    expect(parSyndic.data).toHaveLength(1);
    expect(await existe(chemin)).toBe(false);
  });
});

describe("lecture de la photo", () => {
  it("un résident validé, un résident en attente et le conseil syndical la lisent", async () => {
    const syndic = await nouveauSyndic();
    const chemin = cheminPhotoEspace(randomUUID());
    await deposer(syndic, chemin);

    for (const lecteur of [
      await nouveauResident("valide"),
      await nouveauResident("en_attente"),
      syndic,
    ]) {
      const { data, error } = await lecteur.client.storage
        .from(BUCKET)
        .createSignedUrl(chemin, 60);
      expect(error).toBeNull();
      const reponse = await fetch(data!.signedUrl);
      expect(reponse.status).toBe(200);
      expect(reponse.headers.get("content-type")).toBe("image/jpeg");
    }
  });

  it("un résident refusé ou retiré, et un visiteur, ne la lisent pas", async () => {
    const syndic = await nouveauSyndic();
    const chemin = cheminPhotoEspace(randomUUID());
    await deposer(syndic, chemin);

    for (const lecteur of [
      (await nouveauResident("refuse")).client,
      (await nouveauResident("retire")).client,
      clientVisiteur(),
    ]) {
      const { error } = await lecteur.storage
        .from(BUCKET)
        .createSignedUrl(chemin, 60);
      expect(error).not.toBeNull();
    }
  });

  it("l'adresse publique du bucket ne sert rien : le bucket est privé", async () => {
    const syndic = await nouveauSyndic();
    const chemin = cheminPhotoEspace(randomUUID());
    await deposer(syndic, chemin);
    const { data } = syndic.client.storage.from(BUCKET).getPublicUrl(chemin);

    const reponse = await fetch(data.publicUrl);

    expect(reponse.ok).toBe(false);
  });
});

describe("colonne photo_chemin", () => {
  it("le conseil syndical l'enregistre, la remplace et la retire", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();
    const premiere = cheminPhotoEspace(randomUUID());
    const seconde = cheminPhotoEspace(randomUUID());

    for (const chemin of [premiere, seconde, null]) {
      const { data, error } = await syndic.client
        .from("espace_commun")
        .update({ photo_chemin: chemin })
        .eq("id", id)
        .select("photo_chemin");
      expect(error).toBeNull();
      expect(data).toEqual([{ photo_chemin: chemin }]);
    }
  });

  it("un espace commun n'a pas de photo tant qu'on n'en a pas choisi", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();

    const { data } = await syndic.client
      .from("espace_commun")
      .select("photo_chemin")
      .eq("id", id)
      .single();

    expect(data).toEqual({ photo_chemin: null });
  });

  it("un résident ne la modifie pas", async () => {
    const resident = await nouveauResident("valide");
    const id = await nouvelEspace();

    const { data } = await resident.client
      .from("espace_commun")
      .update({ photo_chemin: cheminPhotoEspace(randomUUID()) })
      .eq("id", id)
      .select("id");

    expect(data ?? []).toEqual([]);
    const { data: apres } = await clientAdmin()
      .from("espace_commun")
      .select("photo_chemin")
      .eq("id", id)
      .single();
    expect(apres).toEqual({ photo_chemin: null });
  });

  it("un résident validé et un résident en attente la lisent avec l'espace", async () => {
    const id = await nouvelEspace();
    const chemin = cheminPhotoEspace(randomUUID());
    await clientAdmin()
      .from("espace_commun")
      .update({ photo_chemin: chemin })
      .eq("id", id);

    for (const statut of ["valide", "en_attente"] as const) {
      const resident = await nouveauResident(statut);
      const { data } = await resident.client
        .from("espace_commun")
        .select("photo_chemin")
        .eq("id", id)
        .single();
      expect(data).toEqual({ photo_chemin: chemin });
    }
  });

  it("une photo n'illustre qu'un seul espace commun", async () => {
    const syndic = await nouveauSyndic();
    const chemin = cheminPhotoEspace(randomUUID());
    const premier = await nouvelEspace();
    const second = await nouvelEspace();
    await syndic.client
      .from("espace_commun")
      .update({ photo_chemin: chemin })
      .eq("id", premier);

    const { error } = await syndic.client
      .from("espace_commun")
      .update({ photo_chemin: chemin })
      .eq("id", second);

    expect(error?.code).toBe("23505");
  });

  it("refuse un chemin qui n'est pas celui d'une photo du bucket", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();

    for (const chemin of [
      "../autre.jpg",
      "dossier/photo.jpg",
      `${randomUUID()}.png`,
      "n-importe-quoi",
    ]) {
      const { error } = await syndic.client
        .from("espace_commun")
        .update({ photo_chemin: chemin })
        .eq("id", id);
      expect(error?.code, chemin).toBe("23514");
    }
  });
});
