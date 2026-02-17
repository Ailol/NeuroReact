import { useMemo, useRef } from "react";
import Highcharts from "highcharts";
import "highcharts/modules/networkgraph";
import HighchartsReact from "highcharts-react-official";
import {
  NEON_LAYER_COLORS,
  interactionColor,
  interactionLabel,
  getChemicalMeta,
} from "../../data/chemicals";
import { GOALS } from "../../data/goals";
import type {
  ChemicalEntry,
  ChemicalInteractionEntry,
  ShadowMatrixResponse,
} from "../../types/api";
import type { GoalChemicalRank } from "../../hooks/useGoalChemicals";
import type { GoalDefinition } from "../../data/goals";
import type { GoalChemicalLink } from "../../hooks/useAllGoalChemicals";

// Goal node colors — distinct from layer colors
const GOAL_COLORS: Record<string, string> = {
  "weight-loss": "#ff6b9d",
  energy: "#ffaa00",
  leadership: "#a78bfa",
  "social-skills": "#34d399",
  emotions: "#f472b6",
};

interface Props {
  chemicals: ChemicalEntry[];
  interactions: ChemicalInteractionEntry[];
  matrixData: ShadowMatrixResponse | undefined;
  drivers: GoalChemicalRank[];
  inhibitors: GoalChemicalRank[];
  selectedGoal: GoalDefinition | null;
  selectedChemical: string | null;
  onSelectChemical: (key: string | null) => void;
  onInteractionClick: (
    source: string,
    target: string,
    modFactor: number,
  ) => void;
  goalLinks: GoalChemicalLink[];
}

const NEON_BG = "#0a0a1a";
const NEON_TEXT = "#e2e8f0";

function getLayerColor(layer: string): string {
  return (
    NEON_LAYER_COLORS[layer as keyof typeof NEON_LAYER_COLORS] ?? "#888"
  );
}

