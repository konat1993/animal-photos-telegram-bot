import { describe, expect, it } from "vitest";
import { formatReportLocation } from "./location-display";

describe("formatReportLocation", () => {
  it("joins non-empty parts with middle dot", () => {
    expect(
      formatReportLocation({
        location_continent: "Europe",
        location_country: "Poland",
        location_region: "Mazovia",
      }),
    ).toBe("Europe · Poland · Mazovia");
  });

  it("omits null/empty parts", () => {
    expect(
      formatReportLocation({
        location_continent: null,
        location_country: "Poland",
        location_region: "  ",
      }),
    ).toBe("Poland");
  });

  it("returns null when nothing usable", () => {
    expect(
      formatReportLocation({
        location_continent: null,
        location_country: null,
        location_region: null,
      }),
    ).toBeNull();
  });
});
