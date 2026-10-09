import { describe, expect, it } from "vitest";
import { portsIsolation } from "./isoler-supabase-worktree.mjs";

// Linux attribue les ports sortants dans 32768-60999, Windows dans 49152-65535 : un port d'isolation
// pris là peut servir de port source à une connexion HTTPS ouverte, et `supabase start` échoue alors
// avec « address already in use » (incident du 2026-10-09, ticket #246).
const DEBUT_PLAGE_SORTANTE = 32768;

describe("portsIsolation", () => {
  it("garde chaque port sous la plage des connexions sortantes, pour tous les tickets de 0 à 999", () => {
    for (let ticket = 0; ticket < 1000; ticket++) {
      for (const port of Object.values(portsIsolation(ticket))) {
        expect(port).toBeGreaterThan(1023);
        expect(port).toBeLessThan(DEBUT_PLAGE_SORTANTE);
      }
    }
  });

  it("donne sept ports distincts à un ticket", () => {
    const ports = Object.values(portsIsolation(247));
    expect(ports).toHaveLength(7);
    expect(new Set(ports).size).toBe(7);
  });

  it("ne partage aucun port entre deux tickets de numéros voisins", () => {
    for (let ticket = 0; ticket < 999; ticket++) {
      const premier = new Set(Object.values(portsIsolation(ticket)));
      for (const port of Object.values(portsIsolation(ticket + 1))) {
        expect(premier.has(port)).toBe(false);
      }
    }
  });

  it("ne touche pas aux ports 544xx du checkout principal", () => {
    for (let ticket = 0; ticket < 1000; ticket++) {
      for (const port of Object.values(portsIsolation(ticket))) {
        expect(port >= 54400 && port < 54500).toBe(false);
      }
    }
  });

  it("place le ticket #247 à 20000 + (247 % 90) * 10", () => {
    expect(portsIsolation(247)).toEqual({
      api: 20670,
      shadow: 20671,
      db: 20672,
      studio: 20673,
      smtp: 20674,
      pooler: 20675,
      analytics: 20676,
    });
  });
});