export default function ChemicalNetwork({
  chemicals,
  interactions,
  matrixData,
  drivers,
  inhibitors,
  selectedGoal,
  selectedChemical,
  onSelectChemical,
  onInteractionClick,
  goalLinks,
}: Props) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Compute average shadow level per chemical for node sizing
  const chemicalLevels = useMemo(() => {
    const map = new Map<string, number>();
    if (!matrixData?.cells) return map;
    const sums = new Map<string, { total: number; count: number }>();
    for (const cell of matrixData.cells) {
      const prev = sums.get(cell.chemical) ?? { total: 0, count: 0 };
      sums.set(cell.chemical, {
        total: prev.total + cell.shadowLevel,
        count: prev.count + 1,
      });
    }
    for (const [key, { total, count }] of sums) {
      map.set(key, total / count);
    }
    return map;
  }, [matrixData]);

  // ── Expanded mode: single chemical + its interactions ──────────────
  const expandedData = useMemo(() => {
    if (!selectedChemical) return null;

    const related = interactions.filter(
      (i) =>
        (i.sourceKey === selectedChemical ||
          i.targetKey === selectedChemical) &&
        Math.abs(i.modFactor) > 0.1,
    );

    const agonists = related.filter((i) => i.modFactor > 0.25);
    const antagonists = related.filter((i) => i.modFactor < -0.25);
    const stabilizers = related.filter(
      (i) => i.modFactor >= -0.25 && i.modFactor <= 0.25,
    );

    const nodeKeys = new Set<string>([selectedChemical]);
    for (const r of related) {
      nodeKeys.add(r.sourceKey);
      nodeKeys.add(r.targetKey);
    }

    const centerX = 400;
    const centerY = 300;
    const radius = 220;

    const nodes: Highcharts.SeriesNetworkgraphNodesOptions[] = [];

    for (const key of nodeKeys) {
      const meta = getChemicalMeta(key);
      const chem = chemicals.find((c) => c.key === key);
      const layer = chem?.layer ?? meta?.layer ?? "neurotransmitter";
      const isCenter = key === selectedChemical;

      let x = centerX;
      let y = centerY;
      let markerRadius = 10;

      if (!isCenter) {
        const rel = related.find(
          (r) =>
            (r.sourceKey === key && r.targetKey === selectedChemical) ||
            (r.targetKey === key && r.sourceKey === selectedChemical),
        );
        const modFactor = rel?.modFactor ?? 0;
        markerRadius = 8 + Math.abs(modFactor) * 14;

        if (modFactor > 0.25) {
          const idx = agonists.findIndex(
            (a) => a.sourceKey === key || a.targetKey === key,
          );
          const spreadAngle = Math.min(Math.PI * 0.8, (agonists.length - 1) * 0.3);
          const angle = -spreadAngle / 2 + (spreadAngle * idx) / Math.max(agonists.length - 1, 1);
          x = centerX + radius * Math.cos(angle);
          y = centerY + radius * Math.sin(angle);
        } else if (modFactor < -0.25) {
          const idx = antagonists.findIndex(
            (a) => a.sourceKey === key || a.targetKey === key,
          );
          const spreadAngle = Math.min(Math.PI * 0.8, (antagonists.length - 1) * 0.3);
          const angle = Math.PI - spreadAngle / 2 + (spreadAngle * idx) / Math.max(antagonists.length - 1, 1);
          x = centerX + radius * Math.cos(angle);
          y = centerY + radius * Math.sin(angle);
        } else {
          const idx = stabilizers.findIndex(
            (a) => a.sourceKey === key || a.targetKey === key,
          );
          const spreadAngle = Math.min(Math.PI * 0.4, (stabilizers.length - 1) * 0.2);
          const angle = Math.PI / 2 - spreadAngle / 2 + (spreadAngle * idx) / Math.max(stabilizers.length - 1, 1);
          x = centerX + radius * 0.7 * Math.cos(angle);
          y = centerY + radius * 0.7 * Math.sin(angle);
        }
      } else {
        markerRadius = 24;
      }

      nodes.push({
        id: key,
        name: chem?.label ?? meta?.label ?? key,
        color: getLayerColor(layer),
        marker: {
          radius: markerRadius,
          lineColor: getLayerColor(layer),
          lineWidth: isCenter ? 3 : 2,
          fillColor: isCenter ? getLayerColor(layer) : NEON_BG,
        },
        dataLabels: { enabled: true },
        // @ts-expect-error custom positioning for fixed layout
        plotX: x,
        plotY: y,
      });
    }

    const links = related.map((r) => ({
      from: r.sourceKey,
      to: r.targetKey,
      color: interactionColor(r.modFactor),
      width: 1 + Math.abs(r.modFactor) * 2.5,
      custom: {
        modFactor: r.modFactor,
        mechanism: r.mechanism,
        notes: r.notes,
        label: interactionLabel(r.modFactor),
      },
    }));

    return { nodes, links };
  }, [selectedChemical, interactions, chemicals]);

  // ── Overview mode: goals as central hubs, chemicals as spokes ─────
  const overviewOptions = useMemo((): Highcharts.Options => {
    const centerX = 400;
    const centerY = 300;

    // Deduplicate: figure out which chemicals are linked to any goal
    const linkedChemicals = new Set(goalLinks.map((l) => l.chemicalKey));

    // Position goals in a circle near center
    const goalCount = GOALS.length;
    const goalRadius = 100;
    const goalPositions = new Map<string, { x: number; y: number }>();
    for (let i = 0; i < goalCount; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / goalCount;
      goalPositions.set(GOALS[i].id, {
        x: centerX + goalRadius * Math.cos(angle),
        y: centerY + goalRadius * Math.sin(angle),
      });
    }

    // Position chemicals on outer ring, grouped by layer
    const chemPositions = new Map<string, { x: number; y: number }>();
    const byLayer: Record<string, ChemicalEntry[]> = {
      neurotransmitter: [],
      hormone: [],
      peptide: [],
    };
    for (const c of chemicals) {
      if (linkedChemicals.has(c.key)) {
        (byLayer[c.layer] ??= []).push(c);
      }
    }

    const outerRadius = 260;
    // Neurotransmitters: top arc
    const ntItems = byLayer.neurotransmitter;
    const ntArcStart = -Math.PI * 0.85;
    const ntArcSpan = Math.PI * 0.7;
    for (let i = 0; i < ntItems.length; i++) {
      const angle = ntArcStart + (ntArcSpan * i) / Math.max(ntItems.length - 1, 1);
      chemPositions.set(ntItems[i].key, {
        x: centerX + outerRadius * Math.cos(angle),
        y: centerY + outerRadius * Math.sin(angle),
      });
    }

    // Hormones: bottom-right arc
    const hItems = byLayer.hormone;
    const hArcStart = -Math.PI * 0.05;
    const hArcSpan = Math.PI * 0.7;
    for (let i = 0; i < hItems.length; i++) {
      const angle = hArcStart + (hArcSpan * i) / Math.max(hItems.length - 1, 1);
      chemPositions.set(hItems[i].key, {
        x: centerX + outerRadius * Math.cos(angle),
        y: centerY + outerRadius * Math.sin(angle),
      });
    }

    // Peptides: bottom-left arc
    const pItems = byLayer.peptide;
    const pArcStart = Math.PI * 0.75;
    const pArcSpan = Math.PI * 0.7;
    for (let i = 0; i < pItems.length; i++) {
      const angle = pArcStart + (pArcSpan * i) / Math.max(pItems.length - 1, 1);
      chemPositions.set(pItems[i].key, {
        x: centerX + outerRadius * Math.cos(angle),
        y: centerY + outerRadius * Math.sin(angle),
      });
    }

    // Build goal nodes
    const nodes: Highcharts.SeriesNetworkgraphNodesOptions[] = [];

    for (const goal of GOALS) {
      const pos = goalPositions.get(goal.id)!;
      const isActive = selectedGoal?.id === goal.id;
      const goalColor = GOAL_COLORS[goal.id] ?? "#8888ff";

      nodes.push({
        id: `goal:${goal.id}`,
        name: `${goal.icon} ${goal.name}`,
        color: goalColor,
        marker: {
          radius: isActive ? 22 : 16,
          lineColor: goalColor,
          lineWidth: isActive ? 3 : 2,
          fillColor: isActive ? goalColor : NEON_BG,
        },
        dataLabels: {
          enabled: true,
          style: {
            fontSize: isActive ? "11px" : "9px",
            fontWeight: isActive ? "bold" : "normal",
          },
        },
        // @ts-expect-error custom positioning
        plotX: pos.x,
        plotY: pos.y,
      });
    }

    // Build chemical nodes (only those linked to goals)
    for (const c of chemicals) {
      if (!linkedChemicals.has(c.key)) continue;

      const avgLevel = chemicalLevels.get(c.key) ?? 2.5;
      let baseRadius = 5 + avgLevel * 1.5;
      let opacity = 1;

      if (selectedGoal) {
        // Check if this chemical is a driver or inhibitor for the selected goal
        const isDriver = drivers.some((d) => d.chemicalKey === c.key);
        const isInhibitor = inhibitors.some((d) => d.chemicalKey === c.key);
        if (isDriver) {
          baseRadius *= 1.4;
        } else if (isInhibitor) {
          baseRadius *= 0.8;
          opacity = 0.7;
        } else {
          opacity = 0.3;
          baseRadius *= 0.6;
        }
      }

      const pos = chemPositions.get(c.key);

      nodes.push({
        id: c.key,
        name: c.label,
        color: getLayerColor(c.layer),
        opacity,
        marker: {
          radius: baseRadius,
          lineColor: getLayerColor(c.layer),
          lineWidth: 1.5,
          fillColor: NEON_BG,
        },
        dataLabels: { enabled: true },
        // @ts-expect-error custom positioning
        plotX: pos?.x,
        plotY: pos?.y,
      });
    }

    // Build links: only goal → chemical (no inter-chemical links)
    const data: {
      from: string;
      to: string;
      color: string;
      width: number;
    }[] = [];

    // Normalize weights per goal for consistent line widths
    const goalMaxWeight = new Map<string, number>();
    for (const link of goalLinks) {
      const prev = goalMaxWeight.get(link.goalId) ?? 0;
      goalMaxWeight.set(link.goalId, Math.max(prev, Math.abs(link.weight)));
    }

    for (const link of goalLinks) {
      const maxW = goalMaxWeight.get(link.goalId) ?? 1;
      const normWeight = link.weight / maxW; // -1 to 1
      const goalColor = GOAL_COLORS[link.goalId] ?? "#8888ff";

      let color: string;
      let width: number;

      if (selectedGoal) {
        if (link.goalId === selectedGoal.id) {
          // Highlighted: green for driver, red for inhibitor
          color = normWeight > 0 ? "#00ff88" : "#ff3366";
          width = 0.8 + Math.abs(normWeight) * 2;
        } else {
          color = "rgba(100, 100, 100, 0.08)";
          width = 0.2;
        }
      } else {
        // No goal selected: show all links with goal colors
        color = goalColor + "66"; // 40% opacity hex
        width = 0.4 + Math.abs(normWeight) * 1.2;
      }

      data.push({
        from: `goal:${link.goalId}`,
        to: link.chemicalKey,
        color,
        width,
      });
    }

    return {
      chart: {
        type: "networkgraph",
        backgroundColor: NEON_BG,
        height: 600,
        style: { fontFamily: "inherit" },
      },
      title: { text: undefined },
      credits: { enabled: false },
      plotOptions: {
        networkgraph: {
          layoutAlgorithm: {
            enableSimulation: false,
            initialPositionRadius: 1,
          },
          draggable: false,
          point: {
            events: {
              click() {
                const id = (this as Highcharts.Point & { id?: string }).id;
                if (id && !id.startsWith("goal:")) {
                  onSelectChemical(id);
                }
              },
            },
          },
        },
      },
      tooltip: {
        useHTML: true,
        backgroundColor: "rgba(10, 10, 26, 0.95)",
        borderColor: "rgba(100, 100, 255, 0.3)",
        style: { color: NEON_TEXT, fontSize: "11px" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter(this: any) {
          const id = this.point?.id as string | undefined;
          if (!id) return false;

          if (id.startsWith("goal:")) {
            const goalId = id.replace("goal:", "");
            const goal = GOALS.find((g) => g.id === goalId);
            if (!goal) return false;
            return `<b style="color:${GOAL_COLORS[goalId] ?? "#fff"}">${goal.icon} ${goal.name}</b><br/>
                    <span style="color:#888;font-size:10px">${goal.description}</span>`;
          }

          const meta = getChemicalMeta(id);
          const layer = meta?.layer ?? "";
          const avgLevel = chemicalLevels.get(id) ?? 0;
          // Find which goals link to this chemical
          const connectedGoals = goalLinks
            .filter((l) => l.chemicalKey === id)
            .map((l) => {
              const g = GOALS.find((g) => g.id === l.goalId);
              return g ? `${g.icon} ${g.name}` : l.goalId;
            });
          return `<b style="color:${getLayerColor(layer)}">${meta?.label ?? id}</b><br/>
                  <span style="color:#888">${layer}</span><br/>
                  Level: ${avgLevel.toFixed(1)}<br/>
                  ${connectedGoals.length > 0 ? `<span style="color:#aaa;font-size:10px">Goals: ${connectedGoals.join(", ")}</span>` : ""}`;
        },
      },
      series: [
        {
          type: "networkgraph" as const,
          nodes,
          data,
          dataLabels: {
            enabled: true,
            linkTextPath: { enabled: false },
            style: {
              color: NEON_TEXT,
              fontSize: "9px",
              textOutline: "2px #0a0a1a",
              fontWeight: "normal",
            },
          },
        },
      ],
    };
  }, [
    chemicals,
    goalLinks,
    chemicalLevels,
    selectedGoal,
    drivers,
    inhibitors,
    onSelectChemical,
  ]);

  // ── Expanded mode chart options ────────────────────────────────────
  const expandedOptions = useMemo((): Highcharts.Options | null => {
    if (!expandedData) return null;

    return {
      chart: {
        type: "networkgraph",
        backgroundColor: NEON_BG,
        height: 600,
        style: { fontFamily: "inherit" },
      },
      title: { text: undefined },
      credits: { enabled: false },
      plotOptions: {
        networkgraph: {
          layoutAlgorithm: {
            enableSimulation: false,
            initialPositionRadius: 1,
          },
          draggable: false,
          point: {
            events: {
              click() {
                const id = (this as Highcharts.Point & { id?: string }).id;
                if (id && id !== selectedChemical) {
                  const rel = interactions.find(
                    (r) =>
                      (r.sourceKey === id &&
                        r.targetKey === selectedChemical) ||
                      (r.targetKey === id &&
                        r.sourceKey === selectedChemical),
                  );
                  if (rel) {
                    onInteractionClick(
                      selectedChemical!,
                      id,
                      rel.modFactor,
                    );
                  }
                }
              },
            },
          },
        },
      },
      tooltip: {
        useHTML: true,
        backgroundColor: "rgba(10, 10, 26, 0.95)",
        borderColor: "rgba(100, 100, 255, 0.3)",
        style: { color: NEON_TEXT, fontSize: "11px" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter(this: any) {
          const id = this.point?.id as string | undefined;
          if (!id) return false;

          if (id === selectedChemical) {
            const meta = getChemicalMeta(id);
            return `<b style="color:${getLayerColor(meta?.layer ?? "")}">${meta?.label ?? id}</b><br/>
                    <span style="color:#888">Click surrounding nodes to explore</span>`;
          }

          const rel = interactions.find(
            (r) =>
              (r.sourceKey === id &&
                r.targetKey === selectedChemical) ||
              (r.targetKey === id &&
                r.sourceKey === selectedChemical),
          );
          if (!rel) return false;

          const meta = getChemicalMeta(id);
          const label = interactionLabel(rel.modFactor);
          const color = interactionColor(rel.modFactor);

          return `<b style="color:${getLayerColor(meta?.layer ?? "")}">${meta?.label ?? id}</b><br/>
                  <span style="color:${color};font-weight:bold">${label}</span> (${rel.modFactor > 0 ? "+" : ""}${rel.modFactor.toFixed(2)})<br/>
                  ${rel.mechanism ? `<span style="color:#aaa">Mechanism: ${rel.mechanism}</span><br/>` : ""}
                  ${rel.notes ? `<span style="color:#888">${rel.notes}</span><br/>` : ""}
                  <span style="color:#6366f1;font-size:10px">Click to ask AI about this</span>`;
        },
      },
      series: [
        {
          type: "networkgraph" as const,
          nodes: expandedData.nodes,
          data: expandedData.links,
          dataLabels: {
            enabled: true,
            linkTextPath: { enabled: false },
            style: {
              color: NEON_TEXT,
              fontSize: "10px",
              textOutline: "2px #0a0a1a",
              fontWeight: "normal",
            },
          },
        },
      ],
    };
  }, [
    expandedData,
    selectedChemical,
    interactions,
    onInteractionClick,
  ]);

  const isExpanded = selectedChemical !== null;
  const selectedMeta = selectedChemical
    ? getChemicalMeta(selectedChemical)
    : null;

  return (
    <div className="relative flex-1 min-w-0">
      {/* Back button in expanded mode */}
      {isExpanded && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
          <button
            onClick={() => onSelectChemical(null)}
            className="px-2.5 py-1 text-[10px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-600/50 transition-colors"
          >
            &larr; Back
          </button>
          {selectedMeta && (
            <span
              className="text-xs font-semibold"
              style={{ color: getLayerColor(selectedMeta.layer) }}
            >
              {selectedMeta.label}
            </span>
          )}
        </div>
      )}

      {/* Labels in expanded mode */}
      {isExpanded && (
        <>
          <div className="absolute top-2 right-4 z-10">
            <span className="text-[10px] font-medium text-emerald-400/70">
              Agonists &rarr;
            </span>
          </div>
          <div className="absolute top-2 left-24 z-10">
            <span className="text-[10px] font-medium text-red-400/70">
              &larr; Antagonists
            </span>
          </div>
        </>
      )}

      {/* Layer legend */}
      {!isExpanded && (
        <div className="absolute top-2 right-3 z-10 flex gap-3">
          {[
            { layer: "neurotransmitter", label: "NT" },
            { layer: "hormone", label: "Hormone" },
            { layer: "peptide", label: "Peptide" },
          ].map(({ layer, label }) => (
            <div key={layer} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full border-2"
                style={{
                  borderColor: getLayerColor(layer),
                  backgroundColor: NEON_BG,
                }}
              />
              <span className="text-[9px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      )}

      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        options={isExpanded ? expandedOptions! : overviewOptions}
      />
    </div>
  );
}
