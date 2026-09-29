import { afterAll, describe, expect, it } from "vitest";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";

// Ticket #43 : le règlement intérieur, des sections que le conseil syndical rédige et que les
// résidents lisent, et la date de sa dernière mise à jour.

const sectionsCreees: string[] = [];

afterAll(async () => {
  await clientAdmin()
    .from("section_reglement")
    .delete()
    .in("id", sectionsCreees);
});

/** Une section créée par `syndic`. */
async function nouvelleSection(syndic: Compte, champs: object = {}) {
  const { data, error } = await syndic.client
    .from("section_reglement")
    .insert({
      titre: "Bruit et tranquillité",
      texte: "Pas de bruit après 22h.\n\n- Musique douce\n- **Pas de fête**",
      ...champs,
    })
    .select("id, titre, texte, position")
    .single();
  if (error) throw error;
  sectionsCreees.push(data.id);
  return data as { id: string; titre: string; texte: string; position: number };
}

/** L'ordre des identifiants parmi `ids`, tel que la personne `compte` lit le règlement. */
async function ordreVu(compte: Compte, ids: string[]) {
  const { data, error } = await compte.client
    .from("section_reglement")
    .select("id")
    .in("id", ids)
    .order("position");
  if (error) throw error;
  return data.map((ligne) => ligne.id);
}

async function miseAJour() {
  const { data, error } = await clientAdmin()
    .from("reglement")
    .select("mis_a_jour_le")
    .single();
  if (error) throw error;
  return new Date(data.mis_a_jour_le).getTime();
}

