import type { AnimalReport } from "@/lib/supabase";

/** Single line for tables, map popup, modal — continent · country · region. */
export function formatReportLocation(
  r: Pick<
    AnimalReport,
    "location_continent" | "location_country" | "location_region"
  >,
): string | null {
  const parts = [
    r.location_continent,
    r.location_country,
    r.location_region,
  ].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return parts.length ? parts.join(" · ") : null;
}
