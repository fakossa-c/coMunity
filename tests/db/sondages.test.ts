import { afterAll, describe, expect, it } from "vitest";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type Compte,
  type StatutResident,
} from "./clients";

// Ticket #39 : le sondage à choix unique d'une annonce. Le conseil syndical le crée avec
// l'annonce ; un résident validé répond une fois avant la date limite ; les résultats ne se
// lisent qu'après sa réponse ou après la date limite, et par le conseil syndical à tout moment.

const annoncesCreees: string[] = [];

afterAll(async () => {
  // Supprimer l'annonce emporte son sondage et ses réponses.
  await clientAdmin().from("annonce").delete().in("id", annoncesCreees);
});

/** Un jour `AAAA-MM-JJ`, décalé de `jours` par rapport à aujourd'hui (le jour de la base, UTC). */
function jour(jours: number) {
  return new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
}

const OPTIONS = ["7h à 21h", "6h à 23h", "Accès 24h/24"];

type Sondage = { id: string; annonce_id: string };

/** Une annonce de type sondage, sans sondage encore ; retourne son identifiant. */
async function annonceDeSondage(client: Compte["client"]) {
  const { data, error } = await client
    .from("annonce")
    .insert({ type: "sondage", titre: "Horaires du local vélos" })
    .select("id")
    .single();
  if (error) throw error;
  annoncesCreees.push(data.id);
  return data.id as string;
}

/** Un sondage publié par `syndic`, ou par la base directement pour une échéance déjà passée. */
async function publierSondage(
  syndic: Compte,
  champs: { echeance?: string; options?: string[]; question?: string } = {},
): Promise<Sondage> {
  const echeance = champs.echeance ?? jour(7);
  const auteur = echeance < jour(0) ? clientAdmin() : syndic.client;
  const annonce = await annonceDeSondage(auteur);
  const { data, error } = await auteur
    .from("sondage")
    .insert({
      annonce_id: annonce,
      question: champs.question ?? "Quel créneau vous convient le mieux ?",
      options: champs.options ?? OPTIONS,
      echeance,
    })
    .select("id, annonce_id")
    .single();
  if (error) throw error;
  return data;
}

async function repondre(compte: Compte, sondage: Sondage, choix: number) {
  return compte.client.rpc("repondre_sondage", {
    p_sondage: sondage.id,
    p_choix: choix,
  });
}

/** Les résultats que voit `client`, sous la forme `{ choix: votes }` ; vide quand rien ne se lit. */
async function resultats(client: Compte["client"], sondage: Sondage) {
  const { data, error } = await client.rpc("resultats_sondages", {
    p_sondages: [sondage.id],
  });
  if (error) throw error;
  return Object.fromEntries(
    (data as { choix: number; votes: number }[]).map((ligne) => [
      ligne.choix,
      ligne.votes,
    ]),
  );
}

