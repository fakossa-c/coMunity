import { afterAll, describe, expect, it } from "vitest";
import {
  clientAdmin,
  clientVisiteur,
  nouveauResident,
  nouveauSyndic,
  type Compte,
} from "./clients";
import { avecFuseau, fuseauDecale, jourParis } from "./paris";

// Ticket #13 : les annonces du conseil syndical. Seul le conseil syndical écrit ; un compte qui
// peut consulter lit ; un visiteur lit une annonce par son lien public, et jamais la liste.

const annoncesCreees: string[] = [];
const fichiersDeposes: string[] = [];

afterAll(async () => {
  const admin = clientAdmin();
  await admin.from("annonce").delete().in("id", annoncesCreees);
  await admin.storage.from("annonces").remove(fichiersDeposes);
});

const ANNONCE = {
  type: "assemblee" as const,
  titre: "Assemblée générale annuelle",
  texte: "L'ordre du jour et les documents sont disponibles.",
  quand: "Jeudi 12 novembre à 18h30",
  lieu: "Salle commune, rez-de-chaussée, bât. A",
};

/** Une annonce publiée par `syndic`, avec les champs de `ANNONCE` sauf mention contraire. */
async function publier(syndic: Compte, champs: object = {}) {
  const { data, error } = await syndic.client
    .from("annonce")
    .insert({ ...ANNONCE, ...champs })
    .select()
    .single();
  if (error) throw error;
  annoncesCreees.push(data.id);
  return data as {
    id: string;
    identifiant_public: string;
    publiee_le: string;
    epinglee: boolean;
  };
}

/** Un jour `AAAA-MM-JJ`, décalé de `jours` par rapport à aujourd'hui (le jour de Paris). */
const jour = jourParis;

/** Les titres que voit `compte` dans la liste du moment, dans l'ordre. */
async function titresDuMoment(client: Compte["client"], fuseau?: string) {
  const { data, error } = await avecFuseau(
    client.rpc("annonces_du_moment"),
    fuseau,
  );
  if (error) throw error;
  return (data as { titre: string }[]).map((annonce) => annonce.titre);
}

describe("annonces : qui lit, qui écrit", () => {
  it("le conseil syndical publie une annonce avec tous ses champs", async () => {
    const syndic = await nouveauSyndic();

    const annonce = await publier(syndic, {
      epinglee: true,
      expire_le: jour(30),
      document_chemin: "abc/convocation.pdf",
      photo_chemin: "abc/salle.jpg",
    });

    expect(annonce).toMatchObject({
      ...ANNONCE,
      epinglee: true,
      expire_le: jour(30),
      document_chemin: "abc/convocation.pdf",
      photo_chemin: "abc/salle.jpg",
    });
    expect(annonce.identifiant_public).toMatch(/^[a-z0-9]{12}$/);
    expect(new Date(annonce.publiee_le).getTime()).toBeGreaterThan(
      Date.now() - 60_000,
    );
  });

  it("un type inconnu est refusé", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await syndic.client
      .from("annonce")
      .insert({ ...ANNONCE, type: "publicite" });

    expect(error).not.toBeNull();
  });

  it("le conseil syndical épingle, modifie et supprime une annonce", async () => {
    const syndic = await nouveauSyndic();
    const annonce = await publier(syndic);

    const modification = await syndic.client
      .from("annonce")
      .update({ titre: "Assemblée reportée", epinglee: true })
      .eq("id", annonce.id)
      .select("titre, epinglee");
    const suppression = await syndic.client
      .from("annonce")
      .delete()
      .eq("id", annonce.id)
      .select("id");

    expect(modification.data).toEqual([
      { titre: "Assemblée reportée", epinglee: true },
    ]);
    expect(suppression.data).toEqual([{ id: annonce.id }]);
  });

  it("un résident ne publie, ne modifie ni ne supprime une annonce", async () => {
    const syndic = await nouveauSyndic();
    const annonce = await publier(syndic);
    const resident = await nouveauResident("valide");

    const creation = await resident.client.from("annonce").insert(ANNONCE);
    const modification = await resident.client
      .from("annonce")
      .update({ titre: "Détournée" })
      .eq("id", annonce.id)
      .select("id");
    const suppression = await resident.client
      .from("annonce")
      .delete()
      .eq("id", annonce.id)
      .select("id");

    expect(creation.error).not.toBeNull();
    expect(modification.data ?? []).toEqual([]);
    expect(suppression.data ?? []).toEqual([]);
    const { data } = await syndic.client
      .from("annonce")
      .select("titre")
      .eq("id", annonce.id);
    expect(data).toEqual([{ titre: ANNONCE.titre }]);
  });

  it("un résident validé ou en attente lit les annonces", async () => {
    const syndic = await nouveauSyndic();
    const annonce = await publier(syndic);

    for (const statut of ["valide", "en_attente"] as const) {
      const resident = await nouveauResident(statut);
      const { data } = await resident.client
        .from("annonce")
        .select("titre")
        .eq("id", annonce.id);
      expect(data).toEqual([{ titre: ANNONCE.titre }]);
    }
  });

  it("un résident refusé ou retiré, et un visiteur, n'en lisent aucune", async () => {
    const syndic = await nouveauSyndic();
    const annonce = await publier(syndic);

    for (const statut of ["refuse", "retire"] as const) {
      const resident = await nouveauResident(statut);
      const { data } = await resident.client
        .from("annonce")
        .select("id")
        .eq("id", annonce.id);
      expect(data).toEqual([]);
      expect(await titresDuMoment(resident.client)).toEqual([]);
    }
    const visiteur = clientVisiteur();
    const { data } = await visiteur.from("annonce").select("id");
    expect(data ?? []).toEqual([]);
    const liste = await visiteur.rpc("annonces_du_moment");
    expect(liste.error).not.toBeNull();
  });
});

