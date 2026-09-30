import { describe, expect, it } from "vitest";
import { rangOrdinal } from "./rang";

describe("rangOrdinal", () => {
  it("écrit la première place « 1re »", () => {
    expect(rangOrdinal(1)).toBe("1re");
  });

  it("écrit les suivantes avec « e »", () => {
    expect(rangOrdinal(2)).toBe("2e");
    expect(rangOrdinal(11)).toBe("11e");
  });
});