describe("sondage : création par le conseil syndical", () => {
  it("le conseil syndical joint un sondage à son annonce, un résident le lit", async () => {
    const syndic = await nouveauSyndic();
    const sondage = await publierSondage(syndic);

    for (const statut of ["valide", "en_attente"] as const) {
      const resident = await nouveauResident(statut);
      const { data } = await resident.client
        .from("sondage")
        .select("question, options, echeance")
        .eq("id", sondage.id);
      expect(data).toEqual([
        {
          question: "Quel créneau vous convient le mieux ?",
          options: OPTIONS,
          echeance: jour(7),
        },
      ]);
    }
  });

  it("un résident ne crée pas de sondage", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const annonce = await annonceDeSondage(syndic.client);

    const { error } = await resident.client.from("sondage").insert({
      annonce_id: annonce,
      question: "Question ?",
      options: OPTIONS,
      echeance: jour(7),
    });

    expect(error).not.toBeNull();
  });

  it("un sondage a une question, entre 2 et 6 options non vides et une date limite à venir", async () => {
    const syndic = await nouveauSyndic();

    await expect(
      publierSondage(syndic, { options: ["Seule option"] }),
    ).rejects.toBeTruthy();
    await expect(
      publierSondage(syndic, { options: ["A", "B", "C", "D", "E", "F", "G"] }),
    ).rejects.toBeTruthy();
    await expect(
      publierSondage(syndic, { options: ["A", "  "] }),
    ).rejects.toBeTruthy();
    await expect(
      publierSondage(syndic, { question: "   " }),
    ).rejects.toBeTruthy();
    const annonce = await annonceDeSondage(syndic.client);
    const passee = await syndic.client.from("sondage").insert({
      annonce_id: annonce,
      question: "Question ?",
      options: OPTIONS,
      echeance: jour(-1),
    });
    expect(passee.error).not.toBeNull();
    await expect(
      publierSondage(syndic, { echeance: jour(0) }),
    ).resolves.toBeTruthy();
  });

  it("une annonce n'a qu'un sondage, et le supprimer emporte sondage et réponses", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const sondage = await publierSondage(syndic);
    await repondre(resident, sondage, 1);

    const doublon = await syndic.client.from("sondage").insert({
      annonce_id: sondage.annonce_id,
      question: "Autre question ?",
      options: OPTIONS,
      echeance: jour(7),
    });
    await syndic.client.from("annonce").delete().eq("id", sondage.annonce_id);

    expect(doublon.error).not.toBeNull();
    const admin = clientAdmin();
    const restants = await admin
      .from("sondage")
      .select("id")
      .eq("id", sondage.id);
    const reponses = await admin
      .from("reponse_sondage")
      .select("choix")
      .eq("sondage_id", sondage.id);
    expect(restants.data).toEqual([]);
    expect(reponses.data).toEqual([]);
  });

  it("un sondage ne se joint qu'à une annonce de type sondage", async () => {
    const syndic = await nouveauSyndic();
    const annonce = await syndic.client
      .from("annonce")
      .insert({ type: "info", titre: "Simple information" })
      .select("id")
      .single();
    annoncesCreees.push(annonce.data!.id);

    const { error } = await syndic.client.from("sondage").insert({
      annonce_id: annonce.data!.id,
      question: "Question ?",
      options: OPTIONS,
      echeance: jour(7),
    });

    expect(error?.code).toBe("23514");
  });

  it("l'annonce qui porte un sondage garde son type", async () => {
    const syndic = await nouveauSyndic();
    const sondage = await publierSondage(syndic);

    const { error } = await syndic.client
      .from("annonce")
      .update({ type: "info" })
      .eq("id", sondage.annonce_id);
    const titre = await syndic.client
      .from("annonce")
      .update({ titre: "Titre corrigé" })
      .eq("id", sondage.annonce_id)
      .select("titre");

    expect(error?.code).toBe("23514");
    expect(titre.data).toEqual([{ titre: "Titre corrigé" }]);
  });

  it("un sondage ne se modifie pas une fois publié", async () => {
    const syndic = await nouveauSyndic();
    const sondage = await publierSondage(syndic);

    const modification = await syndic.client
      .from("sondage")
      .update({ question: "Question changée ?" })
      .eq("id", sondage.id)
      .select("id");

    expect(modification.data ?? []).toEqual([]);
  });
});

describe("sondage : qui répond, une seule fois, avant la date limite", () => {
  it("un résident validé répond, et le conseil syndical aussi", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const sondage = await publierSondage(syndic);

    const parResident = await repondre(resident, sondage, 2);
    const parSyndic = await repondre(syndic, sondage, 1);

    expect(parResident.error).toBeNull();
    expect(parSyndic.error).toBeNull();
  });

  it("la réponse est unique et ne se modifie pas", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const sondage = await publierSondage(syndic);
    await repondre(resident, sondage, 1);

    const seconde = await repondre(resident, sondage, 2);
    const modification = await resident.client
      .from("reponse_sondage")
      .update({ choix: 3 })
      .eq("sondage_id", sondage.id)
      .select("choix");
    const suppression = await resident.client
      .from("reponse_sondage")
      .delete()
      .eq("sondage_id", sondage.id)
      .select("choix");

    expect(seconde.error?.code).toBe("23505");
    expect(modification.data ?? []).toEqual([]);
    expect(suppression.data ?? []).toEqual([]);
    const { data } = await resident.client
      .from("reponse_sondage")
      .select("choix")
      .eq("sondage_id", sondage.id);
    expect(data).toEqual([{ choix: 1 }]);
  });

  it("le choix doit être une option du sondage", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const sondage = await publierSondage(syndic);

    for (const choix of [0, 4, -1]) {
      const { error } = await repondre(resident, sondage, choix);
      expect(error?.code).toBe("23514");
    }
    expect((await repondre(resident, sondage, 3)).error).toBeNull();
  });

  it("la date limite est incluse : le jour même on répond, le lendemain non", async () => {
    const syndic = await nouveauSyndic();
    const residentLeJour = await nouveauResident("valide");
    const residentApres = await nouveauResident("valide");
    const jourMeme = await publierSondage(syndic, { echeance: jour(0) });
    const depasse = await publierSondage(syndic, { echeance: jour(-1) });

    const leJour = await repondre(residentLeJour, jourMeme, 1);
    const apres = await repondre(residentApres, depasse, 1);

    expect(leJour.error).toBeNull();
    expect(apres.error?.code).toBe("23514");
    const { data } = await clientAdmin()
      .from("reponse_sondage")
      .select("choix")
      .eq("sondage_id", depasse.id);
    expect(data).toEqual([]);
  });

  it("un résident en attente, refusé ou retiré, et un visiteur, ne répondent pas", async () => {
    const syndic = await nouveauSyndic();
    const sondage = await publierSondage(syndic);

    for (const statut of [
      "en_attente",
      "refuse",
      "retire",
    ] as StatutResident[]) {
      const resident = await nouveauResident(statut);
      const { error } = await repondre(resident, sondage, 1);
      expect(error?.code).toBe("42501");
    }
    const visiteur = await clientVisiteur().rpc("repondre_sondage", {
      p_sondage: sondage.id,
      p_choix: 1,
    });
    expect(visiteur.error).not.toBeNull();
    const { data } = await clientAdmin()
      .from("reponse_sondage")
      .select("choix")
      .eq("sondage_id", sondage.id);
    expect(data).toEqual([]);
  });

  it("personne n'écrit directement dans les réponses", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const sondage = await publierSondage(syndic);

    const { error } = await resident.client
      .from("reponse_sondage")
      .insert({ sondage_id: sondage.id, choix: 1 });

    expect(error).not.toBeNull();
  });

  it("un sondage inconnu ne reçoit aucune réponse", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await resident.client.rpc("repondre_sondage", {
      p_sondage: "00000000-0000-0000-0000-000000000000",
      p_choix: 1,
    });

    expect(error).not.toBeNull();
  });
});

