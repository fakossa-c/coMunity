import { describe, expect, it } from "vitest";
import { verdict } from "./hook-pre-outil.mjs";

const session = (outil, entree = {}) => ({ ticket: 215, outil, entree });

describe("verdict avant outil", () => {
  it("laisse tout passer hors d'un worktree de ticket", () => {
    expect(
      verdict({
        ticket: null,
        outil: "Bash",
        entree: { command: "npm run dev", run_in_background: true },
      }),
    ).toBeNull();
    expect(verdict({ ticket: null, outil: "Monitor", entree: {} })).toBeNull();
  });

  it("refuse une commande Bash lancée en arrière-plan, en disant pourquoi", () => {
    const raison = verdict(
      session("Bash", { command: "npm run dev", run_in_background: true }),
    );
    expect(raison).toMatch(/arrière-plan/);
    expect(raison).toMatch(/fin de tour/);
  });

  it("refuse aussi une commande PowerShell lancée en arrière-plan", () => {
    expect(
      verdict(
        session("PowerShell", { command: "npm run dev", run_in_background: true }),
      ),
    ).toMatch(/arrière-plan/);
  });

  it("refuse une commande qui se détache elle-même avec &", () => {
    for (const command of [
      "npm run dev &",
      "npx supabase start & sleep 5",
      "nohup node serveur.mjs > journal.txt 2>&1 &",
    ]) {
      expect(verdict(session("Bash", { command }))).toMatch(/arrière-plan/);
    }
  });

  it("laisse passer une commande au premier plan", () => {
    for (const command of [
      "npm test",
      "git status && git diff",
      "npm run build 2>&1 | tail -5",
      "npm test &> journal.txt",
      "npm test |& tee journal.txt",
      'curl "https://exemple.fr/?a=1&b=2"',
      "echo 'a & b'",
    ]) {
      expect(verdict(session("Bash", { command }))).toBeNull();
    }
  });

  it("laisse passer une commande Bash qui ne demande pas l'arrière-plan", () => {
    expect(
      verdict(session("Bash", { command: "ls", run_in_background: false })),
    ).toBeNull();
  });

  it("refuse les outils d'attente", () => {
    for (const outil of ["Monitor", "TaskOutput"]) {
      expect(verdict(session(outil))).toMatch(/attente/);
    }
  });

  it("laisse passer les autres outils", () => {
    for (const outil of ["Read", "Edit", "Write", "Grep"]) {
      expect(verdict(session(outil, { file_path: "a.txt" }))).toBeNull();
    }
  });
});
