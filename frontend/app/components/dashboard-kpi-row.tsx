import { Award, TrendingUp } from "lucide-react";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardLoadResult } from "@/lib/dashboard-data";

async function KpiTotal({
  promise,
}: {
  promise: Promise<DashboardLoadResult>;
}) {
  const r = await promise;
  if (!r.ok) {
    return <p className="text-2xl font-semibold text-muted-foreground">—</p>;
  }
  return <p className="text-2xl font-semibold">{r.data.total}</p>;
}

async function KpiTopSpecies({
  promise,
}: {
  promise: Promise<DashboardLoadResult>;
}) {
  const r = await promise;
  if (!r.ok) {
    return (
      <p className="truncate text-2xl font-semibold text-muted-foreground">—</p>
    );
  }
  return <p className="truncate text-2xl font-semibold">{r.data.topSpecies}</p>;
}

async function KpiAvgConfidence({
  promise,
}: {
  promise: Promise<DashboardLoadResult>;
}) {
  const r = await promise;
  if (!r.ok) {
    return <p className="text-2xl font-semibold text-muted-foreground">—</p>;
  }
  const v = r.data.avgConfidence;
  return (
    <p className="text-2xl font-semibold">
      {v != null ? `${Math.round(v * 100)}%` : "—"}
    </p>
  );
}

export function DashboardKpiRow({
  promise,
}: {
  promise: Promise<DashboardLoadResult>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Total Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-8 w-16" />}>
            <KpiTotal promise={promise} />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Award className="h-3 w-3" /> Top Species
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={<Skeleton className="h-8 w-full max-w-[12rem]" />}
          >
            <KpiTopSpecies promise={promise} />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <TrendingUp className="h-3 w-3" /> Avg Confidence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-8 w-14" />}>
            <KpiAvgConfidence promise={promise} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
