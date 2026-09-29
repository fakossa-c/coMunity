import { describe, expect, it } from "vitest";
import { clientAdmin, nouveauResident, type Compte } from "./clients";

// Ticket #100 : chaque appel à Jev coûte un appel OpenRouter payant. Le serveur réserve un appel
// auprès de la base avant de l'émettre : 10 par heure pour la création, 10 par heure pour la
// modification (deux budgets séparés), et 30 par jour toutes actions confondues, par compte.

type Action = "creation" | "modification";

const HEURE_MS = 60 * 60 * 1000;

function reserver(compte: Compte | string, action: Action | string) {
  return clientAdmin().rpc("reserver_appel_jev", {
    p_compte: typeof compte === "string" ? compte : compte.id,
    p_action: action,
  });
}

async function accorde(compte: Compte, action: Action) {
  const { data, error } = await reserver(compte, action);
  if (error) throw error;
  return data as boolean;
}

/** Des appels déjà faits il y a `ilYa` millisecondes, écrits directement pour ne pas attendre. */
async function appelsDejaFaits(
  compte: Compte,
  action: Action,
  nombre: number,
  ilYa: number,
) {
  const { error } = await clientAdmin()
    .from("appel_jev")
    .insert(
      Array.from({ length: nombre }, () => ({
        compte_id: compte.id,
        action,
        appele_le: new Date(Date.now() - ilYa).toISOString(),
      })),
    );
  if (error) throw error;
}

async function nombreDeLignes(compte: Compte) {
  const { count, error } = await clientAdmin()
    .from("appel_jev")
    .select("id", { count: "exact", head: true })
    .eq("compte_id", compte.id);
  if (error) throw error;
  return count;
}

describe("le budget horaire", () => {
  it("accorde 10 appels de création par heure, puis refuse", async () => {
    const compte = await nouveauResident("valide");

    for (let i = 0; i < 10; i++)
      expect(await accorde(compte, "creation")).toBe(true);

    expect(await accorde(compte, "creation")).toBe(false);
  });

  it("ne dépasse pas le plafond quand les requêtes arrivent ensemble", async () => {
    const compte = await nouveauResident("valide");

    const reponses = await Promise.all(
      Array.from({ length: 15 }, () => accorde(compte, "creation")),
    );

    expect(reponses.filter(Boolean)).toHaveLength(10);
    expect(await nombreDeLignes(compte)).toBe(10);
  });

  it("tient un budget de modification séparé de celui de création", async () => {
    const compte = await nouveauResident("valide");
    for (let i = 0; i < 10; i++) await accorde(compte, "creation");

    for (let i = 0; i < 10; i++)
      expect(await accorde(compte, "modification")).toBe(true);

    expect(await accorde(compte, "modification")).toBe(false);
    expect(await accorde(compte, "creation")).toBe(false);
  });

  it("ne compte plus un appel vieux de plus d'une heure", async () => {
    const compte = await nouveauResident("valide");
    await appelsDejaFaits(compte, "creation", 10, HEURE_MS + 60_000);

    expect(await accorde(compte, "creation")).toBe(true);
  });

  it("ne consomme rien quand il refuse", async () => {
    const compte = await nouveauResident("valide");
    await appelsDejaFaits(compte, "creation", 10, 60_000);

    expect(await accorde(compte, "creation")).toBe(false);
    expect(await nombreDeLignes(compte)).toBe(10);
  });

  it("ne limite pas un compte à cause d'un autre", async () => {
    const gros = await nouveauResident("valide");
    const voisin = await nouveauResident("valide");
    await appelsDejaFaits(gros, "creation", 10, 60_000);

    expect(await accorde(gros, "creation")).toBe(false);
    expect(await accorde(voisin, "creation")).toBe(true);
  });
});

describe("le budget du jour", () => {
  it("refuse au 31e appel des dernières 24 heures, toutes actions confondues", async () => {
    const compte = await nouveauResident("valide");
    // 30 appels étalés sur la journée, tous sortis du budget horaire.
    await appelsDejaFaits(compte, "creation", 15, 3 * HEURE_MS);
    await appelsDejaFaits(compte, "modification", 15, 3 * HEURE_MS);

    expect(await accorde(compte, "creation")).toBe(false);
    expect(await accorde(compte, "modification")).toBe(false);
  });

  it("accorde le 30e appel", async () => {
    const compte = await nouveauResident("valide");
    await appelsDejaFaits(compte, "creation", 15, 3 * HEURE_MS);
    await appelsDejaFaits(compte, "modification", 14, 3 * HEURE_MS);

    expect(await accorde(compte, "modification")).toBe(true);
    expect(await accorde(compte, "modification")).toBe(false);
  });

  it("libère le budget après 24 heures, et oublie les vieux appels", async () => {
    const compte = await nouveauResident("valide");
    await appelsDejaFaits(compte, "creation", 30, 25 * HEURE_MS);

    expect(await accorde(compte, "creation")).toBe(true);
    expect(await nombreDeLignes(compte)).toBe(1);
  });
});

describe("l'accès", () => {
  it("ne se réserve qu'avec la clé secrète du serveur", async () => {
    const compte = await nouveauResident("valide");

    const { error } = await compte.client.rpc("reserver_appel_jev", {
      p_compte: compte.id,
      p_action: "creation",
    });

    expect(error).not.toBeNull();
    expect(await nombreDeLignes(compte)).toBe(0);
  });

  it("ne se lit ni ne s'écrit avec la session d'un résident", async () => {
    const compte = await nouveauResident("valide");
    await appelsDejaFaits(compte, "creation", 1, 60_000);

    const lecture = await compte.client.from("appel_jev").select("id");
    const ecriture = await compte.client
      .from("appel_jev")
      .insert({ compte_id: compte.id, action: "creation" });

    expect(lecture.data ?? []).toEqual([]);
    expect(ecriture.error).not.toBeNull();
  });

  it("refuse une action inconnue", async () => {
    const compte = await nouveauResident("valide");

    const { error } = await reserver(compte, "publication");

    expect(error).not.toBeNull();
    expect(await nombreDeLignes(compte)).toBe(0);
  });

  it("disparaît avec le compte", async () => {
    const compte = await nouveauResident("valide");
    await appelsDejaFaits(compte, "creation", 3, 60_000);

    const { error } = await clientAdmin().auth.admin.deleteUser(compte.id);
    expect(error).toBeNull();

    expect(await nombreDeLignes(compte)).toBe(0);
  });
});
