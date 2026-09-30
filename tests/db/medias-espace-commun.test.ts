import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { cheminPhotoEspace } from "@/lib/photo-espace-commun";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
} from "./clients";

// Ticket #135 : plusieurs photos, dimensions, hauteur sous plafond et plan de situation d'un
// espace commun. Le conseil syndical écrit, les résidents validés et en attente lisent. La photo
// unique du ticket #93 (`photo_chemin`) reste la première photo : sans perte, dans les deux sens.

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

async function nouvelEspace(champs: Record<string, unknown> = {}) {
  const { data, error } = await clientAdmin()
    .from("espace_commun")
    .insert({ nom: `Salle ${randomUUID().slice(0, 8)}`, ...champs })
    .select("id")
    .single();
  if (error) throw error;
  espacesCrees.push(data.id);
  return data.id as string;
}

const chemins = (nombre: number) =>
  Array.from({ length: nombre }, () => cheminPhotoEspace(randomUUID()));

async function lire(id: string) {
  const { data, error } = await clientAdmin()
    .from("espace_commun")
    .select(
      "photo_chemin, photos, longueur_m, largeur_m, hauteur_plafond_m, plan_chemin",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

describe("photos d'un espace commun", () => {
  it("un espace n'a aucune photo tant qu'on n'en a pas choisi", async () => {
    const id = await nouvelEspace();

    expect(await lire(id)).toMatchObject({ photos: [], photo_chemin: null });
  });

  it("le conseil syndical fixe la liste des photos, dans l'ordre, et la première devient l'image de la carte", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();
    const [a, b, c] = chemins(3);

    const { data, error } = await syndic.client
      .from("espace_commun")
      .update({ photos: [a, b, c] })
      .eq("id", id)
      .select("photos, photo_chemin");
    expect(error).toBeNull();
    expect(data).toEqual([{ photos: [a, b, c], photo_chemin: a }]);

    // Réordonner, puis retirer : la première suit.
    await syndic.client
      .from("espace_commun")
      .update({ photos: [c, a] })
      .eq("id", id);
    expect(await lire(id)).toMatchObject({ photos: [c, a], photo_chemin: c });

    await syndic.client
      .from("espace_commun")
      .update({ photos: [] })
      .eq("id", id);
    expect(await lire(id)).toMatchObject({ photos: [], photo_chemin: null });
  });

  it("le conseil syndical crée un espace avec ses photos", async () => {
    const syndic = await nouveauSyndic();
    const [a, b] = chemins(2);

    const { data, error } = await syndic.client
      .from("espace_commun")
      .insert({ nom: `Salle ${randomUUID().slice(0, 8)}`, photos: [a, b] })
      .select("id, photos, photo_chemin")
      .single();
    expect(error).toBeNull();
    espacesCrees.push(data!.id);

    expect(data).toMatchObject({ photos: [a, b], photo_chemin: a });
  });

  it("la photo unique du ticket #93 reste valable : l'écrire seule en fait la première photo", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();
    const [ancienne, autre] = chemins(2);

    await syndic.client
      .from("espace_commun")
      .update({ photo_chemin: ancienne })
      .eq("id", id);
    expect(await lire(id)).toMatchObject({
      photos: [ancienne],
      photo_chemin: ancienne,
    });

    // Le code de `main` remplace la photo, puis la retire : la liste suit, sans reste.
    await syndic.client
      .from("espace_commun")
      .update({ photo_chemin: autre })
      .eq("id", id);
    expect(await lire(id)).toMatchObject({ photos: [autre] });
    await syndic.client
      .from("espace_commun")
      .update({ photo_chemin: null })
      .eq("id", id);
    expect(await lire(id)).toMatchObject({ photos: [], photo_chemin: null });
  });

  it("un espace créé avec la seule photo du ticket #93 l'a aussi comme première photo", async () => {
    const [ancienne] = chemins(1);

    const id = await nouvelEspace({ photo_chemin: ancienne });

    expect(await lire(id)).toMatchObject({
      photos: [ancienne],
      photo_chemin: ancienne,
    });
  });

  it("refuse plus de 5 photos, un doublon et un chemin qui n'est pas celui d'une photo", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();
    const [a] = chemins(1);

    for (const liste of [
      chemins(6),
      [a, a],
      ["../autre.jpg"],
      [`dossier/${randomUUID()}.jpg`],
      [`${randomUUID()}.png`],
    ]) {
      const { error } = await syndic.client
        .from("espace_commun")
        .update({ photos: liste })
        .eq("id", id);
      expect(error?.code, JSON.stringify(liste)).toBe("23514");
    }
    expect(await lire(id)).toMatchObject({ photos: [] });
  });

  it("accepte exactement 5 photos", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();

    const { error } = await syndic.client
      .from("espace_commun")
      .update({ photos: chemins(5) })
      .eq("id", id);

    expect(error).toBeNull();
  });

  it("un résident, même validé, ne modifie pas les photos", async () => {
    const resident = await nouveauResident("valide");
    const id = await nouvelEspace();

    const { data } = await resident.client
      .from("espace_commun")
      .update({ photos: chemins(2) })
      .eq("id", id)
      .select("id");

    expect(data ?? []).toEqual([]);
    expect(await lire(id)).toMatchObject({ photos: [] });
  });

  it("un résident validé et un résident en attente lisent les photos avec l'espace, les autres comptes non", async () => {
    const photos = chemins(2);
    const id = await nouvelEspace({ photos });

    for (const statut of ["valide", "en_attente"] as const) {
      const resident = await nouveauResident(statut);
      const { data } = await resident.client
        .from("espace_commun")
        .select("photos")
        .eq("id", id)
        .single();
      expect(data, statut).toEqual({ photos });
    }
    for (const lecteur of [
      (await nouveauResident("refuse")).client,
      (await nouveauResident("retire")).client,
      clientVisiteur(),
    ]) {
      const { data } = await lecteur
        .from("espace_commun")
        .select("photos")
        .eq("id", id);
      expect(data ?? []).toEqual([]);
    }
  });
});

