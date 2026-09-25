import { describe, expect, it } from "vitest";
import { clientAdmin, nouveauResident, nouvelEmail } from "./clients";

describe("changement d'adresse email", () => {
  it("le profil prend la nouvelle adresse une fois le changement confirmé", async () => {
    const resident = await nouveauResident();
    const nouvelle = nouvelEmail("nouvelle");

    const { error } = await clientAdmin().auth.admin.updateUserById(
      resident.id,
      { email: nouvelle, email_confirm: true },
    );
    expect(error).toBeNull();

    const { data } = await resident.client
      .from("profil")
      .select("email")
      .eq("id", resident.id)
      .single();
    expect(data?.email).toBe(nouvelle);
  });

  it("une demande de changement non confirmée ne touche pas le profil", async () => {
    const resident = await nouveauResident();

    const { error } = await resident.client.auth.updateUser({
      email: nouvelEmail("en-attente"),
    });
    expect(error).toBeNull();

    const { data } = await resident.client
      .from("profil")
      .select("email")
      .eq("id", resident.id)
      .single();
    expect(data?.email).toBe(resident.email);
  });
});
