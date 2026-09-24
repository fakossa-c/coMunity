import { describe, expect, it } from "vitest";
import { clientAdmin, clientVisiteur } from "./clients";

describe("résidence, vue par un visiteur non connecté", () => {
  it("lit le nom de la résidence", async () => {
    const { data, error } = await clientVisiteur()
      .from("residence")
      .select("nom")
      .single();

    expect(error).toBeNull();
    expect(data?.nom).toBe("Résidence Les Tilleuls");
  });

  it("la résidence n'a plus de code d'inscription", async () => {
    const { error } = await clientAdmin()
      .from("residence")
      .select("code")
      .single();

    // 42703 : colonne inexistante.
    expect(error?.code).toBe("42703");
  });
});