describe("règlement intérieur : qui lit, qui écrit", () => {
  it("le conseil syndical crée des sections, rangées dans l'ordre de création", async () => {
    const syndic = await nouveauSyndic();

    const premiere = await nouvelleSection(syndic, { titre: "Première" });
    const seconde = await nouvelleSection(syndic, { titre: "Seconde" });

    expect(premiere).toMatchObject({
      titre: "Première",
      texte: "Pas de bruit après 22h.\n\n- Musique douce\n- **Pas de fête**",
    });
    expect(seconde.position).toBeGreaterThan(premiere.position);
  });

  it("un résident validé ou en attente lit les sections, le conseil syndical aussi", async () => {
    const syndic = await nouveauSyndic();
    const section = await nouvelleSection(syndic);

    for (const lecteur of [
      syndic,
      await nouveauResident("valide"),
      await nouveauResident("en_attente"),
    ]) {
      const { data } = await lecteur.client
        .from("section_reglement")
        .select("titre, texte")
        .eq("id", section.id);
      expect(data).toEqual([{ titre: section.titre, texte: section.texte }]);
    }
  });

  it("un résident refusé ou retiré, et un visiteur, n'en lisent aucune", async () => {
    const syndic = await nouveauSyndic();
    const section = await nouvelleSection(syndic);

    for (const statut of ["refuse", "retire"] as const) {
      const resident = await nouveauResident(statut);
      const { data } = await resident.client
        .from("section_reglement")
        .select("id")
        .eq("id", section.id);
      expect(data).toEqual([]);
    }
    const { data } = await clientVisiteur()
      .from("section_reglement")
      .select("id")
      .eq("id", section.id);
    expect(data ?? []).toEqual([]);
  });

  it("un résident, même validé, ne crée, ne modifie, ne supprime ni ne réordonne une section", async () => {
    const syndic = await nouveauSyndic();
    const section = await nouvelleSection(syndic);
    const autre = await nouvelleSection(syndic, { titre: "Autre" });
    const resident = await nouveauResident("valide");

    const creation = await resident.client
      .from("section_reglement")
      .insert({ titre: "Ma règle", texte: "Texte" });
    await resident.client
      .from("section_reglement")
      .update({ titre: "Renommée" })
      .eq("id", section.id);
    await resident.client
      .from("section_reglement")
      .delete()
      .eq("id", section.id);
    const deplacement = await resident.client.rpc(
      "deplacer_section_reglement",
      {
        section: autre.id,
        vers_le_haut: true,
      },
    );

    expect(creation.error).not.toBeNull();
    expect(deplacement.error).not.toBeNull();
    const { data } = await clientAdmin()
      .from("section_reglement")
      .select("titre")
      .eq("id", section.id)
      .single();
    expect(data?.titre).toBe(section.titre);
    expect(await ordreVu(syndic, [section.id, autre.id])).toEqual([
      section.id,
      autre.id,
    ]);
  });

  it("un visiteur n'écrit ni ne réordonne rien", async () => {
    const syndic = await nouveauSyndic();
    const section = await nouvelleSection(syndic);
    const visiteur = clientVisiteur();

    const creation = await visiteur
      .from("section_reglement")
      .insert({ titre: "Ma règle", texte: "Texte" });
    const deplacement = await visiteur.rpc("deplacer_section_reglement", {
      section: section.id,
      vers_le_haut: true,
    });

    expect(creation.error).not.toBeNull();
    expect(deplacement.error).not.toBeNull();
  });

  it("un membre du conseil syndical dont l'accès est retiré ne lit ni n'écrit rien", async () => {
    const syndic = await nouveauSyndic();
    const retire = await nouveauSyndic();
    const section = await nouvelleSection(syndic);
    await clientAdmin()
      .from("profil")
      .update({ statut: "retire" })
      .eq("id", retire.id);

    const lecture = await retire.client
      .from("section_reglement")
      .select("id")
      .eq("id", section.id);
    const date = await retire.client.from("reglement").select("mis_a_jour_le");
    const creation = await retire.client
      .from("section_reglement")
      .insert({ titre: "Ma règle", texte: "Texte" });
    const deplacement = await retire.client.rpc("deplacer_section_reglement", {
      section: section.id,
      vers_le_haut: true,
    });
    await retire.client
      .from("section_reglement")
      .update({ titre: "Renommée" })
      .eq("id", section.id);

    expect(lecture.data).toEqual([]);
    expect(date.data).toEqual([]);
    expect(creation.error).not.toBeNull();
    expect(deplacement.error).not.toBeNull();
    const { data } = await clientAdmin()
      .from("section_reglement")
      .select("titre")
      .eq("id", section.id)
      .single();
    expect(data?.titre).toBe(section.titre);
  });

  it("le conseil syndical modifie puis supprime une section", async () => {
    const syndic = await nouveauSyndic();
    const section = await nouvelleSection(syndic);

    const modification = await syndic.client
      .from("section_reglement")
      .update({ titre: "Nouveau titre", texte: "Nouveau texte" })
      .eq("id", section.id)
      .select("titre, texte")
      .single();
    const suppression = await syndic.client
      .from("section_reglement")
      .delete()
      .eq("id", section.id)
      .select("id");

    expect(modification.data).toEqual({
      titre: "Nouveau titre",
      texte: "Nouveau texte",
    });
    expect(suppression.data).toHaveLength(1);
  });

  it("refuse un titre vide, un texte vide et un texte trop long", async () => {
    const syndic = await nouveauSyndic();

    for (const champs of [
      { titre: "   " },
      { texte: "  " },
      { texte: "a".repeat(5001) },
      { titre: "t".repeat(101) },
    ]) {
      const { error } = await syndic.client
        .from("section_reglement")
        .insert({ titre: "Titre", texte: "Texte", ...champs });
      expect(error?.code).toBe("23514");
    }
  });

  it("la position ne se choisit pas : seule la fonction de déplacement la change", async () => {
    const syndic = await nouveauSyndic();
    const section = await nouvelleSection(syndic);

    const insertion = await syndic.client
      .from("section_reglement")
      .insert({ titre: "Titre", texte: "Texte", position: 1 });
    const modification = await syndic.client
      .from("section_reglement")
      .update({ position: 1 })
      .eq("id", section.id);

    expect(insertion.error).not.toBeNull();
    expect(modification.error).not.toBeNull();
  });
});

