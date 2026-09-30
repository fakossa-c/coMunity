import { describe, expect, it } from "vitest";
import { clientAdmin, nouveauResident, nouveauSyndic } from "./clients";

function profilDe(id: string) {
  return clientAdmin()
    .from("profil")
    .select("taille, theme")
    .eq("id", id)
    .maybeSingle();
}

describe("réglages d'affichage", () => {
  it("un nouveau profil a la taille standard et le thème clair par défaut", async () => {
    const resident = await nouveauResident();

    const { data } = await profilDe(resident.id);
    expect(data).toEqual({ taille: "standard", theme: "clair" });
  });

  it("le propriétaire modifie ses réglages", async () => {
    const resident = await nouveauResident();

    const { error } = await resident.client
      .from("profil")
      .update({ taille: "grands", theme: "sombre" })
      .eq("id", resident.id);
    expect(error).toBeNull();

    const { data } = await profilDe(resident.id);
    expect(data).toEqual({ taille: "grands", theme: "sombre" });
  });

  it("un autre compte ne peut pas modifier les réglages d'autrui", async () => {
    const resident = await nouveauResident();
    const autre = await nouveauResident();

    const { error } = await autre.client
      .from("profil")
      .update({ taille: "grands" })
      .eq("id", resident.id);

    // La ligne ciblée est hors de portée pour `autre` : aucune erreur, mais aucune ligne touchée.
    expect(error).toBeNull();
    const { data } = await profilDe(resident.id);
    expect(data).toEqual({ taille: "standard", theme: "clair" });
  });

  it("une valeur hors énumération est refusée", async () => {
    const resident = await nouveauResident();

    const { error } = await resident.client
      .from("profil")
      .update({ taille: "immense" as "grands" })
      .eq("id", resident.id);

    expect(error).not.toBeNull();
  });

  it("un membre du syndic a aussi des réglages par défaut", async () => {
    const syndic = await nouveauSyndic();

    const { data } = await profilDe(syndic.id);
    expect(data).toEqual({ taille: "standard", theme: "clair" });
  });
});

describe("page d'arrivée", () => {
  function pageArriveeDe(id: string) {
    return clientAdmin()
      .from("profil")
      .select("page_arrivee")
      .eq("id", id)
      .maybeSingle();
  }

  it("un nouveau profil arrive sur le tableau de bord par défaut", async () => {
    const syndic = await nouveauSyndic();

    const { data } = await pageArriveeDe(syndic.id);
    expect(data).toEqual({ page_arrivee: "tableau_de_bord" });
  });

  it("le propriétaire choisit l'accueil", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await syndic.client
      .from("profil")
      .update({ page_arrivee: "accueil" })
      .eq("id", syndic.id);
    expect(error).toBeNull();

    const { data } = await pageArriveeDe(syndic.id);
    expect(data).toEqual({ page_arrivee: "accueil" });
  });

  it("un autre compte ne peut pas modifier la page d'arrivée d'autrui", async () => {
    const syndic = await nouveauSyndic();
    const autre = await nouveauSyndic();

    const { error } = await autre.client
      .from("profil")
      .update({ page_arrivee: "accueil" })
      .eq("id", syndic.id);

    expect(error).toBeNull();
    const { data } = await pageArriveeDe(syndic.id);
    expect(data).toEqual({ page_arrivee: "tableau_de_bord" });
  });

  it("une valeur hors énumération est refusée", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await syndic.client
      .from("profil")
      .update({ page_arrivee: "annonces" })
      .eq("id", syndic.id);

    expect(error).not.toBeNull();
  });
});
