import { describe, expect, it } from "vitest";
import { dossierCible, verdict } from "./garde-supabase.mjs";

const worktreeIsole = { estWorktree: true, projectId: "comunity-ticket-16" };
const worktreeNonIsole = { estWorktree: true, projectId: "comunity" };
const principal = { estWorktree: false, projectId: "comunity" };

describe("verdict", () => {
  it("laisse passer ce qui ne touche pas à Supabase", () => {
    expect(verdict({ commande: "npm test", ...worktreeNonIsole })).toBeNull();
    expect(verdict({ commande: "git status", ...principal })).toBeNull();
  });

  it("bloque start, stop et db reset dans un worktree non isolé", () => {
    for (const commande of [
      "npx supabase start",
      "npx supabase stop --no-backup",
      "npx supabase db reset",
      "node node_modules/supabase/dist/supabase.js db reset",
    ]) {
      expect(verdict({ commande, ...worktreeNonIsole })).toMatch(
        /isoler-supabase-worktree/,
      );
    }
  });

  it("laisse passer start et db reset dans un worktree isolé ou le checkout principal", () => {
    expect(
      verdict({ commande: "npx supabase db reset", ...worktreeIsole }),
    ).toBeNull();
    expect(
      verdict({ commande: "npx supabase start", ...principal }),
    ).toBeNull();
  });

  it("redirige tout db push vers la commande du dépôt", () => {
    for (const contexte of [worktreeIsole, worktreeNonIsole, principal]) {
      expect(
        verdict({ commande: "npx supabase db push", ...contexte }),
      ).toMatch(/npm run db:pousser/);
    }
  });

  it("n'autorise migration repair que depuis le checkout principal", () => {
    const commande =
      "npx supabase migration repair --status applied 20260924200000";
    expect(verdict({ commande, ...worktreeIsole })).toMatch(
      /checkout principal/,
    );
    expect(verdict({ commande, ...principal })).toBeNull();
  });

  it("laisse passer les lectures distantes", () => {
    expect(
      verdict({ commande: "npx supabase migration list --linked", ...worktreeIsole }),
    ).toBeNull();
    expect(
      verdict({ commande: "npx supabase status", ...worktreeNonIsole }),
    ).toBeNull();
  });
});

describe("dossierCible", () => {
  it("garde le dossier courant sans cd", () => {
    expect(dossierCible("npx supabase start", "C:/depot")).toBe("C:/depot");
  });

  it("suit le dernier cd qui précède la commande", () => {
    expect(
      dossierCible(
        'cd "C:/depot/.worktrees/comunity-ticket-9" && npx supabase db reset',
        "C:/depot",
      ),
    ).toBe("C:/depot/.worktrees/comunity-ticket-9");
    expect(
      dossierCible("cd ../autre; npx supabase start", "C:/depot/a"),
    ).toBe("C:/depot/autre");
  });
});
