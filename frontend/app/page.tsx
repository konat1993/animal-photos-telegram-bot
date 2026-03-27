import { Leaf } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { loadDashboard } from "@/lib/dashboard-data";
import { DashboardDetailsSection } from "./components/dashboard-details-section";
import { DashboardKpiRow } from "./components/dashboard-kpi-row";
import { ThemeToggle } from "./components/theme-toggle";

interface PageProps {
  searchParams: Promise<{
    species?: string;
    date_from?: string;
    date_to?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dashboardPromise = loadDashboard(params);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">
              Animal Reports
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <DashboardKpiRow promise={dashboardPromise} />

        <Separator />

        <DashboardDetailsSection promise={dashboardPromise} params={params} />
      </main>
    </div>
  );
}
