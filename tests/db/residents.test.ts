import { describe, expect, it } from "vitest";
import {
  aSupprimer,
  clientAdmin,
  clientVisiteur,
  type Compte,
  IDENTITE,
  nouveauResident,
  nouveauSyndic,
  nouvelEmail,
  type StatutResident,
} from "./clients";

const tousLesStatuts: StatutResident[] = [
  "en_attente",
  "valide",
  "refuse",
  "retire",
];

/** Crée un compte résident comme le fait la page d'inscription. */
async function inscrire(identite: Record<string, unknown> = IDENTITE) {
  const client = clientVisiteur();
  const email = nouvelEmail("inscrit");
  const { data, error } = await client.auth.signUp({
    email,
    password: "mot-de-passe-de-test",
    options: { data: identite },
  });
  if (data.user) aSupprimer(data.user.id);
  return { email, utilisateur: data.user, error };
}

function profilDe(id: string) {
  return clientAdmin()
    .from("profil")
    .select("role, statut, prenom, nom")
    .eq("id", id)
    .maybeSingle();
}

function statuer(compte: Compte, resident: string, decision: StatutResident) {
  return compte.client.rpc("statuer_resident", { resident, decision });
}

describe("inscription d'un résident", () => {
  it("le compte est créé en attente avec son prénom et son nom", async () => {
    const { utilisateur, error } = await inscrire({
      prenom: "  Colette ",
      nom: " Durand ",
    });

    expect(error).toBeNull();
    const { data } = await profilDe(utilisateur!.id);
    expect(data).toEqual({
      role: "resident",
      statut: "en_attente",
      prenom: "Colette",
      nom: "Durand",
    });
  });

  it.each([
    ["sans prénom", { ...IDENTITE, prenom: "  " }],
    ["sans nom", { ...IDENTITE, nom: "" }],
    [
      "avec un nom de plus de 40 caractères",
      { ...IDENTITE, nom: "x".repeat(41) },
    ],
  ])("%s, l'inscription est refusée", async (_, identite) => {
    const { email, error } = await inscrire(identite);

    expect(error).not.toBeNull();
    const { data } = await clientAdmin()
      .from("profil")
      .select("id")
      .eq("email", email);
    expect(data).toEqual([]);
  });

  it("un compte ouvert sans prénom ni nom n'a aucun profil, donc aucun accès", async () => {
    const { utilisateur, error } = await inscrire({});

    expect(error).toBeNull();
    const { data } = await profilDe(utilisateur!.id);
    expect(data).toBeNull();
  });
});

describe("droits d'un compte selon son statut", () => {
  const attendus: Record<
    StatutResident,
    { consulter: boolean; participer: boolean }
  > = {
    en_attente: { consulter: true, participer: false },
    valide: { consulter: true, participer: true },
    refuse: { consulter: false, participer: false },
    retire: { consulter: false, participer: false },
  };

  it.each(tousLesStatuts)("un résident %s", async (statut) => {
    const resident = await nouveauResident(statut);

    const consulter = await resident.client.rpc("peut_consulter");
    const participer = await resident.client.rpc("peut_participer");

    expect({ consulter: consulter.data, participer: participer.data }).toEqual(
      attendus[statut],
    );
  });

  it("un membre du syndic consulte et participe", async () => {
    const syndic = await nouveauSyndic();

    const consulter = await syndic.client.rpc("peut_consulter");
    const participer = await syndic.client.rpc("peut_participer");

    expect([consulter.data, participer.data]).toEqual([true, true]);
  });

  it("un résident en attente ne peut rien créer ni modifier", async () => {
    const resident = await nouveauResident("en_attente");

    const invitation = await resident.client
      .from("invitation_syndic")
      .insert({ email: nouvelEmail("invite") });
    await resident.client
      .from("profil")
      .update({ statut: "valide" })
      .eq("id", resident.id);

    expect(invitation.error?.code).toBe("42501");
    const { data } = await profilDe(resident.id);
    expect(data?.statut).toBe("en_attente");
  });
});

describe("validation des résidents par le syndic", () => {
  it("le syndic voit les résidents en attente avec leur prénom et leur nom", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("en_attente");

    const { data, error } = await syndic.client
      .from("profil")
      .select("id, prenom, nom")
      .eq("role", "resident")
      .eq("statut", "en_attente");

    expect(error).toBeNull();
    expect(data).toContainEqual({ id: resident.id, ...IDENTITE });
  });

  it.each(["valide", "refuse"] as const)(
    "le syndic statue sur un résident en attente : %s",
    async (decision) => {
      const syndic = await nouveauSyndic();
      const resident = await nouveauResident("en_attente");

      const { error } = await statuer(syndic, resident.id, decision);

      expect(error).toBeNull();
      const { data } = await profilDe(resident.id);
      expect(data?.statut).toBe(decision);
    },
  );

  it("le syndic retire un résident validé, qui perd tout accès", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");

    const { error } = await statuer(syndic, resident.id, "retire");

    expect(error).toBeNull();
    const consulter = await resident.client.rpc("peut_consulter");
    expect(consulter.data).toBe(false);
  });

  it.each([
    ["valider un résident refusé", "refuse", "valide"],
    ["retirer un résident en attente", "en_attente", "retire"],
    ["remettre en attente un résident validé", "valide", "en_attente"],
  ] as const)("le syndic ne peut pas %s", async (_, statut, decision) => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident(statut);

    const { error } = await statuer(syndic, resident.id, decision);

    expect(error?.code).toBe("P0002");
    const { data } = await profilDe(resident.id);
    expect(data?.statut).toBe(statut);
  });

  it("le syndic ne statue pas sur un membre du syndic par cette voie", async () => {
    const [moi, collegue] = [await nouveauSyndic(), await nouveauSyndic()];

    const { error } = await statuer(moi, collegue.id, "retire");

    expect(error?.code).toBe("P0002");
  });

  it.each(tousLesStatuts)(
    "un résident %s ne peut pas se valider lui-même",
    async (statut) => {
      const resident = await nouveauResident(statut);

      const { error } = await statuer(resident, resident.id, "valide");

      expect(error?.code).toBe("42501");
      const { data } = await profilDe(resident.id);
      expect(data?.statut).toBe(statut);
    },
  );

  it("un résident ne voit pas les autres résidents en attente", async () => {
    const autre = await nouveauResident("en_attente");
    const resident = await nouveauResident("valide");

    const { data } = await resident.client
      .from("profil")
      .select("id")
      .eq("id", autre.id);

    expect(data).toEqual([]);
  });
});