describe("dimensions et hauteur sous plafond", () => {
  it("le conseil syndical les enregistre et les retire", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();

    const { data, error } = await syndic.client
      .from("espace_commun")
      .update({ longueur_m: 8, largeur_m: 6.5, hauteur_plafond_m: 2.7 })
      .eq("id", id)
      .select("longueur_m, largeur_m, hauteur_plafond_m");
    expect(error).toBeNull();
    expect(data).toEqual([
      { longueur_m: 8, largeur_m: 6.5, hauteur_plafond_m: 2.7 },
    ]);

    await syndic.client
      .from("espace_commun")
      .update({ longueur_m: null, largeur_m: null, hauteur_plafond_m: null })
      .eq("id", id);
    expect(await lire(id)).toMatchObject({
      longueur_m: null,
      largeur_m: null,
      hauteur_plafond_m: null,
    });
  });

  it("une hauteur seule est valable : les dimensions sont facultatives", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();

    const { error } = await syndic.client
      .from("espace_commun")
      .update({ hauteur_plafond_m: 3 })
      .eq("id", id);

    expect(error).toBeNull();
  });

  it("refuse une dimension hors de 0,5 à 100 m et une hauteur hors de 1 à 15 m, les bornes passent", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();

    for (const champs of [
      { longueur_m: 0.4, largeur_m: 6 },
      { longueur_m: 8, largeur_m: 100.5 },
      { longueur_m: 0, largeur_m: 6 },
      { longueur_m: -3, largeur_m: 6 },
      { hauteur_plafond_m: 0.9 },
      { hauteur_plafond_m: 15.5 },
    ]) {
      const { error } = await syndic.client
        .from("espace_commun")
        .update(champs)
        .eq("id", id);
      expect(error?.code, JSON.stringify(champs)).toBe("23514");
    }

    const { error } = await syndic.client
      .from("espace_commun")
      .update({
        longueur_m: 0.5,
        largeur_m: 100,
        hauteur_plafond_m: 15,
      })
      .eq("id", id);
    expect(error).toBeNull();
  });

  it("la longueur et la largeur vont ensemble", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();

    for (const champs of [{ longueur_m: 8 }, { largeur_m: 6 }]) {
      const { error } = await syndic.client
        .from("espace_commun")
        .update(champs)
        .eq("id", id);
      expect(error?.code, JSON.stringify(champs)).toBe("23514");
    }
  });

  it("un résident ne les modifie pas, un résident validé et un résident en attente les lisent", async () => {
    const id = await nouvelEspace({
      longueur_m: 8,
      largeur_m: 6,
      hauteur_plafond_m: 2.7,
    });

    const modifiant = await nouveauResident("valide");
    const { data } = await modifiant.client
      .from("espace_commun")
      .update({ hauteur_plafond_m: 9 })
      .eq("id", id)
      .select("id");
    expect(data ?? []).toEqual([]);
    expect(await lire(id)).toMatchObject({ hauteur_plafond_m: 2.7 });

    for (const statut of ["valide", "en_attente"] as const) {
      const resident = await nouveauResident(statut);
      const { data: lu } = await resident.client
        .from("espace_commun")
        .select("longueur_m, largeur_m, hauteur_plafond_m")
        .eq("id", id)
        .single();
      expect(lu, statut).toEqual({
        longueur_m: 8,
        largeur_m: 6,
        hauteur_plafond_m: 2.7,
      });
    }
  });
});

