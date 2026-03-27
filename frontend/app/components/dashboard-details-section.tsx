import { AlertTriangle } from "lucide-react";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardLoadResult } from "@/lib/dashboard-data";
import { ReportsMap } from "./map-wrapper";
import { ReportsTable } from "./reports-table";
import { SpeciesPieChart } from "./species-pie-chart";

export type DashboardSearchParams = {
  species?: string;
  date_from?: string;
  date_to?: string;
};

async function SpeciesChartCell({
  promise,
}: {
  promise: Promise<DashboardLoadResult>;
}) {
  const r = await promise;
  if (!r.ok) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Unable to load chart.
      </div>
    );
  }
  return <SpeciesPieChart data={r.data.speciesCounts} />;
}

async function SightingMapCell({
  promise,
}: {
  promise: Promise<DashboardLoadResult>;
}) {
  const r = await promise;
  if (!r.ok) {
    return (
      <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
        Unable to load map.
      </div>
    );
  }
  return <ReportsMap points={r.data.mapPoints} />;
}

async function ReportsTableCell({
  promise,
  params,
}: {
  promise: Promise<DashboardLoadResult>;
  params: DashboardSearchParams;
}) {
  const r = await promise;
  if (!r.ok) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Unable to load reports.
      </div>
    );
  }
  return (
    <ReportsTable
      reports={r.data.reports}
      species={r.data.allSpecies}
      currentSpecies={params.species}
      currentDateFrom={params.date_from}
      currentDateTo={params.date_to}
    />
  );
}

async function DashboardLoadErrorAlert({
  promise,
}: {
  promise: Promise<DashboardLoadResult>;
}) {
  const r = await promise;
  if (r.ok) return null;
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>Failed to load data: {r.message}</AlertDescription>
    </Alert>
  );
}

function ReportsTableSkeleton() {
  return (
    <div className="space-y-2">
      {(["row-1", "row-2", "row-3", "row-4", "row-5"] as const).map((key) => (
        <Skeleton key={key} className="h-10 w-full rounded" />
      ))}
    </div>
  );
}

export function DashboardDetailsSection({
  promise,
  params,
}: {
  promise: Promise<DashboardLoadResult>;
  params: DashboardSearchParams;
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <DashboardLoadErrorAlert promise={promise} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Species Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={<Skeleton className="h-[280px] w-full rounded-lg" />}
            >
              <SpeciesChartCell promise={promise} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden p-0">
          <CardHeader className="border-border border-b px-4 pt-4 pb-3">
            <CardTitle className="text-lg font-medium">Sighting Map</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Suspense
              fallback={
                <div className="h-[400px] w-full animate-pulse rounded-b-xl bg-muted" />
              }
            >
              <SightingMapCell promise={promise} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ReportsTableSkeleton />}>
            <ReportsTableCell promise={promise} params={params} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
