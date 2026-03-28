"use client";

import dynamic from "next/dynamic";

const ReportsMap = dynamic(
  () => import("./reports-map").then((m) => m.ReportsMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full rounded-b-xl bg-muted animate-pulse" />
    ),
  },
);

export { ReportsMap };
