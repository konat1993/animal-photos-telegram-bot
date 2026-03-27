/**
 * Species colors — UI only (OpenAI / backend return text labels, not hex).
 *
 * Short fixed palette + deterministic hash from species name so:
 * - the same species keeps the same color on chart and map;
 * - with hundreds of species we do not need one color per animal (repeats are expected).
 */
/** 21 hues spread around the wheel (similar saturation — readable on map and chart). */
export const SPECIES_COLOR_PALETTE = [
  "#15803d",
  "#16a34a",
  "#22c55e",
  "#4d7c0f",
  "#65a30d",
  "#ca8a04",
  "#d97706",
  "#ea580c",
  "#dc2626",
  "#e11d48",
  "#db2777",
  "#c026d3",
  "#9333ea",
  "#6d28d9",
  "#4f46e5",
  "#2563eb",
  "#0284c7",
  "#0e7490",
  "#0f766e",
  "#115e59",
  "#854d0e",
] as const;

/** Gray "Other" slice on the chart — not tied to one species. */
export const SPECIES_OTHER_SLICE_COLOR = "#64748b";

/** Same species with different casing/spacing → one key (chart, colors, KPIs). */
export function speciesNormalizeKey(raw: string): string {
	const t = raw.trim().toLowerCase().replace(/\s+/g, " ");
	return t || "unknown";
}

/** Display label from a normalized key (legend, table when unified). */
export function speciesDisplayLabel(key: string): string {
	if (key === "unknown") return "Unknown";
	return key.replace(/\b\w/g, (c) => c.toUpperCase());
}

function stableSpeciesHash(species: string): number {
  let h = 2166136261;
  for (let i = 0; i < species.length; i++) {
    h ^= species.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Color for one species (chart, legend, markers). */
export function colorForSpecies(species: string): string {
	const key = speciesNormalizeKey(species);
	if (key === "unknown") return SPECIES_COLOR_PALETTE[0];
	const idx = stableSpeciesHash(key) % SPECIES_COLOR_PALETTE.length;
	return SPECIES_COLOR_PALETTE[idx];
}
