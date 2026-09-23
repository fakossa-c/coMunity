import { describe, expect, it } from "vitest";
import { ETAGES, libelleEtage } from "./etage";

describe("libellé d'un étage", () => {
  it.each([
    [0, "Rez-de-chaussée"],
    [1, "1er étage"],
    [2, "2e étage"],
    [11, "11e étage"],
  ])("%i : %s", (etage, libelle) => {
    expect(libelleEtage(etage)).toBe(libelle);
  });
});

describe("étages proposés à l'inscription", () => {
  it("vont du rez-de-chaussée au 20e étage, dans l'ordre", () => {
    expect(ETAGES[0]).toBe(0);
    expect(ETAGES.at(-1)).toBe(20);
    expect(ETAGES).toHaveLength(21);
  });
});
