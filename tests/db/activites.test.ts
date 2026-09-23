import { describe, expect, it } from "vitest";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type StatutResident,
} from "./clients";

const tousLesStatuts: StatutResident[] = [
  "en_attente",
  "valide",
  "refuse",
  "retire",
];

const ACTIVITE = {
  titre: "Atelier compost",
  categorie: "jardin_nature" as const,
  pictogramme: "potted_plant",
  description: "On apprend à composter ensemble.",
  date_activite: "2026-10-12",
  heure_debut: "10:00",
  heure_fin: "11:30",
  lieu: "Cour intérieure",
};

function activiteDe(organisateur: string) {
  return clientAdmin()
    .from("activite")
    .select("id, titre, organisateur")
    .eq("organisateur", organisateur)
    .maybeSingle();
}

describe("création d'une activité", () => {
  it("un résident validé publie une activité", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await resident.client
      .from("activite")
      .insert({ ...ACTIVITE, organisateur: resident.id });

    expect(error).toBeNull();
    const { data } = await activiteDe(resident.id);
    expect(data).toMatchObject({ titre: ACTIVITE.titre });
  });

  it("un membre du syndic publie une activité", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await syndic.client
      .from("activite")
      .insert({ ...ACTIVITE, organisateur: syndic.id });

    expect(error).toBeNull();
  });

  it("le titre est limité à 50 caractères", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await resident.client.from("activite").insert({
      ...ACTIVITE,
      titre: "x".repeat(51),
      organisateur: resident.id,
    });

    expect(error).not.toBeNull();
  });

  it("la date et le créneau sont obligatoires", async () => {
    const resident = await nouveauResident("valide");
    const { date_activite, ...sansDate } = ACTIVITE;
    void date_activite;

    const { error } = await resident.client
      .from("activite")
      .insert({ ...sansDate, organisateur: resident.id });

    expect(error).not.toBeNull();
  });

  it("l'heure de fin doit être après l'heure de début", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await resident.client.from("activite").insert({
      ...ACTIVITE,
      heure_debut: "11:30",
      heure_fin: "10:00",
      organisateur: resident.id,
    });

    expect(error).not.toBeNull();
  });
});

describe("droits selon le statut du compte", () => {
  const attendus: Record<StatutResident, boolean> = {
    en_attente: false,
    valide: true,
    refuse: false,
    retire: false,
  };

  it.each(tousLesStatuts)(
    "un résident %s peut créer une activité : %s",
    async (statut) => {
      const resident = await nouveauResident(statut);

      const { error } = await resident.client
        .from("activite")
        .insert({ ...ACTIVITE, organisateur: resident.id });

      expect(error === null).toBe(attendus[statut]);
    },
  );

  it("un visiteur ne peut pas créer d'activité", async () => {
    const visiteur = clientVisiteur();

    const { error } = await visiteur
      .from("activite")
      .insert({ ...ACTIVITE, organisateur: (await nouveauSyndic()).id });

    expect(error).not.toBeNull();
  });

  it.each(tousLesStatuts)(
    "un résident %s peut consulter le catalogue : %s",
    async (statut) => {
      const resident = await nouveauResident(statut);

      const { error } = await resident.client.from("activite").select("id");

      expect(error === null).toBe(statut !== "refuse" && statut !== "retire");
    },
  );

  it("un visiteur ne consulte pas le catalogue", async () => {
    const visiteur = clientVisiteur();

    const { error } = await visiteur.from("activite").select("id");

    expect(error).not.toBeNull();
  });
});

describe("modification d'une activité", () => {
  it("l'organisateur modifie sa propre activité", async () => {
    const resident = await nouveauResident("valide");
    await resident.client
      .from("activite")
      .insert({ ...ACTIVITE, organisateur: resident.id });
    const { data: activite } = await activiteDe(resident.id);

    const { error } = await resident.client
      .from("activite")
      .update({ titre: "Atelier compost, séance 2" })
      .eq("id", activite!.id);

    expect(error).toBeNull();
    const { data } = await activiteDe(resident.id);
    expect(data?.titre).toBe("Atelier compost, séance 2");
  });

  it("un résident ne modifie pas l'activité d'un autre", async () => {
    const organisateur = await nouveauResident("valide");
    const autre = await nouveauResident("valide");
    await organisateur.client
      .from("activite")
      .insert({ ...ACTIVITE, organisateur: organisateur.id });
    const { data: activite } = await activiteDe(organisateur.id);

    const { error } = await autre.client
      .from("activite")
      .update({ titre: "Détournée" })
      .eq("id", activite!.id);
    void error;

    const { data } = await activiteDe(organisateur.id);
    expect(data?.titre).toBe(ACTIVITE.titre);
  });
});
