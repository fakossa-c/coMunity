import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** Les appels `.gte(colonne, valeur)` reçus par le client de session, par table. */
const bornes: { table: string; colonne: string; valeur: string }[] = [];

/**
 * Un client de session factice : chaque requête se chaîne comme celle de supabase-js, se lit
 * comme une promesse (`then`) et rend une résidence sans heure de calme, sans espace ni occupation.
 */
vi.mock("./supabase/serveur", () => ({
  clientSession: async () => ({
    from: (table: string) => {
      const requete = {
        select: () => requete,
        not: () => requete,
        eq: () => requete,
        neq: () => requete,
        order: () => requete,
        gte: (colonne: string, valeur: string) => {
          bornes.push({ table, colonne, valeur });
          return requete;
        },
        maybeSingle: () => requete,
        then: (
          resoudre: (resultat: { data: unknown; error: null }) => unknown,
        ) => resoudre({ data: table === "residence" ? null : [], error: null }),
      };
      return requete;
    },
  }),
}));

const { lireContexteParcours } = await import("./regles-residence");

async function borneDesOccupations(maintenant: string) {
  bornes.length = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(maintenant));
  await lireContexteParcours();
  return bornes.find(
    (b) => b.table === "activite" && b.colonne === "date_activite",
  )?.valeur;
}

describe("lireContexteParcours : jour de référence des occupations", () => {
  afterEach(() => vi.useRealTimers());

  it("l'été à 00h30 à Paris, le jour d'UTC est encore la veille : la borne est le jour de Paris", async () => {
    // 2026-06-14 22:30 UTC = 2026-06-15 00:30 à Paris (UTC+2)
    expect(await borneDesOccupations("2026-06-14T22:30:00Z")).toBe(
      "2026-06-15",
    );
  });

  it("l'hiver à 00h30 à Paris, la borne est le jour de Paris", async () => {
    // 2026-12-14 23:30 UTC = 2026-12-15 00:30 à Paris (UTC+1)
    expect(await borneDesOccupations("2026-12-14T23:30:00Z")).toBe(
      "2026-12-15",
    );
  });

  it("en journée, la borne est le jour d'aujourd'hui", async () => {
    expect(await borneDesOccupations("2026-06-15T10:00:00Z")).toBe(
      "2026-06-15",
    );
  });
});
