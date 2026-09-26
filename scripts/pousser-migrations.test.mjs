import { describe, expect, it } from "vitest";
import { analyser, instructionsRisquees } from "./pousser-migrations.mjs";

const m = (local, remote) => ({ local, remote });

describe("analyser", () => {
  it("rien à pousser quand local et distant concordent", () => {
    expect(analyser([m("1", "1"), m("2", "2")])).toEqual({
      aPousser: [],
      absentesEnLocal: [],
      horsOrdre: [],
    });
  });

  it("liste les migrations locales absentes du distant", () => {
    expect(analyser([m("1", "1"), m("3", ""), m("4", "")]).aPousser).toEqual([
      "3",
      "4",
    ]);
  });

  it("signale une migration distante absente en local (poussée depuis une autre branche)", () => {
    expect(analyser([m("1", "1"), m("", "2")]).absentesEnLocal).toEqual(["2"]);
  });

  it("signale une migration à pousser plus ancienne que la dernière distante", () => {
    const resultat = analyser([m("1", "1"), m("2", ""), m("3", "3")]);
    expect(resultat.aPousser).toEqual(["2"]);
    expect(resultat.horsOrdre).toEqual(["2"]);
  });
});

describe("instructionsRisquees", () => {
  it("repère les suppressions et renommages de colonnes ou de tables", () => {
    const sql = [
      "alter table public.residence drop column code;",
      "alter table public.activite rename column lieu to endroit;",
      "drop table public.ancienne;",
      "alter table public.activite alter column capacite type bigint;",
    ].join("\n");
    expect(instructionsRisquees(sql)).toHaveLength(4);
  });

  it("ignore les ajouts et les fonctions recréées", () => {
    const sql = [
      "alter table public.activite add column capacite_max int;",
      "drop function public.fiche_activite(text);",
      "create function public.fiche_activite(identifiant text) returns json as $$ select 1 $$;",
    ].join("\n");
    expect(instructionsRisquees(sql)).toEqual([]);
  });
});
