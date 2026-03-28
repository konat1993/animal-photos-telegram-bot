import { describe, expect, it } from "vitest";
import { cn, formatReportDate, formatReportDateTime } from "./utils";

describe("formatReportDateTime", () => {
  it("formats UTC ISO in en-GB order", () => {
    expect(formatReportDateTime("2025-03-20T14:30:00.000Z")).toMatch(
      /20\/03\/2025,\s+14:30:00/,
    );
  });

  it("returns original string for invalid date", () => {
    expect(formatReportDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatReportDate", () => {
  it("formats date part only in UTC", () => {
    expect(formatReportDate("2025-03-20T14:30:00.000Z")).toBe("20/03/2025");
  });
});

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
