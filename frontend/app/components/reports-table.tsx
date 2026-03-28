"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DateFilterPicker } from "@/components/ui/date-filter-picker";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	FOCUS_REPORT_PARAM,
	PHOTO_REPORT_PARAM,
} from "@/lib/report-photo-query";
import { colorForSpecies } from "@/lib/species-color";
import type { AnimalReport } from "@/lib/supabase";
import { formatReportLocation } from "@/lib/location-display";
import { cn, formatReportDateTime } from "@/lib/utils";

/**
 * Non-empty selection whose range is inside `row` — user likely finished drag-select.
 * Ignores selection confined to other rows so a click here still focuses the map.
 */
function isNonEmptySelectionInsideRow(row: Element): boolean {
	if (typeof window === "undefined") return false;
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return false;
	if (!sel.toString().trim()) return false;
	const range = sel.getRangeAt(0);
	const root = range.commonAncestorContainer;
	const el =
		root.nodeType === Node.ELEMENT_NODE
			? (root as Element)
			: root.parentElement;
	return el != null && row.contains(el);
}

interface Props {
	reports: AnimalReport[];
	species: string[];
	currentSpecies?: string;
	currentDateFrom?: string;
	currentDateTo?: string;
	isLoading?: boolean;
}

export function ReportsTable({
	reports,
	species,
	currentSpecies,
	currentDateFrom,
	currentDateTo,
	isLoading,
}: Props) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const updateFilter = useCallback(
		(key: string, value: string | null) => {
			const params = new URLSearchParams(
				searchParams.toString(),
			);
			if (value) {
				params.set(key, value);
			} else {
				params.delete(key);
			}
			router.push(`?${params.toString()}`);
		},
		[router, searchParams],
	);

	const resetFilters = () => {
		router.push("/");
	};

	const focusReportOnMap = useCallback(
		(reportId: string) => {
			const params = new URLSearchParams(
				searchParams.toString(),
			);
			params.set(FOCUS_REPORT_PARAM, reportId);
			router.push(`?${params.toString()}`, { scroll: false });
			requestAnimationFrame(() => {
				document.getElementById(
					"sighting-map",
				)?.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			});
		},
		[router, searchParams],
	);

	const openReportPhoto = useCallback(
		(reportId: string) => {
			const params = new URLSearchParams(
				searchParams.toString(),
			);
			params.delete(FOCUS_REPORT_PARAM);
			params.set(PHOTO_REPORT_PARAM, reportId);
			router.push(`?${params.toString()}`, { scroll: false });
		},
		[router, searchParams],
	);

	const hasFilters = currentSpecies || currentDateFrom || currentDateTo;

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap gap-3 items-end">
				<div className="flex flex-col gap-1">
					<Label className="text-xs text-muted-foreground font-normal">
						Species
					</Label>
					<Select
						value={currentSpecies || "all"}
						onValueChange={(v) =>
							updateFilter(
								"species",
								v === "all"
									? ""
									: v,
							)
						}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="All species" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								All species
							</SelectItem>
							{species.map((s) => (
								<SelectItem
									key={s}
									value={
										s
									}
								>
									{s}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1">
					<Label
						htmlFor="filter-date-from"
						className="text-xs text-muted-foreground font-normal"
					>
						From
					</Label>
					<DateFilterPicker
						id="filter-date-from"
						placeholder="Start date"
						value={currentDateFrom}
						onChange={(ymd) =>
							updateFilter(
								"date_from",
								ymd || null,
							)
						}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<Label
						htmlFor="filter-date-to"
						className="text-xs text-muted-foreground font-normal"
					>
						To
					</Label>
					<DateFilterPicker
						id="filter-date-to"
						placeholder="End date"
						value={currentDateTo}
						onChange={(ymd) =>
							updateFilter(
								"date_to",
								ymd || null,
							)
						}
					/>
				</div>

				{hasFilters && (
					<Tooltip>
						<TooltipTrigger
							type="button"
							className={cn(
								buttonVariants({
									variant: "ghost",
									size: "default",
								}),
								"text-xs",
							)}
							onClick={resetFilters}
						>
							Reset filters
						</TooltipTrigger>
						<TooltipContent>
							Clear species and date
							filters
						</TooltipContent>
					</Tooltip>
				)}
			</div>

			{/* Table */}
			{isLoading ? (
				<div className="space-y-2">
					{(
						[
							"reports-skel-1",
							"reports-skel-2",
							"reports-skel-3",
							"reports-skel-4",
							"reports-skel-5",
						] as const
					).map((key) => (
						<Skeleton
							key={key}
							className="h-10 w-full rounded"
						/>
					))}
				</div>
			) : reports.length === 0 ? (
				<Alert>
					<AlertDescription>
						No reports match the current
						filters.
					</AlertDescription>
				</Alert>
			) : (
				<div className="overflow-x-auto rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="whitespace-nowrap">
									Date
								</TableHead>
								<TableHead className="whitespace-nowrap">
									Species
								</TableHead>
								<TableHead className="whitespace-nowrap">
									Confidence
								</TableHead>
								<TableHead className="min-w-40 max-w-56">
									Place
								</TableHead>
								<TableHead className="whitespace-nowrap">
									Lat
								</TableHead>
								<TableHead className="whitespace-nowrap">
									Lng
								</TableHead>
								<TableHead className="whitespace-nowrap">
									Photo
								</TableHead>
								<TableHead className="whitespace-nowrap">
									User
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{reports.map(
								(report) => (
									<TableRow
										key={
											report.id
										}
										tabIndex={
											0
										}
										className="cursor-pointer hover:bg-muted/50"
										onClick={(
											e,
										) => {
											const row =
												e.currentTarget;
											if (
												row instanceof
													Element &&
												isNonEmptySelectionInsideRow(
													row,
												)
											) {
												return;
											}
											const t =
												e.target;
											if (
												t instanceof
													Element &&
												t.closest(
													"[data-no-row-map]",
												)
											) {
												return;
											}
											focusReportOnMap(
												report.id,
											);
										}}
										onKeyDown={(
											e,
										) => {
											if (
												e.key ===
													"Enter" ||
												e.key ===
													" "
											) {
												e.preventDefault();
												focusReportOnMap(
													report.id,
												);
											}
										}}
									>
										<TableCell className="whitespace-nowrap text-sm">
											{formatReportDateTime(
												report.created_at,
											)}
										</TableCell>
										<TableCell className="whitespace-nowrap">
											<Badge
												variant="outline"
												className="inline-flex max-w-full items-center gap-1.5 font-normal"
											>
												<span
													className="size-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15"
													style={{
														backgroundColor:
															colorForSpecies(
																report.identified_species,
															),
													}}
													aria-hidden
												/>
												<span className="truncate">
													{
														report.identified_species
													}
												</span>
											</Badge>
										</TableCell>
										<TableCell className="whitespace-nowrap text-sm">
											{report.confidence !=
											null
												? `${Math.round(report.confidence * 100)}%`
												: "—"}
										</TableCell>
										<TableCell className="max-w-56 text-sm text-muted-foreground">
											{(() => {
												const place =
													formatReportLocation(
														report,
													);
												return place ? (
													<span
														className="line-clamp-2"
														title={
															place
														}
													>
														{
															place
														}
													</span>
												) : (
													"—"
												);
											})()}
										</TableCell>
										<TableCell className="whitespace-nowrap text-sm">
											{report.latitude.toFixed(
												5,
											)}
										</TableCell>
										<TableCell className="whitespace-nowrap text-sm">
											{report.longitude.toFixed(
												5,
											)}
										</TableCell>
										<TableCell
											data-no-row-map
											className="cursor-default whitespace-nowrap"
										>
											{report.photo_url ? (
												<button
													type="button"
													className="cursor-pointer text-xs text-primary underline underline-offset-2 hover:text-primary/90"
													onClick={() =>
														openReportPhoto(
															report.id,
														)
													}
												>
													View
												</button>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell className="whitespace-nowrap text-xs text-muted-foreground">
											{
												report.telegram_user_id
											}
										</TableCell>
									</TableRow>
								),
							)}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
