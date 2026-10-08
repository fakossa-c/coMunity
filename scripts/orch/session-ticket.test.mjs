import { describe, expect, it } from "vitest";
import {
  marqueurDeTest,
  marqueurFrais,
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
