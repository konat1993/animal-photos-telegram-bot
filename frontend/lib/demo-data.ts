import type { AnimalReport } from "@/lib/supabase";

type DemoFilters = {
	species?: string;
	date_from?: string;
	date_to?: string;
};

/** Static sample rows for local UI preview (no Supabase / no Python backend). */
const DEMO_REPORTS: AnimalReport[] = [
	{
		id: "demo-1",
		telegram_user_id: "10001",
		photo_path: "demo/red-fox.jpg",
		photo_url: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=400",
		latitude: 52.2297,
		longitude: 21.0122,
		identified_species: "Red fox",
		confidence: 0.91,
		safety_note: "Keep distance; do not feed.",
		raw_ai_response: {},
		created_at: "2025-03-20T14:30:00.000Z",
	},
	{
		id: "demo-2",
		telegram_user_id: "10002",
		photo_path: "demo/boar.jpg",
		photo_url: "https://images.unsplash.com/photo-1577382539866-5ef07a099858?w=400",
		latitude: 52.237,
		longitude: 21.05,
		identified_species: "Wild boar",
		confidence: 0.88,
		safety_note: "Avoid sudden movement near young.",
		raw_ai_response: {},
		created_at: "2025-03-22T09:15:00.000Z",
	},
	{
		id: "demo-3",
		telegram_user_id: "10001",
		photo_path: "demo/deer.jpg",
		photo_url: "https://images.unsplash.com/photo-1484406566174-9da000fda645?w=400",
		latitude: 52.21,
		longitude: 20.98,
		identified_species: "Roe deer",
		confidence: 0.85,
		safety_note: "Common in forest edges at dusk.",
		raw_ai_response: {},
		created_at: "2025-03-25T18:00:00.000Z",
	},
	{
		id: "demo-4",
		telegram_user_id: "10003",
		photo_path: "demo/red-fox-2.jpg",
		photo_url: "https://images.unsplash.com/photo-1569449047196-cebeecbc6b6b?w=400",
		latitude: 52.25,
		longitude: 21.03,
		identified_species: "Red fox",
		confidence: 0.79,
		safety_note: "Urban-adapted individual.",
		raw_ai_response: {},
		created_at: "2025-03-26T11:45:00.000Z",
	},
	{
		id: "demo-5",
		telegram_user_id: "10004",
		photo_path: "demo/badger.jpg",
		photo_url: "https://images.unsplash.com/photo-1590160061765-de8d44655b66?w=400",
		latitude: 52.24,
		longitude: 21.08,
		identified_species: "European badger",
		confidence: 0.72,
		safety_note: "Nocturnal; rarely aggressive.",
		raw_ai_response: {},
		created_at: "2025-03-26T20:10:00.000Z",
	},
];

function applyFilters(
	reports: AnimalReport[],
	filters: DemoFilters,
): AnimalReport[] {
	let list = [...reports];
	if (filters.species) {
		list = list.filter(
			(r) => r.identified_species === filters.species,
		);
	}
	if (filters.date_from) {
		const from = filters.date_from;
		list = list.filter((r) => r.created_at >= from);
	}
	if (filters.date_to) {
		const end = new Date(filters.date_to);
		end.setDate(end.getDate() + 1);
		const endStr = end.toISOString().split("T")[0];
		list = list.filter((r) => r.created_at < endStr);
	}
	return list;
}

export function isDemoMode(): boolean {
	return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/** Same shape as Supabase-backed dashboard; species KPIs use full demo set. */
export function getDemoDashboardData(filters: DemoFilters) {
	const all = DEMO_REPORTS;
	const reports = applyFilters(all, filters);

	const speciesMap: Record<string, number> = {};
	for (const r of all) {
		speciesMap[r.identified_species] =
			(speciesMap[r.identified_species] || 0) + 1;
	}
	const speciesCounts = Object.entries(speciesMap)
		.map(([species, count]) => ({ species, count }))
		.sort((a, b) => b.count - a.count);

	const allSpecies = speciesCounts.map((s) => s.species);

	const mapPoints = reports.map((r) => ({
		id: r.id,
		lat: r.latitude,
		lng: r.longitude,
		species: r.identified_species,
		created_at: r.created_at,
		photo_url: r.photo_url,
	}));

	const total = reports.length;
	const topSpecies = speciesCounts[0]?.species ?? "—";
	const confidenceValues = reports
		.map((r) => r.confidence)
		.filter((c): c is number => c != null);
	const avgConfidence =
		confidenceValues.length > 0
			? confidenceValues.reduce((a, b) => a + b, 0) /
				confidenceValues.length
			: null;

	return {
		reports,
		speciesCounts,
		allSpecies,
		mapPoints,
		total,
		topSpecies,
		avgConfidence,
	};
}
