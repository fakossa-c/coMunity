import { describe, expect, it } from "vitest";
import {
  finApresDebut,
  libelleHeure,
  optionsDebut,
  optionsFin,
} from "./creneaux";

describe("liste des heures de début", () => {
  it("va de 06:00 à 23:30 par pas de 15 minutes", () => {
    const options = optionsDebut("");
    expect(options[0]).toBe("06:00");
    expect(options[1]).toBe("06:15");
    expect(options.at(-1)).toBe("23:30");
    expect(options).toHaveLength(71);
  });

  it("garde une heure existante hors du pas de 15 minutes, à sa place", () => {
    const options = optionsDebut("16:10");
    expect(options).toContain("16:10");
    expect(options.indexOf("16:10")).toBe(options.indexOf("16:00") + 1);
    expect(options).toHaveLength(72);
  });

  it("ne double pas une heure du pas", () => {
    expect(optionsDebut("16:15")).toHaveLength(71);
  });
});

describe("liste des heures de fin", () => {
  it("va jusqu'à 23:45 et sans début propose toute la journée", () => {
    const options = optionsFin("", "");
    expect(options[0]).toBe("06:00");
    expect(options.at(-1)).toBe("23:45");
    expect(options).toHaveLength(72);
  });

  it("ne propose que les heures après le début", () => {
    const options = optionsFin("10:00", "");
    expect(options[0]).toBe("10:15");
    expect(options).not.toContain("10:00");
    expect(options).not.toContain("09:45");
  });

  it("garde une fin existante hors du pas, après le début", () => {
    expect(optionsFin("10:00", "11:20")).toContain("11:20");
  });

  it("n'offre rien après 23:45", () => {
    expect(optionsFin("23:45", "")).toEqual([]);
  });
});

describe("fin qui suit le début", () => {
  it("sans fin, elle vaut le début plus 1 h 30", () => {
    expect(finApresDebut("10:00", "", false)).toBe("11:30");
    expect(finApresDebut("10:15", "", false)).toBe("11:45");
  });

  it("tant que la fin n'a pas été choisie, elle suit le début", () => {
    expect(finApresDebut("14:00", "11:30", false)).toBe("15:30");
  });

  it("une fin choisie qui reste après le début ne bouge pas", () => {
    expect(finApresDebut("10:30", "12:00", true)).toBe("12:00");
  });

  it("une fin choisie devenue trop tôt est ramenée au début plus 1 h 30", () => {
    expect(finApresDebut("12:00", "12:00", true)).toBe("13:30");
    expect(finApresDebut("13:00", "12:00", true)).toBe("14:30");
  });

  it("ne dépasse pas 23:45", () => {
    expect(finApresDebut("22:30", "", false)).toBe("23:45");
    expect(finApresDebut("23:30", "", false)).toBe("23:45");
  });

  it("sans début, la fin ne change pas", () => {
    expect(finApresDebut("", "11:30", true)).toBe("11:30");
    expect(finApresDebut("", "", false)).toBe("");
  });

  it("aucune fin possible après 23:45", () => {
    expect(finApresDebut("23:45", "", false)).toBe("");
  });
});

describe("libellé d'une heure", () => {
  it("s'écrit 14h30, avec le zéro des heures du matin", () => {
    expect(libelleHeure("14:30")).toBe("14h30");
    expect(libelleHeure("06:00")).toBe("06h00");
  });
});
