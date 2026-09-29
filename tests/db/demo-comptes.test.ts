import { inject, describe, expect, it, afterAll, beforeAll } from "vitest";
import {
  COMPTES,
  MODELE_DEMO,
  adresseDemo,
  amorcerDemo,
  retirerDemo,
} from "../../scripts/demo-comptes.mjs";
import { clientAdmin, connecter, nouveauResident } from "./clients";

// Un modèle à part : ces tests ne touchent ni aux vrais comptes fakossa+ ni aux autres fichiers.
const modele = {
  ...MODELE_DEMO,
  prefixe: "demotest+",
  domaine: "exemple.fr",
  marqueur: "dmtt",
};
const emails = COMPTES.map((c) => adresseDemo(c.username, modele));

// Amorcer ou retirer enchaîne une centaine d'appels : plus que les 5 s par défaut quand la suite tourne en entier.
const DELAI_LONG = 60_000;

function parametres() {
  const { url, cleSecrete } = inject("supabase");
  return { url, cleSecrete, modele };
}

async function profilsDemo() {
  const { data, error } = await clientAdmin()
    .from("profil")
    .select("id, email, role, statut, prenom, nom")
    .in("email", emails);
  if (error) throw error;
  return data;
}

async function activitesDemo() {
  const { data, error } = await clientAdmin()
    .from("activite")
    .select("id, titre, categorie, statut, capacite_max, date_activite")
    .like("identifiant_public", "dmtt%");
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  await retirerDemo(parametres());
  await amorcerDemo(parametres());
}, DELAI_LONG);

afterAll(async () => {
  await retirerDemo(parametres());
}, DELAI_LONG);

describe("amorcerDemo : comptes", () => {
  it("crée un compte par username, avec le rôle et le statut prévus", async () => {
    const profils = await profilsDemo();
    expect(profils).toHaveLength(COMPTES.length);
    for (const compte of COMPTES) {
      const profil = profils.find(
        (p) => p.email === adresseDemo(compte.username, modele),
      );
      expect(profil, compte.username).toMatchObject({
        role: compte.role,
        statut: compte.statut,
        prenom: compte.prenom,
        nom: compte.nom,
      });
    }
  });

  it("donne à chaque compte son adresse pour mot de passe", async () => {
    for (const email of emails) {
      await expect(connecter(email, email)).resolves.toBeDefined();
    }
  });

  it(
    "ne double rien quand on relance",
    async () => {
      const avant = {
        profils: (await profilsDemo()).length,
        activites: (await activitesDemo()).length,
      };
      await amorcerDemo(parametres());
      expect((await profilsDemo()).length).toBe(avant.profils);
      expect((await activitesDemo()).length).toBe(avant.activites);
      await expect(connecter(emails[0], emails[0])).resolves.toBeDefined();
    },
    DELAI_LONG,
  );
});

