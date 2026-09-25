import { describe, expect, inject, it } from "vitest";
import { amorcerSyndic } from "../../scripts/amorcer-syndic.mjs";
import {
  aSupprimer,
  clientAdmin,
  clientVisiteur,
  connecter,
  IDENTITE,
  IDENTITE_SYNDIC,
  nouveauResident,
  nouveauSyndic,
  nouveauSyndicSansNom,
  nouvelEmail,
  type Compte,
} from "./clients";

const ACTIVITE = {
  titre: "Goûter dans la cour",
  categorie: "moments_partages" as const,
  pictogramme: "cake",
  date_activite: "2026-10-14",
  heure_debut: "16:00",
  heure_fin: "17:30",
  lieu: "Cour intérieure",
};

function profilDe(id: string) {
  return clientAdmin()
    .from("profil")
    .select("role, statut, prenom, nom")
    .eq("id", id)
    .single();
}

/** Ce qu'un compte peut lire et écrire dans la vie de la résidence, et dans l'espace syndic. */
async function droitsDe(compte: Compte) {
  const voisin = await nouveauResident("valide");
  await voisin.client
    .from("activite")
    .insert({ ...ACTIVITE, organisateur: voisin.id });

  const consulter = await compte.client.rpc("peut_consulter");
  const participer = await compte.client.rpc("peut_participer");
  const activitesDuVoisin = await compte.client
    .from("activite")
    .select("id")
    .eq("organisateur", voisin.id);
  const publication = await compte.client
    .from("activite")
    .insert({ ...ACTIVITE, organisateur: compte.id });
  const syndic = await compte.client.rpc("est_syndic");
  const invitation = await compte.client
    .from("invitation_syndic")
    .insert({ email: nouvelEmail("invite") });

  return {
    resident: {
      consulter: consulter.data,
      participer: participer.data,
      lireLesActivitesDesVoisins: activitesDuVoisin.data?.length === 1,
      publierUneActivite: publication.error === null,
    },
    syndic: {
      espaceSyndic: syndic.data,
      inviterUnCollegue: invitation.error === null,
    },
  };
}

describe("droits d'un membre du syndic", () => {
  it("un membre du syndic a les droits d'un résident validé, plus ceux du syndic", async () => {
    // Quatre comptes à créer : les deux mesures, indépendantes, tournent en parallèle.
    const [resident, syndic] = await Promise.all([
      nouveauResident("valide").then(droitsDe),
      nouveauSyndic().then(droitsDe),
    ]);

    expect(resident).toEqual({
      resident: {
        consulter: true,
        participer: true,
        lireLesActivitesDesVoisins: true,
        publierUneActivite: true,
      },
      syndic: { espaceSyndic: false, inviterUnCollegue: false },
    });
    expect(syndic).toEqual({
      resident: resident.resident,
      syndic: { espaceSyndic: true, inviterUnCollegue: true },
    });
  });
});

describe("prénom et nom d'un membre du syndic", () => {
  it("l'amorçage enregistre le prénom et le nom du premier membre", async () => {
    const syndic = await nouveauSyndic();

    const { data } = await profilDe(syndic.id);

    expect(data).toEqual({
      role: "syndic",
      statut: "valide",
      ...IDENTITE_SYNDIC,
    });
  });

  it.each([
    ["sans prénom", { prenom: "", nom: "Durand" }],
    ["sans nom", { prenom: "Colette", nom: "  " }],
  ])("l'amorçage refuse un membre %s", async (_, identite) => {
    const { url, cleSecrete } = inject("supabase");
    const email = nouvelEmail("syndic");

    await expect(
      amorcerSyndic({
        url,
        cleSecrete,
        email,
        motDePasse: "mot-de-passe-de-test",
        ...identite,
      }),
    ).rejects.toThrow();

    const { data } = await clientAdmin()
      .from("profil")
      .select("id")
      .eq("email", email);
    expect(data).toEqual([]);
  });

  it("un membre du syndic sans prénom ni nom les complète", async () => {
    const syndic = await nouveauSyndicSansNom();

    const { error } = await syndic.client.rpc("completer_profil", {
      prenom: " Colette ",
      nom: "Durand",
    });

    expect(error).toBeNull();
    const { data } = await profilDe(syndic.id);
    expect(data).toMatchObject(IDENTITE_SYNDIC);
  });

  it("le collègue invité n'a ni prénom ni nom tant qu'il ne les a pas saisis", async () => {
    const syndic = await nouveauSyndic();
    const email = nouvelEmail("invite");
    await syndic.client.from("invitation_syndic").insert({ email });
    const admin = clientAdmin();
    const { data: invite, error } =
      await admin.auth.admin.inviteUserByEmail(email);
    if (error) throw error;
    aSupprimer(invite.user.id);
    // Ce que fait l'ouverture du lien d'invitation, suivie du choix du mot de passe.
    await admin.auth.admin.updateUserById(invite.user.id, {
      password: "mot-de-passe-de-test",
      email_confirm: true,
    });

    const avant = await profilDe(invite.user.id);
    const collegue = await connecter(email);
    const completion = await collegue.rpc("completer_profil", IDENTITE_SYNDIC);

    expect(avant.data).toMatchObject({ prenom: null, nom: null });
    expect(completion.error).toBeNull();
    const apres = await profilDe(invite.user.id);
    expect(apres.data).toMatchObject(IDENTITE_SYNDIC);
  });

  it.each([
    ["un prénom vide", { prenom: " ", nom: "Durand" }],
    ["un nom vide", { prenom: "Colette", nom: "" }],
    ["un nom trop long", { prenom: "Colette", nom: "x".repeat(41) }],
  ])("la complétion refuse %s", async (_, identite) => {
    const syndic = await nouveauSyndicSansNom();

    const { error } = await syndic.client.rpc("completer_profil", identite);

    expect(error).not.toBeNull();
    const { data } = await profilDe(syndic.id);
    expect(data).toMatchObject({ prenom: null, nom: null });
  });

  it("un prénom et un nom déjà saisis ne se remplacent pas par cette voie", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await resident.client.rpc("completer_profil", {
      prenom: "Autre",
      nom: "Personne",
    });

    expect(error).not.toBeNull();
    const { data } = await profilDe(resident.id);
    expect(data).toMatchObject(IDENTITE);
  });

  it("un visiteur ne complète aucun profil", async () => {
    const { error } = await clientVisiteur().rpc(
      "completer_profil",
      IDENTITE_SYNDIC,
    );

    expect(error).not.toBeNull();
  });
});
