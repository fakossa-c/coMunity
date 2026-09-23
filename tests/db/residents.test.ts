import { afterEach, describe, expect, it } from "vitest";
import {
  aSupprimer,
  clientAdmin,
  clientVisiteur,
  type Compte,
  FOYER,
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

async function codeEnVigueur(): Promise<string> {
  const { data, error } = await clientAdmin()
    .from("residence")
    .select("code")
    .single();
  if (error) throw error;
  return data.code;
}

/** Crée un compte résident comme le fait la page d'inscription. */
async function inscrire(
  code: string,
  foyer: Record<string, unknown> = FOYER,
) {
  const client = clientVisiteur();
  const email = nouvelEmail("inscrit");
  const { data, error } = await client.auth.signUp({
    email,
    password: "mot-de-passe-de-test",
    options: { data: { ...foyer, code_residence: code } },
  });
  if (data.user) aSupprimer(data.user.id);
  return { email, client, utilisateur: data.user, error };
}

function profilDe(id: string) {
  return clientAdmin()
    .from("profil")
    .select("role, statut, prenom, batiment, etage")
    .eq("id", id)
    .maybeSingle();
}

function statuer(
  compte: Compte,
  resident: string,
  decision: StatutResident,
) {
  return compte.client.rpc("statuer_resident", { resident, decision });
}

describe("inscription d'un résident", () => {
  it("avec le code de la résidence, le compte est créé en attente avec son prénom, son bâtiment et son étage", async () => {
    const { utilisateur, error } = await inscrire(await codeEnVigueur());

    expect(error).toBeNull();
    const { data } = await profilDe(utilisateur!.id);
    expect(data).toEqual({
      role: "resident",
      statut: "en_attente",
      prenom: "Danielle",
      batiment: "B",
      etage: 2,
    });
  });

  it("le code se saisit sans se soucier des majuscules, des espaces ni des tirets", async () => {
    const code = await codeEnVigueur();
    const saisie = ` ${code.toLowerCase().replaceAll("-", " ")} `;

    const { error } = await inscrire(saisie);

    expect(error).toBeNull();
  });

  it("avec un mauvais code, aucun compte n'est créé", async () => {
    const { email, error } = await inscrire("PAS-LE-BON");

    expect(error).not.toBeNull();
    const { data } = await clientAdmin()
      .from("profil")
      .select("id")
      .eq("email", email);
    expect(data).toEqual([]);
  });

  it.each([
    ["sans prénom", { ...FOYER, prenom: "  " }],
    ["sans bâtiment", { ...FOYER, batiment: "" }],
    ["avec un étage négatif", { ...FOYER, etage: -1 }],
  ])("%s, l'inscription est refusée", async (_, foyer) => {
    const { error } = await inscrire(await codeEnVigueur(), foyer);

    expect(error).not.toBeNull();
  });

  it("un visiteur vérifie un code sans pouvoir lire celui de la résidence", async () => {
    const visiteur = clientVisiteur();

    const bon = await visiteur.rpc("code_residence_valide", {
      essai: await codeEnVigueur(),
    });
    const mauvais = await visiteur.rpc("code_residence_valide", {
      essai: "PAS-LE-BON",
    });
    const lecture = await visiteur.rpc("lire_code_residence");

    expect(bon.data).toBe(true);
    expect(mauvais.data).toBe(false);
    expect(lecture.data).toBeNull();
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
  it("le syndic voit les résidents en attente avec leur prénom, leur bâtiment et leur étage", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("en_attente");

    const { data, error } = await syndic.client
      .from("profil")
      .select("id, prenom, batiment, etage")
      .eq("role", "resident")
      .eq("statut", "en_attente");

    expect(error).toBeNull();
    expect(data).toContainEqual({ id: resident.id, ...FOYER });
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
  ] as const)(
    "le syndic ne peut pas %s",
    async (_, statut, decision) => {
      const syndic = await nouveauSyndic();
      const resident = await nouveauResident(statut);

      const { error } = await statuer(syndic, resident.id, decision);

      expect(error?.code).toBe("P0002");
      const { data } = await profilDe(resident.id);
      expect(data?.statut).toBe(statut);
    },
  );

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

describe("code de résidence", () => {
  let codeInitial: string | null = null;

  afterEach(async () => {
    if (codeInitial === null) return;
    await clientAdmin()
      .from("residence")
      .update({ code: codeInitial })
      .eq("id", true);
    codeInitial = null;
  });

  it("le syndic consulte le code", async () => {
    const syndic = await nouveauSyndic();

    const { data, error } = await syndic.client.rpc("lire_code_residence");

    expect(error).toBeNull();
    expect(data).toBe(await codeEnVigueur());
  });

  it.each(tousLesStatuts)(
    "un résident %s ne lit ni ne régénère le code",
    async (statut) => {
      const resident = await nouveauResident(statut);
      const avant = await codeEnVigueur();

      const lecture = await resident.client.rpc("lire_code_residence");
      const regeneration = await resident.client.rpc(
        "regenerer_code_residence",
      );

      expect(lecture.error?.code).toBe("42501");
      expect(regeneration.error?.code).toBe("42501");
      expect(await codeEnVigueur()).toBe(avant);
    },
  );

  it("le syndic régénère le code : l'ancien ne permet plus de s'inscrire, le nouveau oui", async () => {
    const syndic = await nouveauSyndic();
    codeInitial = await codeEnVigueur();

    const { data: nouveau, error } = await syndic.client.rpc(
      "regenerer_code_residence",
    );

    expect(error).toBeNull();
    expect(nouveau).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(await codeEnVigueur()).toBe(nouveau);
    expect((await inscrire(codeInitial)).error).not.toBeNull();
    expect((await inscrire(nouveau)).error).toBeNull();
  });
});