describe("sondage : qui lit les résultats", () => {
  it("un résident ne voit aucun résultat avant sa réponse ni avant la date limite", async () => {
    const syndic = await nouveauSyndic();
    const votant = await nouveauResident("valide");
    const curieux = await nouveauResident("valide");
    const attente = await nouveauResident("en_attente");
    const sondage = await publierSondage(syndic);
    await repondre(votant, sondage, 1);

    expect(await resultats(curieux.client, sondage)).toEqual({});
    expect(await resultats(attente.client, sondage)).toEqual({});
  });

  it("un résident voit les résultats de tous, avec chaque option, après sa réponse", async () => {
    const syndic = await nouveauSyndic();
    const [a, b, c] = await Promise.all([
      nouveauResident("valide"),
      nouveauResident("valide"),
      nouveauResident("valide"),
    ]);
    const sondage = await publierSondage(syndic);
    await repondre(a, sondage, 1);
    await repondre(b, sondage, 1);
    await repondre(c, sondage, 3);

    expect(await resultats(a.client, sondage)).toEqual({ 1: 2, 2: 0, 3: 1 });
    expect(await resultats(c.client, sondage)).toEqual({ 1: 2, 2: 0, 3: 1 });
  });

  it("le conseil syndical voit les résultats à tout moment, même sans réponse", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const sondage = await publierSondage(syndic);
    expect(await resultats(syndic.client, sondage)).toEqual({
      1: 0,
      2: 0,
      3: 0,
    });

    await repondre(resident, sondage, 2);

    expect(await resultats(syndic.client, sondage)).toEqual({
      1: 0,
      2: 1,
      3: 0,
    });
  });

  it("après la date limite, un résident validé ou en attente voit les résultats sans avoir répondu", async () => {
    const syndic = await nouveauSyndic();
    const votant = await nouveauResident("valide");
    const sondage = await publierSondage(syndic, { echeance: jour(-1) });
    await clientAdmin()
      .from("reponse_sondage")
      .insert({ sondage_id: sondage.id, profil_id: votant.id, choix: 2 });

    for (const statut of ["valide", "en_attente"] as const) {
      const resident = await nouveauResident(statut);
      expect(await resultats(resident.client, sondage)).toEqual({
        1: 0,
        2: 1,
        3: 0,
      });
    }
  });

  it("un résident refusé ou retiré, et un visiteur, ne lisent jamais les résultats", async () => {
    const syndic = await nouveauSyndic();
    const votant = await nouveauResident("valide");
    const sondage = await publierSondage(syndic, { echeance: jour(-1) });
    await clientAdmin()
      .from("reponse_sondage")
      .insert({ sondage_id: sondage.id, profil_id: votant.id, choix: 1 });

    for (const statut of ["refuse", "retire"] as const) {
      const resident = await nouveauResident(statut);
      expect(await resultats(resident.client, sondage)).toEqual({});
    }
    const { error } = await clientVisiteur().rpc("resultats_sondages", {
      p_sondages: [sondage.id],
    });
    expect(error).not.toBeNull();
  });

  it("chacun ne lit que sa propre réponse, jamais celle d'un voisin", async () => {
    const syndic = await nouveauSyndic();
    const [a, b] = await Promise.all([
      nouveauResident("valide"),
      nouveauResident("valide"),
    ]);
    const sondage = await publierSondage(syndic);
    await repondre(a, sondage, 1);
    await repondre(b, sondage, 2);

    const deA = await a.client.from("reponse_sondage").select("choix");
    const duSyndic = await syndic.client
      .from("reponse_sondage")
      .select("choix")
      .eq("sondage_id", sondage.id);

    expect(deA.data).toEqual([{ choix: 1 }]);
    expect(duSyndic.data).toEqual([]);
  });
});