describe("amorcerDemo : activités", () => {
  it("couvre les cinq catégories et les états publiée, annulée, en relecture et masquée", async () => {
    const activites = await activitesDemo();
    expect(new Set(activites.map((a) => a.categorie)).size).toBe(5);
    const statuts = new Set(activites.map((a) => a.statut));
    for (const statut of ["publiee", "annulee", "en_relecture", "masquee"]) {
      expect(statuts.has(statut), statut).toBe(true);
    }
  });

  it("propose des activités à venir et des activités passées", async () => {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const activites = await activitesDemo();
    expect(activites.some((a) => a.date_activite > aujourdhui)).toBe(true);
    expect(activites.some((a) => a.date_activite < aujourdhui)).toBe(true);
  });

  it("compte une activité complète, accompagnants compris", async () => {
    const admin = clientAdmin();
    const activites = await activitesDemo();
    const completes = [];
    for (const activite of activites.filter((a) => a.capacite_max)) {
      const { data } = await admin
        .from("inscription_activite")
        .select("accompagnants")
        .eq("activite_id", activite.id);
      const prises = (data ?? []).reduce((s, i) => s + 1 + i.accompagnants, 0);
      if (prises === activite.capacite_max) completes.push(activite.titre);
    }
    expect(completes.length).toBeGreaterThan(0);
  });

  it("laisse des retours sur une activité passée", async () => {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const passees = (await activitesDemo())
      .filter((a) => a.date_activite < aujourdhui)
      .map((a) => a.id);
    const { data } = await clientAdmin()
      .from("retour")
      .select("id")
      .in("activite_id", passees);
    expect(data?.length ?? 0).toBeGreaterThan(0);
  });

  it("garde la mise en relecture visible du syndic, avec sa raison", async () => {
    const enRelecture = (await activitesDemo()).find(
      (a) => a.statut === "en_relecture",
    );
    const { data } = await clientAdmin()
      .from("moderation_activite")
      .select("raison_relecture")
      .eq("activite_id", enRelecture!.id)
      .single();
    expect(data?.raison_relecture).toBeTruthy();
  });

  it("montre le catalogue à un résident validé, et rien à un résident refusé", async () => {
    const validé = await connecter(
      adresseDemo("danielle", modele),
      adresseDemo("danielle", modele),
    );
    const vu = await validé
      .from("activite")
      .select("id")
      .like("identifiant_public", "dmtt%");
    expect(vu.data?.length ?? 0).toBeGreaterThan(3);

    const refuse = await connecter(
      adresseDemo("refuse", modele),
      adresseDemo("refuse", modele),
    );
    const rien = await refuse
      .from("activite")
      .select("id")
      .like("identifiant_public", "dmtt%");
    expect(rien.data ?? []).toHaveLength(0);
  });
});

describe("amorcerDemo : annonces", () => {
  it("publie des annonces dont deux sondages, l'un échu, avec des réponses", async () => {
    const admin = clientAdmin();
    const annonces = await admin
      .from("annonce")
      .select("id, type")
      .like("identifiant_public", "dmtt%");
    expect(annonces.data?.length ?? 0).toBeGreaterThanOrEqual(3);

    const sondages = await admin
      .from("sondage")
      .select("id, echeance")
      .in(
        "annonce_id",
        (annonces.data ?? []).map((a) => a.id),
      );
    expect(sondages.data).toHaveLength(2);
    const aujourdhui = new Date().toISOString().slice(0, 10);
    expect(sondages.data!.some((s) => s.echeance < aujourdhui)).toBe(true);
    expect(sondages.data!.some((s) => s.echeance >= aujourdhui)).toBe(true);

    const reponses = await admin
      .from("reponse_sondage")
      .select("profil_id")
      .in(
        "sondage_id",
        sondages.data!.map((s) => s.id),
      );
    expect(reponses.data?.length ?? 0).toBeGreaterThan(2);
  });
});

describe("retirerDemo", () => {
  it(
    "supprime les comptes, leurs activités et les annonces de démonstration, rien d'autre",
    async () => {
      const admin = clientAdmin();
      const etranger = await nouveauResident();
      const autre = await admin
        .from("annonce")
        .insert({
          type: "info",
          titre: "Annonce d'un autre",
          texte: "à garder",
        })
        .select("id")
        .single();

      const retires = await retirerDemo(parametres());
      expect(retires.comptes).toBe(COMPTES.length);

      expect(await profilsDemo()).toHaveLength(0);
      expect(await activitesDemo()).toHaveLength(0);
      const annonces = await admin
        .from("annonce")
        .select("id")
        .like("identifiant_public", "dmtt%");
      expect(annonces.data).toHaveLength(0);

      const reste = await admin
        .from("profil")
        .select("id")
        .eq("id", etranger.id);
      expect(reste.data).toHaveLength(1);
      const annonceRestante = await admin
        .from("annonce")
        .select("id")
        .eq("id", autre.data!.id);
      expect(annonceRestante.data).toHaveLength(1);
      await admin.from("annonce").delete().eq("id", autre.data!.id);
    },
    DELAI_LONG,
  );

  it("peut se relancer sans rien à retirer", async () => {
    await expect(retirerDemo(parametres())).resolves.toMatchObject({
      comptes: 0,
    });
  });
});
