import { describe, expect, it } from "vitest";
import {
  commandeDeLaPartie,
  enregistrerPartie,
  marqueurDeTest,
  marqueurFrais,
  PARTIES_DE_TEST,
  partiesManquantes,
  ticketDuWorktree,
} from "./session-ticket.mjs";

describe("ticketDuWorktree", () => {
  it("reconnaît un worktree de ticket par son dossier", () => {
    expect(
      ticketDuWorktree({
        estWorktree: true,
        racine: "/home/ubuntu/coMunity/.claude/worktrees/ticket-215",
      }),
    ).toBe(215);
  });

  it("reconnaît le même dossier sous Windows", () => {
    expect(
      ticketDuWorktree({
        estWorktree: true,
        racine: "C:\\Projets\\coMunity\\.claude\\worktrees\\ticket-42",
      }),
    ).toBe(42);
  });

  it("ne reconnaît pas le checkout principal, même sur une branche de ticket", () => {
    expect(
      ticketDuWorktree({
        estWorktree: false,
        racine: "/home/ubuntu/coMunity/.claude/worktrees/ticket-215",
      }),
    ).toBeNull();
  });

  it("ne reconnaît pas un worktree qui n'est pas celui d'un ticket", () => {
    for (const racine of [
      "/home/ubuntu/coMunity/.claude/worktrees/essai",
      "/home/ubuntu/ticket-215",
      "/home/ubuntu/coMunity/.claude/worktrees/ticket-215-bis",
      "/home/ubuntu/coMunity/.claude/worktrees/ticket-",
    ]) {
      expect(ticketDuWorktree({ estWorktree: true, racine })).toBeNull();
    }
  });
});

describe("marqueur du dernier npm test vert", () => {
  const ecritA = "2026-10-08T12:00:00.000Z";

  it("garde le commit et l'état de l'arbre au moment du test", () => {
    expect(
      marqueurDeTest({ commit: "abc123", arbreSale: false, ecritA }),
    ).toEqual({
      commit: "abc123",
      arbreSale: false,
      ecritA,
    });
  });

  it("est frais quand il porte sur le commit de tête et sur un arbre propre", () => {
    const marqueur = marqueurDeTest({
      commit: "abc123",
      arbreSale: false,
      ecritA,
    });
    expect(marqueurFrais(marqueur, "abc123")).toBe(true);
  });

  it("est périmé dès qu'un commit postérieur change la tête", () => {
    const marqueur = marqueurDeTest({
      commit: "abc123",
      arbreSale: false,
      ecritA,
    });
    expect(marqueurFrais(marqueur, "def456")).toBe(false);
  });

  it("ne vaut rien s'il a été écrit sur un arbre avec des modifications non commitées", () => {
    const marqueur = marqueurDeTest({
      commit: "abc123",
      arbreSale: true,
      ecritA,
    });
    expect(marqueurFrais(marqueur, "abc123")).toBe(false);
  });

  it("est périmé quand il manque ou qu'il est illisible", () => {
    expect(marqueurFrais(null, "abc123")).toBe(false);
    expect(marqueurFrais({}, "abc123")).toBe(false);
  });
});

describe("parties de la suite de tests", () => {
  const noms = PARTIES_DE_TEST.map((partie) => partie.nom);
  const ecritA = "2026-10-09T12:00:00.000Z";

  it("coupe en deux chaque projet navigateur, pour tenir sous 10 minutes", () => {
    expect(noms).toEqual([
      "format",
      "unitaires",
      "base",
      "mobile-1",
      "mobile-2",
      "ordinateur-1",
      "ordinateur-2",
    ]);
    const commande = (nom) =>
      PARTIES_DE_TEST.find((partie) => partie.nom === nom).commande;
    expect(commande("mobile-2")).toBe(
      "npx playwright test --project=mobile --shard=2/2",
    );
    expect(commande("ordinateur-1")).toBe(
      "npx playwright test --project=desktop --shard=1/2",
    );
  });

  it("nomme la commande qui lance et enregistre une partie", () => {
    expect(commandeDeLaPartie("base")).toBe("npm run test:partie -- base");
  });

  it("toutes les parties manquent tant que rien n'est enregistré", () => {
    expect(partiesManquantes(null, "abc123")).toEqual(noms);
  });

  it("une partie enregistrée ne manque plus sur ce commit", () => {
    const etat = enregistrerPartie(null, {
      nom: "format",
      commit: "abc123",
      ecritA,
    });
    expect(partiesManquantes(etat, "abc123")).toEqual(noms.slice(1));
  });

  it("garde les parties déjà vertes sur le même commit", () => {
    let etat = null;
    for (const nom of ["format", "base"]) {
      etat = enregistrerPartie(etat, { nom, commit: "abc123", ecritA });
    }
    expect(partiesManquantes(etat, "abc123")).toEqual([
      "unitaires",
      "mobile-1",
      "mobile-2",
      "ordinateur-1",
      "ordinateur-2",
    ]);
  });

  it("un nouveau commit invalide les parties vertes du précédent", () => {
    const etat = enregistrerPartie(null, {
      nom: "format",
      commit: "abc123",
      ecritA,
    });
    expect(partiesManquantes(etat, "def456")).toEqual(noms);
    const suivant = enregistrerPartie(etat, {
      nom: "base",
      commit: "def456",
      ecritA,
    });
    expect(partiesManquantes(suivant, "def456")).toEqual(
      noms.filter((nom) => nom !== "base"),
    );
  });

  it("n'a plus de partie manquante quand toutes sont vertes sur la tête", () => {
    let etat = null;
    for (const nom of noms) {
      etat = enregistrerPartie(etat, { nom, commit: "abc123", ecritA });
    }
    expect(partiesManquantes(etat, "abc123")).toEqual([]);
  });

  it("ignore un état illisible", () => {
    expect(partiesManquantes({}, "abc123")).toEqual(noms);
    expect(partiesManquantes({ commit: "abc123" }, "abc123")).toEqual(noms);
  });
});
