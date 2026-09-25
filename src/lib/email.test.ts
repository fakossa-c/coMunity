import { describe, expect, it } from "vitest";
import { refusFormatEmail } from "./email";

describe("refusFormatEmail", () => {
  it("accepte une adresse complète", () => {
    expect(refusFormatEmail("prenom.nom@exemple.fr")).toBeNull();
  });

  it.each(["prenom.nom", "prenom@exemple", "prenom nom@exemple.fr", ""])(
    "refuse %o",
    (adresse) => {
      expect(refusFormatEmail(adresse)).toBe(
        "Saisissez une adresse email complète, par exemple prenom.nom@exemple.fr.",
      );
    },
  );
});
