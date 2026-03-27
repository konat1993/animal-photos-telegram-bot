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
import type { AnimalReport } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
      const params = new URLSearchParams(searchParams.toString());
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
            onValueChange={(v) => updateFilter("species", v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All species" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All species</SelectItem>
              {species.map((s) => (
                <SelectItem key={s} value={s}>
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
            onChange={(ymd) => updateFilter("date_from", ymd || null)}
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
            onChange={(ymd) => updateFilter("date_to", ymd || null)}
          />
        </div>

        {hasFilters && (
          <Tooltip>
            <TooltipTrigger
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "text-xs",
              )}
              onClick={resetFilters}
            >
              Reset filters
            </TooltipTrigger>
            <TooltipContent>Clear species and date filters</TooltipContent>
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
            <Skeleton key={key} className="h-10 w-full rounded" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Alert>
          <AlertDescription>
            No reports match the current filters.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead className="whitespace-nowrap">Species</TableHead>
                <TableHead className="whitespace-nowrap">Confidence</TableHead>
                <TableHead className="whitespace-nowrap">Lat</TableHead>
                <TableHead className="whitespace-nowrap">Lng</TableHead>
                <TableHead className="whitespace-nowrap">Photo</TableHead>
                <TableHead className="whitespace-nowrap">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(report.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="outline">{report.identified_species}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {report.confidence != null
                      ? `${Math.round(report.confidence * 100)}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {report.latitude.toFixed(5)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {report.longitude.toFixed(5)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {report.photo_url ? (
                      <a
                        href={report.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline"
                      >
                        View
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {report.telegram_user_id}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
