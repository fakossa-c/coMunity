import { describe, expect, it } from "vitest";
import {
  BUCKET_PHOTOS_PROFILS,
  cheminPhotoProfil,
  estCheminPhotoProfil,
  texteAlternatifProfil,
} from "./photo-profil";

const PROFIL = "3f0a7b1e-5c2d-4e8f-9a6b-1c2d3e4f5a6b";
const PHOTO = "8d1e2f30-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

describe("photo de profil", () => {
  it("range la photo dans le dossier de son profil, en JPEG", () => {
    expect(BUCKET_PHOTOS_PROFILS).toBe("profils");
    expect(cheminPhotoProfil(PROFIL, PHOTO)).toBe(`${PROFIL}/${PHOTO}.jpg`);
  });

  it("reconnaît un chemin produit pour ce profil", () => {
    expect(estCheminPhotoProfil(`${PROFIL}/${PHOTO}.jpg`, PROFIL)).toBe(true);
  });

  it.each([
    ["celui d'un autre profil", `${PHOTO}/${PHOTO}.jpg`],
    ["un chemin sans dossier", `${PHOTO}.jpg`],
    ["un autre format", `${PROFIL}/${PHOTO}.png`],
    ["un chemin qui remonte", `${PROFIL}/../${PHOTO}.jpg`],
  ])("refuse %s", (_, chemin) => {
    expect(estCheminPhotoProfil(chemin, PROFIL)).toBe(false);
  });

  it("refuse tout chemin quand l'identifiant du profil n'en est pas un", () => {
    expect(estCheminPhotoProfil(`a.*/${PHOTO}.jpg`, ".*")).toBe(false);
  });

  it("décrit la photo par le pseudo", () => {
    expect(texteAlternatifProfil("Dany")).toBe("Dany, photo de profil");
  });
});
