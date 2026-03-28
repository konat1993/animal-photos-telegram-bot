import { describe, expect, it } from "vitest";
import {
  colorForSpecies,
  speciesDisplayLabel,
  speciesNormalizeKey,
} from "./species-color";

describe("speciesNormalizeKey", () => {
  it("trims, lowercases, collapses spaces", () => {
    expect(speciesNormalizeKey("  Red  Deer  ")).toBe("red deer");
  });

  it("returns unknown for empty after trim", () => {
    expect(speciesNormalizeKey("   ")).toBe("unknown");
  });
});

describe("speciesDisplayLabel", () => {
  it("title-cases words", () => {
    expect(speciesDisplayLabel("red deer")).toBe("Red Deer");
  });

  it("maps unknown key to Unknown", () => {
    expect(speciesDisplayLabel("unknown")).toBe("Unknown");
  });
});

describe("colorForSpecies", () => {
  it("is stable for the same label", () => {
    expect(colorForSpecies("Red Fox")).toBe(colorForSpecies("red  fox"));
  });

  it("uses palette for known species", () => {
    const c = colorForSpecies("European roe deer");
    expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
