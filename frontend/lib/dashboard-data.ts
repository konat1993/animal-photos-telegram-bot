import { getDemoDashboardData, isDemoMode } from "@/lib/demo-data";
import { type AnimalReport, supabase } from "@/lib/supabase";

export interface DashboardFilters {
	species?: string;
	date_from?: string;
	date_to?: string;
}

export type DashboardData = {
	reports: AnimalReport[];
	speciesCounts: { species: string; count: number }[];
	allSpecies: string[];
	mapPoints: {
		id: string;
		lat: number;
		lng: number;
		species: string;
		created_at: string;
		photo_url: string;
	}[];
	total: number;
	topSpecies: string;
	avgConfidence: number | null;
};

export type DashboardLoadResult =
	| { ok: true; data: DashboardData }
	| { ok: false; message: string };

async function fetchData(filters: DashboardFilters): Promise<DashboardData> {
	if (isDemoMode()) {
		return getDemoDashboardData(filters);
	}

	let query = supabase
		.from("animal_reports")
		.select("*")
		.order("created_at", { ascending: false });

	if (filters.species) {
		query = query.eq("identified_species", filters.species);
	}
	if (filters.date_from) {
		query = query.gte("created_at", filters.date_from);
	}
	if (filters.date_to) {
		const endDate = new Date(filters.date_to);
		endDate.setDate(endDate.getDate() + 1);
		query = query.lt(
			"created_at",
			endDate.toISOString().split("T")[0],
		);
	}

	const { data: reports, error: reportsError } = await query;

	const { data: allReports, error: allError } = await supabase
		.from("animal_reports")
		.select("identified_species");

	if (reportsError || allError) {
		throw new Error(
			reportsError?.message ||
				allError?.message ||
				"Failed to fetch data",
		);
	}

	const speciesMap: Record<string, number> = {};
	for (const r of allReports ?? []) {
		speciesMap[r.identified_species] =
			(speciesMap[r.identified_species] || 0) + 1;
	}
	const speciesCounts = Object.entries(speciesMap)
		.map(([species, count]) => ({ species, count }))
		.sort((a, b) => b.count - a.count);

	const allSpecies = speciesCounts.map((s) => s.species);

	const mapPoints = (reports ?? []).map((r: AnimalReport) => ({
		id: r.id,
		lat: r.latitude,
		lng: r.longitude,
		species: r.identified_species,
		created_at: r.created_at,
		photo_url: r.photo_url,
	}));

	const total = reports?.length ?? 0;
	const topSpecies = speciesCounts[0]?.species ?? "—";
	const confidenceValues = (reports ?? [])
		.map((r: AnimalReport) => r.confidence)
		.filter((c): c is number => c != null);
	const avgConfidence =
		confidenceValues.length > 0
			? confidenceValues.reduce((a, b) => a + b, 0) /
				confidenceValues.length
			: null;

	return {
		reports: reports as AnimalReport[],
		speciesCounts,
		allSpecies,
		mapPoints,
		total,
		topSpecies,
		avgConfidence,
	};
}

/** Starts the fetch without awaiting; pass the same promise into KPI/detail `<Suspense>` cells. */
export function loadDashboard(
	filters: DashboardFilters,
): Promise<DashboardLoadResult> {
	return fetchData(filters)
		.then((data) => ({ ok: true as const, data }))
		.catch((err: unknown) => ({
			ok: false as const,
			message:
				err instanceof Error
					? err.message
					: "Unknown error",
		}));
}