describe("règlement intérieur : l'ordre des sections", () => {
  it("monter puis descendre une section échange sa place avec sa voisine", async () => {
    const syndic = await nouveauSyndic();
    const a = await nouvelleSection(syndic, { titre: "A" });
    const b = await nouvelleSection(syndic, { titre: "B" });
    const c = await nouvelleSection(syndic, { titre: "C" });
    const ids = [a.id, b.id, c.id];

    await syndic.client.rpc("deplacer_section_reglement", {
      section: c.id,
      vers_le_haut: true,
    });
    expect(await ordreVu(syndic, ids)).toEqual([a.id, c.id, b.id]);

    await syndic.client.rpc("deplacer_section_reglement", {
      section: a.id,
      vers_le_haut: false,
    });
    expect(await ordreVu(syndic, ids)).toEqual([c.id, a.id, b.id]);
  });

  it("monter la première ou descendre la dernière ne change rien", async () => {
    const syndic = await nouveauSyndic();
    const a = await nouvelleSection(syndic, { titre: "A" });
    const b = await nouvelleSection(syndic, { titre: "B" });

    const monter = await syndic.client.rpc("deplacer_section_reglement", {
      section: a.id,
      vers_le_haut: true,
    });
    const descendre = await syndic.client.rpc("deplacer_section_reglement", {
      section: b.id,
      vers_le_haut: false,
    });

    expect(monter.error).toBeNull();
    expect(descendre.error).toBeNull();
    expect(await ordreVu(syndic, [a.id, b.id])).toEqual([a.id, b.id]);
  });

  it("une section supprimée ne dérange pas l'ordre des autres", async () => {
    const syndic = await nouveauSyndic();
    const a = await nouvelleSection(syndic, { titre: "A" });
    const b = await nouvelleSection(syndic, { titre: "B" });
    const c = await nouvelleSection(syndic, { titre: "C" });

    await syndic.client.from("section_reglement").delete().eq("id", b.id);
    await syndic.client.rpc("deplacer_section_reglement", {
      section: c.id,
      vers_le_haut: true,
    });

    expect(await ordreVu(syndic, [a.id, c.id])).toEqual([c.id, a.id]);
  });

  it("déplacer une section qui n'existe pas est une erreur", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await syndic.client.rpc("deplacer_section_reglement", {
      section: "00000000-0000-0000-0000-000000000000",
      vers_le_haut: true,
    });

    // Un code que PostgREST sait traduire : le message arrive lisible jusqu'à l'application.
    expect(error).toMatchObject({
      code: "22023",
      message: "Section du règlement introuvable",
    });
  });
});

describe("règlement intérieur : date de dernière mise à jour", () => {
  it("avance à chaque création, modification, déplacement et suppression", async () => {
    const syndic = await nouveauSyndic();
    const attendre = () => new Promise((fin) => setTimeout(fin, 20));

    const a = await nouvelleSection(syndic, { titre: "A" });
    const b = await nouvelleSection(syndic, { titre: "B" });
    let avant = await miseAJour();

    await attendre();
    await syndic.client
      .from("section_reglement")
      .update({ texte: "Autre texte" })
      .eq("id", a.id);
    expect(await miseAJour()).toBeGreaterThan(avant);
    avant = await miseAJour();

    await attendre();
    await syndic.client.rpc("deplacer_section_reglement", {
      section: b.id,
      vers_le_haut: true,
    });
    expect(await miseAJour()).toBeGreaterThan(avant);
    avant = await miseAJour();

    await attendre();
    await syndic.client.from("section_reglement").delete().eq("id", b.id);
    expect(await miseAJour()).toBeGreaterThan(avant);
  });

  it("se lit par un résident validé ou en attente et par le conseil syndical, pas par un résident refusé, retiré ni un visiteur", async () => {
    const syndic = await nouveauSyndic();
    await nouvelleSection(syndic);
    const attendue = await miseAJour();

    for (const lecteur of [
      syndic,
      await nouveauResident("valide"),
      await nouveauResident("en_attente"),
    ]) {
      const { data } = await lecteur.client
        .from("reglement")
        .select("mis_a_jour_le")
        .maybeSingle();
      expect(new Date(data!.mis_a_jour_le).getTime()).toBe(attendue);
    }
    for (const statut of ["refuse", "retire"] as const) {
      const { data } = await (
        await nouveauResident(statut)
      ).client
        .from("reglement")
        .select("mis_a_jour_le");
      expect(data).toEqual([]);
    }
    const { data } = await clientVisiteur()
      .from("reglement")
      .select("mis_a_jour_le");
    expect(data ?? []).toEqual([]);
  });

  it("ne bouge pas quand une écriture est refusée ou ne touche aucune ligne", async () => {
    const syndic = await nouveauSyndic();
    const section = await nouvelleSection(syndic);
    const resident = await nouveauResident("valide");
    const avant = await miseAJour();
    await new Promise((fin) => setTimeout(fin, 20));

    // Le droit de colonne laisse passer ces écritures jusqu'à la RLS, qui ne retient aucune ligne.
    await resident.client
      .from("section_reglement")
      .update({ titre: "Piraté" })
      .eq("id", section.id);
    await resident.client
      .from("section_reglement")
      .delete()
      .eq("id", section.id);
    await syndic.client
      .from("section_reglement")
      .update({ titre: "Aucune ligne" })
      .eq("id", "00000000-0000-0000-0000-000000000000");

    expect(await miseAJour()).toBe(avant);
  });

  it("ne s'écrit pas à la main", async () => {
    const syndic = await nouveauSyndic();
    await nouvelleSection(syndic);
    const avant = await miseAJour();

    await syndic.client
      .from("reglement")
      .update({ mis_a_jour_le: "2020-01-01T00:00:00Z" })
      .eq("id", true);

    expect(await miseAJour()).toBe(avant);
  });
});
