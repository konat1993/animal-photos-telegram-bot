"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  colorForSpecies,
  SPECIES_OTHER_SLICE_COLOR,
} from "@/lib/species-color";

/** Max slices on the ring; additional species roll up into "Other". */
const MAX_PIE_SEGMENTS = 8;

interface SpeciesCount {
  species: string;
  count: number;
}

interface ChartSlice extends SpeciesCount {
  isOther: boolean;
  otherMembers?: SpeciesCount[];
}

interface Props {
  data: SpeciesCount[];
}

function buildChartSlices(data: SpeciesCount[]): {
  slices: ChartSlice[];
  isTruncated: boolean;
  hiddenCount: number;
} {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  if (sorted.length <= MAX_PIE_SEGMENTS) {
    return {
      slices: sorted.map((row) => ({ ...row, isOther: false })),
      isTruncated: false,
      hiddenCount: 0,
    };
  }

  const top = sorted.slice(0, MAX_PIE_SEGMENTS - 1);
  const rest = sorted.slice(MAX_PIE_SEGMENTS - 1);
  const otherCount = rest.reduce((s, r) => s + r.count, 0);

  return {
    slices: [
      ...top.map((row) => ({ ...row, isOther: false })),
      {
        species: `Other · ${rest.length} species`,
        count: otherCount,
        isOther: true,
        otherMembers: rest,
      },
    ],
    isTruncated: true,
    hiddenCount: rest.length,
  };
}

function SpeciesPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ChartSlice | undefined;
  if (!row) return null;
  const members = row.otherMembers ?? [];

  return (
    <div className="max-w-[min(100vw-2rem,18rem)] rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-heading font-semibold text-foreground">
        {row.species}
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {row.count} report{row.count === 1 ? "" : "s"}
      </p>
      {row.isOther && members.length > 0 ? (
        <ul className="mt-2 max-h-36 list-inside list-disc space-y-0.5 overflow-y-auto border-t border-border/60 pt-2 text-[0.7rem] leading-snug text-muted-foreground">
          {members.slice(0, 15).map((m) => (
            <li key={m.species}>
              <span className="text-foreground/90">{m.species}</span> ({m.count}
              )
            </li>
          ))}
          {members.length > 15 ? (
            <li className="list-none text-muted-foreground italic">
              …and {members.length - 15} more in this group
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function SpeciesPieChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    );
  }

  const { slices, isTruncated, hiddenCount } = buildChartSlices(data);

  return (
    <div className="species-pie-chart-root w-full">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="count"
            nameKey="species"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {slices.map((row) => (
              <Cell
                key={row.species}
                fill={
                  row.isOther
                    ? SPECIES_OTHER_SLICE_COLOR
                    : colorForSpecies(row.species)
                }
              />
            ))}
          </Pie>
          <Tooltip content={SpeciesPieTooltip} />
          <Legend
            iconType="circle"
            layout="horizontal"
            verticalAlign="bottom"
            wrapperStyle={{
              fontSize: "0.75rem",
              lineHeight: 1.35,
              maxHeight: 112,
              overflowY: "auto",
              overflowX: "hidden",
              paddingTop: 4,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {isTruncated ? (
        <p className="mt-1 px-1 text-center text-[0.7rem] leading-snug text-muted-foreground">
          Showing top {MAX_PIE_SEGMENTS - 1} species by count;{" "}
          <span className="text-foreground/80">{hiddenCount}</span> rarer
          species grouped under{" "}
          <span className="font-medium text-foreground">Other</span>. Hover that
          slice for the list.
        </p>
      ) : null}
    </div>
  );
}
