import { useMemo, useRef } from "react";
import Highcharts from "highcharts";
import "highcharts/modules/treemap";
import "highcharts/modules/treegraph";
import HighchartsReact from "highcharts-react-official";
import {
  NEON_LAYER_COLORS,
  getChemicalMeta,
  interactionLabel,
  interactionColor,
} from "../../data/chemicals";
import type { GoalDefinition } from "../../data/goals";
import type { GoalChemicalRank } from "../../hooks/useGoalChemicals";
import type { ChemicalEntry, ChemicalInteractionEntry } from "../../types/api";

interface Props {
  goal: GoalDefinition;
  drivers: GoalChemicalRank[];
  chemicals: ChemicalEntry[];
  interactions: ChemicalInteractionEntry[];
  onChemicalClick: (
    chemicalKey: string,
    parentKey: string | null,
    goalName: string,
  ) => void;
  onBack: () => void;
}

const NEON_BG = "#0a0a1a";
const NEON_TEXT = "#e2e8f0";

const AGONIST_COLOR = "#00ff88";
const ANTAGONIST_COLOR = "#ff3366";
const REST_COLOR = "#445";

export default function GoalTree({
  goal,
  drivers,
  chemicals,
  interactions,
  onChemicalClick,
  onBack,
}: Props) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const options = useMemo((): Highcharts.Options => {
    const top3 = drivers.slice(0, 3);
    const data: Highcharts.SeriesTreegraphDataOptions[] = [];

    // Root: goal
    data.push({
      id: "goal",
      name: `${goal.icon} ${goal.name}`,
      // @ts-expect-error custom color
      color: "#6366f1",
    });

    // For each top-3 driver, find its agonists and antagonists from interactions
    for (const driver of top3) {
      const driverMeta = getChemicalMeta(driver.chemicalKey);
      const driverChem = chemicals.find((c) => c.key === driver.chemicalKey);
      const layer = driverChem?.layer ?? driverMeta?.layer ?? "neurotransmitter";
      const layerColor =
        NEON_LAYER_COLORS[layer as keyof typeof NEON_LAYER_COLORS] ?? "#888";

      const driverId = `driver:${driver.chemicalKey}`;
      data.push({
        id: driverId,
        parent: "goal",
        name: driverMeta?.label ?? driver.chemicalKey,
        // @ts-expect-error custom color + fields
        color: layerColor,
        custom: {
          chemicalKey: driver.chemicalKey,
          parentKey: null,
          weight: driver.aggregateWeight,
          layer,
          role: "driver",
        },
      });

      // Find all interactions involving this driver
      const related = interactions
        .filter(
          (i) =>
            (i.sourceKey === driver.chemicalKey ||
              i.targetKey === driver.chemicalKey) &&
            Math.abs(i.modFactor) > 0.15,
        )
        .sort((a, b) => Math.abs(b.modFactor) - Math.abs(a.modFactor));

      // Split into agonists (positive modFactor) and antagonists (negative)
      const agonists = related.filter((i) => i.modFactor > 0.2);
      const antagonists = related.filter((i) => i.modFactor < -0.2);

      // Top 3 agonists
      const topAgonists = agonists.slice(0, 3);
      const restAgonists = agonists.slice(3);

      // Top 3 antagonists
      const topAntagonists = antagonists.slice(0, 3);
      const restAntagonists = antagonists.slice(3);

      // Add agonist nodes
      for (const ag of topAgonists) {
        const otherKey =
          ag.sourceKey === driver.chemicalKey ? ag.targetKey : ag.sourceKey;
        const otherMeta = getChemicalMeta(otherKey);
        const otherChem = chemicals.find((c) => c.key === otherKey);
        const otherLayer = otherChem?.layer ?? otherMeta?.layer ?? "";

        data.push({
          id: `ag:${driver.chemicalKey}:${otherKey}`,
          parent: driverId,
          name: otherMeta?.label ?? otherKey,
          // @ts-expect-error custom fields
          color: AGONIST_COLOR,
          custom: {
            chemicalKey: otherKey,
            parentKey: driver.chemicalKey,
            modFactor: ag.modFactor,
            layer: otherLayer,
            role: "agonist",
            mechanism: ag.mechanism,
          },
        });
      }

      // Add antagonist nodes
      for (const an of topAntagonists) {
        const otherKey =
          an.sourceKey === driver.chemicalKey ? an.targetKey : an.sourceKey;
        const otherMeta = getChemicalMeta(otherKey);
        const otherChem = chemicals.find((c) => c.key === otherKey);
        const otherLayer = otherChem?.layer ?? otherMeta?.layer ?? "";

        data.push({
          id: `an:${driver.chemicalKey}:${otherKey}`,
          parent: driverId,
          name: otherMeta?.label ?? otherKey,
          // @ts-expect-error custom fields
          color: ANTAGONIST_COLOR,
          custom: {
            chemicalKey: otherKey,
            parentKey: driver.chemicalKey,
            modFactor: an.modFactor,
            layer: otherLayer,
            role: "antagonist",
            mechanism: an.mechanism,
          },
        });
      }

      // "Rest" nodes — smaller, grouped
      const restCount = restAgonists.length + restAntagonists.length;
      if (restCount > 0) {
        // Add individual rest nodes (smaller)
        for (const r of [...restAgonists, ...restAntagonists]) {
          const otherKey =
            r.sourceKey === driver.chemicalKey ? r.targetKey : r.sourceKey;
          const otherMeta = getChemicalMeta(otherKey);
          const otherChem = chemicals.find((c) => c.key === otherKey);
          const otherLayer = otherChem?.layer ?? otherMeta?.layer ?? "";
          const isAgonist = r.modFactor > 0;

          data.push({
            id: `rest:${driver.chemicalKey}:${otherKey}`,
            parent: driverId,
            name: otherMeta?.label ?? otherKey,
            // @ts-expect-error custom fields
            color: REST_COLOR,
            custom: {
              chemicalKey: otherKey,
              parentKey: driver.chemicalKey,
              modFactor: r.modFactor,
              layer: otherLayer,
              role: isAgonist ? "agonist-rest" : "antagonist-rest",
              mechanism: r.mechanism,
            },
          });
        }
      }
    }

    return {
      chart: {
        backgroundColor: NEON_BG,
        height: 520,
        style: { fontFamily: "inherit" },
        spacingLeft: 10,
        spacingRight: 40,
        spacingTop: 40,
      },
      title: { text: undefined },
      credits: { enabled: false },
      series: [
        {
          type: "treegraph" as const,
          data,
          marker: {
            radius: 6,
            lineWidth: 2,
            lineColor: "#222",
          },
          link: {
            color: "rgba(100, 100, 150, 0.25)",
            lineWidth: 1.5,
            type: "curved" as never,
          },
          dataLabels: {
            enabled: true,
            style: {
              color: NEON_TEXT,
              fontSize: "9px",
              textOutline: "2px #0a0a1a",
              fontWeight: "normal",
              whiteSpace: "nowrap" as never,
            },
            linkFormat: "",
          },
          levels: [
            {
              // Level 1: Goal root
              level: 1,
              // @ts-expect-error dataLabels style
              dataLabels: {
                style: { fontSize: "13px", fontWeight: "bold" },
              },
              marker: { radius: 16 },
            },
            {
              // Level 2: Top 3 drivers
              level: 2,
              // @ts-expect-error dataLabels style
              dataLabels: {
                style: { fontSize: "11px", fontWeight: "600" },
              },
              marker: { radius: 11 },
            },
            {
              // Level 3: Agonists / Antagonists / Rest
              level: 3,
              marker: { radius: 5 },
              // @ts-expect-error dataLabels style
              dataLabels: {
                style: { fontSize: "8px" },
              },
            },
          ],
          point: {
            events: {
              click() {
                const custom =
                  // @ts-expect-error custom field
                  this.options?.custom as
                    | {
                        chemicalKey: string;
                        parentKey: string | null;
                      }
                    | undefined;
                if (custom?.chemicalKey) {
                  onChemicalClick(
                    custom.chemicalKey,
                    custom.parentKey,
                    goal.name,
                  );
                }
              },
            },
          },
          cursor: "pointer",
        },
      ],
      tooltip: {
        useHTML: true,
        backgroundColor: "rgba(10, 10, 26, 0.95)",
        borderColor: "rgba(100, 100, 255, 0.3)",
        style: { color: NEON_TEXT, fontSize: "11px" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter(this: any) {
          const point = this.point;
          if (!point) return false;

          const custom = point.options?.custom;
          if (!custom?.chemicalKey) {
            return `<b>${point.name}</b>`;
          }

          const meta = getChemicalMeta(custom.chemicalKey);
          const layerColor =
            NEON_LAYER_COLORS[
              custom.layer as keyof typeof NEON_LAYER_COLORS
            ] ?? "#888";

          if (custom.role === "driver") {
            const weight = (custom.weight as number).toFixed(2);
            return `<b style="color:${layerColor}">${meta?.label ?? custom.chemicalKey}</b><br/>
                    <span style="color:#00ff88">Top Driver</span> &middot; Weight: ${weight}<br/>
                    <span style="color:#6366f1;font-size:10px">Click to ask AI</span>`;
          }

          // Agonist or antagonist
          const modFactor = custom.modFactor as number;
          const label = interactionLabel(modFactor);
          const color = interactionColor(modFactor);
          const isRest = (custom.role as string).includes("rest");

          return `<b style="color:${layerColor}">${meta?.label ?? custom.chemicalKey}</b><br/>
                  <span style="color:${color};font-weight:bold">${label}</span> (${modFactor > 0 ? "+" : ""}${modFactor.toFixed(2)})<br/>
                  ${custom.mechanism ? `<span style="color:#aaa;font-size:10px">${custom.mechanism}</span><br/>` : ""}
                  <span style="color:#6366f1;font-size:10px">Click to ask AI</span>`;
        },
      },
    };
  }, [goal, drivers, chemicals, interactions, onChemicalClick]);

  return (
    <div className="relative">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <button
          onClick={onBack}
          className="px-2.5 py-1 text-[10px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-600/50 transition-colors"
        >
          &larr; Back
        </button>
        <span className="text-xs font-semibold text-indigo-300">
          {goal.icon} {goal.name}
        </span>
      </div>

      {/* Legend */}
      <div className="absolute top-2 right-3 z-10 flex gap-3">
        {[
          { color: AGONIST_COLOR, label: "Agonist" },
          { color: ANTAGONIST_COLOR, label: "Antagonist" },
          { color: REST_COLOR, label: "Other" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[9px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        options={options}
      />
    </div>
  );
}