describe("plan de situation", () => {
  it("le conseil syndical l'enregistre, le remplace et le retire", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();
    const [premier, second] = chemins(2);

    for (const plan of [premier, second, null]) {
      const { data, error } = await syndic.client
        .from("espace_commun")
        .update({ plan_chemin: plan })
        .eq("id", id)
        .select("plan_chemin");
      expect(error).toBeNull();
      expect(data).toEqual([{ plan_chemin: plan }]);
    }
  });

  it("le plan est indépendant des photos", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();
    const [photo, plan] = chemins(2);

    await syndic.client
      .from("espace_commun")
      .update({ photos: [photo], plan_chemin: plan })
      .eq("id", id);

    expect(await lire(id)).toMatchObject({
      photos: [photo],
      photo_chemin: photo,
      plan_chemin: plan,
    });
  });

  it("refuse un chemin qui n'est pas celui d'un fichier du bucket", async () => {
    const syndic = await nouveauSyndic();
    const id = await nouvelEspace();

    for (const chemin of [
      "../plan.jpg",
      "dossier/plan.jpg",
      "n-importe-quoi",
    ]) {
      const { error } = await syndic.client
        .from("espace_commun")
        .update({ plan_chemin: chemin })
        .eq("id", id);
      expect(error?.code, chemin).toBe("23514");
    }
  });

  it("un plan ne sert qu'un seul espace commun", async () => {
    const syndic = await nouveauSyndic();
    const [plan] = chemins(1);
    const premier = await nouvelEspace({ plan_chemin: plan });
    const second = await nouvelEspace();

    const { error } = await syndic.client
      .from("espace_commun")
      .update({ plan_chemin: plan })
      .eq("id", second);

    expect(error?.code).toBe("23505");
    expect(await lire(premier)).toMatchObject({ plan_chemin: plan });
  });

  it("un résident ne le modifie pas, un résident validé et un résident en attente le lisent", async () => {
    const [plan, autre] = chemins(2);
    const id = await nouvelEspace({ plan_chemin: plan });

    const modifiant = await nouveauResident("valide");
    const { data } = await modifiant.client
      .from("espace_commun")
      .update({ plan_chemin: autre })
      .eq("id", id)
      .select("id");
    expect(data ?? []).toEqual([]);

    for (const statut of ["valide", "en_attente"] as const) {
      const resident = await nouveauResident(statut);
      const { data: lu } = await resident.client
        .from("espace_commun")
        .select("plan_chemin")
        .eq("id", id)
        .single();
      expect(lu, statut).toEqual({ plan_chemin: plan });
    }
  });

  it("le fichier du plan se dépose comme une photo : le conseil syndical seul écrit, les résidents validés et en attente lisent", async () => {
    const syndic = await nouveauSyndic();
    const chemin = cheminPhotoEspace(randomUUID());
    fichiersDeposes.push(chemin);

    const parSyndic = await syndic.client.storage
      .from(BUCKET)
      .upload(chemin, JPEG, { contentType: "image/jpeg" });
    expect(parSyndic.error).toBeNull();

    const parResident = await (
      await nouveauResident("valide")
    ).client.storage
      .from(BUCKET)
      .upload(cheminPhotoEspace(randomUUID()), JPEG, {
        contentType: "image/jpeg",
      });
    expect(parResident.error).not.toBeNull();

    for (const lecteur of [
      await nouveauResident("valide"),
      await nouveauResident("en_attente"),
    ]) {
      const { data, error } = await lecteur.client.storage
        .from(BUCKET)
        .createSignedUrl(chemin, 60);
      expect(error).toBeNull();
      expect((await fetch(data!.signedUrl)).status).toBe(200);
    }
  });
});
