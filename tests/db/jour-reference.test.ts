import { describe, expect, it } from "vitest";
import { nouveauResident, type Compte, publierApresJev } from "./clients";

// Ticket #86 : le jour de référence est celui d'Europe/Paris, et une activité du jour quitte
// « à venir » à son heure de fin, pas à minuit UTC.

const HORLOGE_PARIS = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Une activité du jour dont l'heure de fin est à `minutes` de maintenant (négatif : déjà
 * terminée), écrite à l'heure murale de Paris : date et heure viennent du même instant, donc
 * l'activité franchit minuit sans que le test dépende de l'heure où il tourne.
 */
function activiteFinissant(minutes: number) {
  let instant = Date.now() + minutes * 60_000;
  let [date, heure_fin] = HORLOGE_PARIS.format(new Date(instant)).split(" ");
  // Une fin à minuit pile n'aurait aucun début possible avant elle.
  if (heure_fin === "00:00") {
    instant += 60_000;
    [date, heure_fin] = HORLOGE_PARIS.format(new Date(instant)).split(" ");
  }
  return {
    titre: "Goûter crêpes",
    categorie: "moments_partages" as const,
    pictogramme: "waving_hand",
    date_activite: date,
    heure_debut: "00:00",
    heure_fin,
    lieu: "Jardin partagé",
  };
}

async function publier(organisateur: Compte, minutes: number) {
  const { data, error } = await organisateur.client
    .from("activite")
    .insert({ ...activiteFinissant(minutes), organisateur: organisateur.id })
    .select("id, identifiant_public")
    .single();
  if (error) throw error;
  await publierApresJev(data.identifiant_public);
  return data as { id: string; identifiant_public: string };
}

describe("activité du jour", () => {
  it("le catalogue ne garde que l'activité du jour qui n'est pas terminée, et donne son heure de fin", async () => {
    const organisateur = await nouveauResident("valide");
    const terminee = await publier(organisateur, -30);
    const enCours = await publier(organisateur, 30);

    const { data, error } = await organisateur.client.rpc(
      "catalogue_activites",
    );

    expect(error).toBeNull();
    const ids = (data as { id: string }[]).map((a) => a.id);
    expect(ids).toContain(enCours.id);
    expect(ids).not.toContain(terminee.id);
    const ligne = (data as { id: string; heure_fin: string }[]).find(
      (a) => a.id === enCours.id,
    );
    expect(ligne?.heure_fin).toBe(activiteFinissant(30).heure_fin + ":00");
  });

  it("les activités organisées gardent les deux, avec leur heure de fin", async () => {
    const organisateur = await nouveauResident("valide");
    const terminee = await publier(organisateur, -30);
    const enCours = await publier(organisateur, 30);

    const { data, error } = await organisateur.client.rpc(
      "mes_activites_organisees",
    );

    expect(error).toBeNull();
    const lignes = data as { id: string; heure_fin: string }[];
    expect(lignes.map((a) => a.id).sort()).toEqual(
      [terminee.id, enCours.id].sort(),
    );
    expect(lignes.every((a) => /^\d\d:\d\d:\d\d$/.test(a.heure_fin))).toBe(
      true,
    );
  });

  it("est terminée à l'heure de Paris : activite_est_passee suit l'heure de fin, pas l'heure d'UTC", async () => {
    const organisateur = await nouveauResident("valide");
    const terminee = await publier(organisateur, -30);
    const enCours = await publier(organisateur, 30);

    const passee = await organisateur.client.rpc("activite_est_passee", {
      p_activite: terminee.id,
    });
    const aVenir = await organisateur.client.rpc("activite_est_passee", {
      p_activite: enCours.id,
    });

    expect(passee.data).toBe(true);
    expect(aVenir.data).toBe(false);
  });
});
