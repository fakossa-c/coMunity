import { describe, expect, it } from "vitest";
import {
  etiquettesActivite,
  etiquettesDuGroupe,
  groupesEtiquettes,
} from "./etiquettes-activite";

// Amendement du 24/09/2026 du ticket #9 : deux listes fermées, dans cet ordre.
describe("étiquettes d'une activité", () => {
  it("la liste Accessibilité est fermée et ordonnée", () => {
    expect(
      etiquettesDuGroupe("accessibilite").map(
        (cle) => etiquettesActivite[cle].libelle,
      ),
    ).toEqual([
      "Accès plain-pied",
      "Ascenseur",
      "Chaises prévues",
      "Sièges confortables",
      "Ambiance calme",
    ]);
  });

  it("la liste Pour qui est fermée et ordonnée", () => {
    expect(
      etiquettesDuGroupe("pour_qui").map(
        (cle) => etiquettesActivite[cle].libelle,
      ),
    ).toEqual(["Enfants bienvenus", "Tous âges", "Animaux acceptés"]);
  });

  it("l'accessibilité est en vert, les familles en abricot", () => {
    expect(groupesEtiquettes.accessibilite).toMatchObject({
      titre: "Accessibilité",
      ton: "vert",
    });
    expect(groupesEtiquettes.pour_qui).toMatchObject({
      titre: "Pour qui",
      ton: "abricot",
    });
  });

  it("les clés sont celles de l'énumération en base", () => {
    expect(Object.keys(etiquettesActivite)).toEqual([
      "acces_plain_pied",
      "ascenseur",
      "chaises_prevues",
      "sieges_confortables",
      "ambiance_calme",
      "enfants_bienvenus",
      "tous_ages",
      "animaux_acceptes",
    ]);
  });
});
