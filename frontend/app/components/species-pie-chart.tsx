"use client";

import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#16a34a",
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f97316",
  "#06b6d4",
  "#9ca3af",
];

interface SpeciesCount {
  species: string;
  count: number;
}

interface Props {
  data: SpeciesCount[];
}

export function SpeciesPieChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="species"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [value, "Reports"]}
          contentStyle={{ fontSize: "0.75rem" }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: "0.75rem" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