describe("lien public d'une annonce", () => {
  it("un visiteur lit l'annonce par son identifiant public, sans aucun nom", async () => {
    const syndic = await nouveauSyndic();
    const annonce = await publier(syndic, {
      photo_chemin: "abc/salle.jpg",
      document_chemin: "abc/convocation.pdf",
    });

    const { data, error } = await clientVisiteur()
      .rpc("fiche_annonce", { identifiant: annonce.identifiant_public })
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toEqual({
      identifiant_public: annonce.identifiant_public,
      ...ANNONCE,
      photo_chemin: "abc/salle.jpg",
      document_chemin: "abc/convocation.pdf",
      publiee_le: annonce.publiee_le,
      expire_le: null,
    });
  });

  it("un identifiant inconnu ne renvoie rien", async () => {
    const { data, error } = await clientVisiteur()
      .rpc("fiche_annonce", { identifiant: "inconnu00000" })
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("une annonce expirée reste lisible par son lien", async () => {
    const syndic = await nouveauSyndic();
    const annonce = await publier(syndic, { expire_le: jour(-3) });

    const { data } = await clientVisiteur()
      .rpc("fiche_annonce", { identifiant: annonce.identifiant_public })
      .maybeSingle<{ expire_le: string }>();

    expect(data?.expire_le).toBe(jour(-3));
  });
});

describe("annonces du moment", () => {
  it("une annonce expirée disparaît, celle qui expire aujourd'hui reste", async () => {
    const syndic = await nouveauSyndic();
    await publier(syndic, { titre: "Hier, expirée", expire_le: jour(-1) });
    await publier(syndic, {
      titre: "Aujourd'hui, encore là",
      expire_le: jour(0),
    });
    await publier(syndic, { titre: "Sans échéance" });

    const titres = await titresDuMoment(syndic.client);

    expect(titres).not.toContain("Hier, expirée");
    expect(titres).toContain("Aujourd'hui, encore là");
    expect(titres).toContain("Sans échéance");
  });

  it("l'expiration suit le jour de Paris, pas celui du fuseau de la session (la nuit, UTC est encore la veille)", async () => {
    const syndic = await nouveauSyndic();
    await publier(syndic, { titre: "Nuit, hier expirée", expire_le: jour(-1) });
    await publier(syndic, {
      titre: "Nuit, aujourd'hui encore là",
      expire_le: jour(0),
    });

    const titres = await titresDuMoment(syndic.client, fuseauDecale());

    expect(titres).not.toContain("Nuit, hier expirée");
    expect(titres).toContain("Nuit, aujourd'hui encore là");
  });

  it("les annonces épinglées passent en tête, puis les plus récentes", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const ancienne = await publier(syndic, { titre: "Ancienne épinglée" });
    await publier(syndic, { titre: "Récente libre" });
    await publier(syndic, { titre: "Plus récente libre" });
    await syndic.client
      .from("annonce")
      .update({ epinglee: true })
      .eq("id", ancienne.id);
    const recente = await publier(syndic, { titre: "Récente épinglée" });
    await syndic.client
      .from("annonce")
      .update({ epinglee: true })
      .eq("id", recente.id);

    const titres = (await titresDuMoment(resident.client)).filter((titre) =>
      /libre|épinglée/.test(titre),
    );

    expect(titres).toEqual([
      "Récente épinglée",
      "Ancienne épinglée",
      "Plus récente libre",
      "Récente libre",
    ]);
  });
});

describe("photo et document joints", () => {
  const PDF = new Blob(["%PDF-1.4 convocation"], { type: "application/pdf" });

  async function deposer(compte: Compte, chemin: string, fichier: Blob) {
    fichiersDeposes.push(chemin);
    return compte.client.storage
      .from("annonces")
      .upload(chemin, fichier, { contentType: fichier.type });
  }

  it("le conseil syndical dépose un PDF, lisible par tous à son adresse", async () => {
    const syndic = await nouveauSyndic();
    const chemin = `${syndic.id}/convocation.pdf`;

    const { error } = await deposer(syndic, chemin, PDF);

    expect(error).toBeNull();
    const { publicUrl } = clientVisiteur()
      .storage.from("annonces")
      .getPublicUrl(chemin).data;
    const reponse = await fetch(publicUrl);
    expect(reponse.status).toBe(200);
    expect(await reponse.text()).toBe("%PDF-1.4 convocation");
  });

  it("un résident ne dépose aucun fichier", async () => {
    const resident = await nouveauResident("valide");

    const { error } = await deposer(
      resident,
      `${resident.id}/convocation.pdf`,
      PDF,
    );

    expect(error).not.toBeNull();
  });

  it("le bucket refuse un format qui n'est ni une image ni un PDF", async () => {
    const syndic = await nouveauSyndic();

    const { error } = await deposer(
      syndic,
      `${syndic.id}/script.html`,
      new Blob(["<script>alert(1)</script>"], { type: "text/html" }),
    );

    expect(error).not.toBeNull();
  });

  it("le conseil syndical retire un fichier, pas un résident", async () => {
    const syndic = await nouveauSyndic();
    const resident = await nouveauResident("valide");
    const chemin = `${syndic.id}/ancienne-convocation.pdf`;
    await deposer(syndic, chemin, PDF);

    const parResident = await resident.client.storage
      .from("annonces")
      .remove([chemin]);
    const parSyndic = await syndic.client.storage
      .from("annonces")
      .remove([chemin]);

    expect(parResident.data ?? []).toEqual([]);
    expect(parSyndic.data).toHaveLength(1);
  });
});
