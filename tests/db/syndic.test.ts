import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  aSupprimer,
  clientAdmin,
  clientVisiteur,
  connecter,
  nouveauResident,
  nouveauSyndic,
  nouvelEmail,
  type StatutResident,
} from "./clients";

const statutsResident: StatutResident[] = ["en_attente", "valide", "refuse"];

/** Invite un collègue comme le fait l'espace syndic : l'invitation, puis l'email. */
async function inviter(
  inviteur: Awaited<ReturnType<typeof nouveauSyndic>>,
  email: string,
) {
  const invitation = await invitationSeule(inviteur, email);
  if (invitation.error) throw invitation.error;
  const { data, error } =
    await clientAdmin().auth.admin.inviteUserByEmail(email);
  if (error) throw error;
  aSupprimer(data.user.id);
  return data.user.id;
}

function invitationSeule(
  inviteur: Awaited<ReturnType<typeof nouveauSyndic>>,
  email: string,
) {
  return inviteur.client.from("invitation_syndic").insert({ email });
}

function membresVusPar(compte: { client: SupabaseClient }) {
  return compte.client
    .from("profil")
    .select("id, email")
    .eq("role", "syndic")
    .eq("statut", "valide");
}

describe("amorçage du premier membre du syndic", () => {
  it("crée un compte syndic qui se connecte par email et mot de passe", async () => {
    const syndic = await nouveauSyndic();

    const { data, error } = await syndic.client
      .from("profil")
      .select("role, statut")
      .eq("id", syndic.id)
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({ role: "syndic", statut: "valide" });
  });
});

describe("liste des membres du syndic", () => {
  it("un membre du syndic voit ses collègues", async () => {
    const [moi, collegue] = [await nouveauSyndic(), await nouveauSyndic()];

    const { data, error } = await membresVusPar(moi);

    expect(error).toBeNull();
    expect(data?.map((m) => m.email)).toEqual(
      expect.arrayContaining([moi.email, collegue.email]),
    );
  });

  it.each(statutsResident)(
    "un résident %s ne voit aucun membre du syndic",
    async (statut) => {
      await nouveauSyndic();
      const resident = await nouveauResident(statut);

      const { data } = await membresVusPar(resident);

      expect(data).toEqual([]);
    },
  );

  it("un visiteur ne lit aucun profil", async () => {
    await nouveauSyndic();

    const { data } = await clientVisiteur().from("profil").select("id");

    expect(data ?? []).toEqual([]);
  });
});

describe("invitation d'un collègue", () => {
  it("la personne invitée par un membre du syndic devient membre du syndic", async () => {
    const syndic = await nouveauSyndic();
    const email = nouvelEmail("invite");

    const id = await inviter(syndic, email);

    const { data } = await membresVusPar(syndic).eq("id", id);
    expect(data).toEqual([{ id, email }]);
  });

  it.each(statutsResident)(
    "un résident %s ne peut pas inviter",
    async (statut) => {
      const resident = await nouveauResident(statut);

      const { error } = await invitationSeule(resident, nouvelEmail("invite"));

      expect(error?.code).toBe("42501");
    },
  );

  it("un visiteur ne peut pas inviter", async () => {
    const { error } = await clientVisiteur()
      .from("invitation_syndic")
      .insert({ email: nouvelEmail("invite") });

    expect(error).not.toBeNull();
  });

  it("un compte créé sans passer par l'email d'invitation ne devient pas syndic", async () => {
    const syndic = await nouveauSyndic();
    const email = nouvelEmail("usurpateur");
    await invitationSeule(syndic, email);

    const { data, error } = await clientVisiteur().auth.signUp({
      email,
      password: "mot-de-passe-de-test",
    });
    if (error) throw error;
    aSupprimer(data.user!.id);

    const membres = await membresVusPar(syndic).eq("email", email);
    expect(membres.data).toEqual([]);
  });

  it("un résident ne peut pas se donner le rôle syndic", async () => {
    const resident = await nouveauResident();

    await resident.client
      .from("profil")
      .update({ role: "syndic" })
      .eq("id", resident.id);

    const { data } = await clientAdmin()
      .from("profil")
      .select("role")
      .eq("id", resident.id)
      .single();
    expect(data?.role).toBe("resident");
  });
});

describe("retrait d'un membre du syndic", () => {
  it("le membre retiré disparaît de la liste et perd ses droits", async () => {
    const [moi, collegue] = [await nouveauSyndic(), await nouveauSyndic()];

    const { error } = await moi.client.rpc("retirer_membre_syndic", {
      membre: collegue.id,
    });

    expect(error).toBeNull();
    const liste = await membresVusPar(moi);
    expect(liste.data?.map((m) => m.email)).not.toContain(collegue.email);

    const retire = await connecter(collegue.email);
    const vuParLeRetire = await membresVusPar({ client: retire });
    expect(vuParLeRetire.data).toEqual([]);
    const invitation = await retire
      .from("invitation_syndic")
      .insert({ email: nouvelEmail("invite") });
    expect(invitation.error?.code).toBe("42501");
  });

  it.each(statutsResident)(
    "un résident %s ne peut pas retirer un membre du syndic",
    async (statut) => {
      const syndic = await nouveauSyndic();
      const resident = await nouveauResident(statut);

      const { error } = await resident.client.rpc("retirer_membre_syndic", {
        membre: syndic.id,
      });

      expect(error?.code).toBe("42501");
      const liste = await membresVusPar(syndic);
      expect(liste.data?.map((m) => m.email)).toContain(syndic.email);
    },
  );

  it("un visiteur ne peut pas retirer un membre du syndic", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await clientVisiteur().rpc("retirer_membre_syndic", {
      membre: syndic.id,
    });

    expect(error).not.toBeNull();
    const liste = await membresVusPar(syndic);
    expect(liste.data?.map((m) => m.email)).toContain(syndic.email);
  });

  it("un membre du syndic ne peut pas retirer son propre accès", async () => {
    const moi = await nouveauSyndic();

    const { error } = await moi.client.rpc("retirer_membre_syndic", {
      membre: moi.id,
    });

    expect(error).not.toBeNull();
    const liste = await membresVusPar(moi);
    expect(liste.data?.map((m) => m.email)).toContain(moi.email);
  });
});
