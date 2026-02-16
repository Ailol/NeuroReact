import { useMemo, useState } from "react";
import Highcharts from "highcharts";
import "highcharts/modules/sankey";
import HighchartsReact from "highcharts-react-official";
import type { ShadowMatrixResponse } from "../../types/api";
import { CHEMICALS, LAYER_COLORS, LAYER_LABELS } from "../../data/chemicals";

interface Props {
  matrixData: ShadowMatrixResponse | undefined;
  mode: "work" | "private";
}

const MODE_TO_SECTION: Record<string, string> = {
  work: "Behavioral",
  private: "Personal",
};

const SECTION_COLORS: Record<string, string> = {
  Behavioral: "#6366f1",
  Personal: "#10b981",
};

const LAYERS = ["neurotransmitter", "hormone", "peptide"] as const;
type Layer = (typeof LAYERS)[number];

interface Filters {
  sections: Set<string>;
  layers: Set<Layer>;
}

function buildGraph(
  matrixData: ShadowMatrixResponse | undefined,
  filters: Filters,
) {
  if (!matrixData?.cells?.length)
    return { nodes: [], links: [], hasData: false };

  const filtered = matrixData.cells.filter((cell) => {
    if (!filters.sections.has(cell.section)) return false;
    const layer = (cell.layer || "unknown") as Layer;
    if (!filters.layers.has(layer)) return false;
    return true;
  });

  const chemToLayer = new Map<string, { layer: string; totalWeight: number }>();
  const layerToDim = new Map<string, number>();

  for (const cell of filtered) {
    const weight = cell.shadowLevel * Math.log2(cell.entryCount + 1);
    if (weight <= 0.5) continue;

    const layer = cell.layer || "unknown";

    const existing = chemToLayer.get(cell.chemical);
    if (existing) {
      existing.totalWeight += weight;
    } else {
      chemToLayer.set(cell.chemical, { layer, totalWeight: weight });
    }

    const ldKey = `${layer}|${cell.dimension}`;
    layerToDim.set(ldKey, (layerToDim.get(ldKey) ?? 0) + weight);
  }

  if (chemToLayer.size === 0) return { nodes: [], links: [], hasData: false };

  const nodeList: { id: string; name: string; color: string }[] = [];
  const addedNodes = new Set<string>();

  for (const [chemKey, info] of chemToLayer) {
    if (!addedNodes.has(chemKey)) {
      const meta = CHEMICALS.find((c) => c.key === chemKey);
      const color = LAYER_COLORS[info.layer as keyof typeof LAYER_COLORS] ?? "#6b7280";
      nodeList.push({ id: chemKey, name: meta?.label ?? chemKey, color });
      addedNodes.add(chemKey);
    }
  }

  // Only add layer hub nodes for active layers that have data
  const activeLayers = new Set<string>();
  for (const info of chemToLayer.values()) activeLayers.add(info.layer);

  for (const layer of LAYERS) {
    if (!activeLayers.has(layer)) continue;
    const id = `layer_${layer}`;
    if (!addedNodes.has(id)) {
      nodeList.push({
        id,
        name: LAYER_LABELS[layer] ?? layer,
        color: LAYER_COLORS[layer],
      });
      addedNodes.add(id);
    }
  }

  for (const cell of filtered) {
    const weight = cell.shadowLevel * Math.log2(cell.entryCount + 1);
    if (weight <= 0.5) continue;
    const dimId = `dim_${cell.dimension}`;
    if (!addedNodes.has(dimId)) {
      nodeList.push({
        id: dimId,
        name: cell.dimension,
        color: SECTION_COLORS[cell.section] ?? "#6b7280",
      });
      addedNodes.add(dimId);
    }
  }

  const linkList: { from: string; to: string; weight: number; color: string }[] = [];

  for (const [chemKey, info] of chemToLayer) {
    const color = (LAYER_COLORS[info.layer as keyof typeof LAYER_COLORS] ?? "#6b7280") + "50";
    linkList.push({
      from: chemKey,
      to: `layer_${info.layer}`,
      weight: Math.round(info.totalWeight * 100) / 100,
      color,
    });
  }

  for (const [key, weight] of layerToDim) {
    const [layer, dim] = key.split("|");
    const color = (LAYER_COLORS[layer as keyof typeof LAYER_COLORS] ?? "#6b7280") + "30";
    linkList.push({
      from: `layer_${layer}`,
      to: `dim_${dim}`,
      weight: Math.round(weight * 100) / 100,
      color,
    });
  }

  return { nodes: nodeList, links: linkList, hasData: linkList.length > 0 };
}

function ToggleButton({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${
        active
          ? "text-white border-transparent"
          : "text-gray-500 border-gray-700 bg-gray-900/50 hover:text-gray-300"
      }`}
      style={active ? { backgroundColor: color } : undefined}
    >
      {label}
    </button>
  );
}

export default function DimensionSankey({ matrixData, mode }: Props) {
  const [layers, setLayers] = useState<Set<Layer>>(
    () => new Set(LAYERS),
  );

  const toggleLayer = (layer: Layer) => {
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        if (next.size > 1) next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const activeSection = MODE_TO_SECTION[mode];
  const filters: Filters = useMemo(
    () => ({ sections: new Set([activeSection]), layers }),
    [activeSection, layers],
  );

  const { nodes, links, hasData } = useMemo(
    () => buildGraph(matrixData, filters),
    [matrixData, filters],
  );

  if (!matrixData?.cells?.length) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-sm font-semibold mb-1">Dimension Source Flow</h2>
        <p className="text-xs text-gray-500">
          No shadow matrix data available for flow diagram.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      {/* Filter controls */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded"
          style={{ backgroundColor: SECTION_COLORS[activeSection] + "30", color: SECTION_COLORS[activeSection] }}
        >
          {activeSection}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Layer</span>
          <div className="flex gap-1.5">
            {LAYERS.map((layer) => (
              <ToggleButton
                key={layer}
                active={layers.has(layer)}
                color={LAYER_COLORS[layer]}
                label={LAYER_LABELS[layer]}
                onClick={() => toggleLayer(layer)}
              />
            ))}
          </div>
        </div>
      </div>

      {!hasData ? (
        <p className="text-xs text-gray-500 text-center py-8">
          No data matches the current filters.
        </p>
      ) : (
        <HighchartsReact
          highcharts={Highcharts}
          options={
            {
              chart: {
                backgroundColor: "transparent",
                height: 650,
              },
              title: {
                text: "Chemical → Layer → Dimension",
                style: { color: "#d1d5db", fontSize: "13px", fontWeight: "600" },
              },
              credits: { enabled: false },
              tooltip: {
                backgroundColor: "#1f2937",
                borderColor: "#374151",
                style: { color: "#d1d5db" },
                nodeFormat: "{point.name}",
                pointFormat:
                  "{point.fromNode.name} → {point.toNode.name}: <b>{point.weight:.1f}</b>",
              },
              plotOptions: {
                sankey: {
                  nodeWidth: 20,
                  nodePadding: 6,
                  curveFactor: 0.5,
                  dataLabels: {
                    enabled: true,
                    style: {
                      color: "#9ca3af",
                      fontSize: "9px",
                      textOutline: "none",
                      fontWeight: "400",
                    },
                  },
                },
              },
              series: [
                {
                  type: "sankey" as const,
                  name: "Chemical → Layer → Dimension",
                  nodes,
                  data: links,
                  keys: ["from", "to", "weight", "color"],
                },
              ],
            } as Highcharts.Options
          }
        />
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500 justify-center">
        <span className="text-gray-600">Chemicals</span>
        <span className="text-gray-700">→</span>
        {LAYERS.filter((l) => layers.has(l)).map((layer) => (
          <span key={layer} className="flex items-center gap-1">
            <span
              className="w-3 h-1.5 rounded-sm inline-block"
              style={{ backgroundColor: LAYER_COLORS[layer] }}
            />
            {LAYER_LABELS[layer]}
          </span>
        ))}
        <span className="text-gray-700">→</span>
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-1.5 rounded-sm inline-block"
            style={{ backgroundColor: SECTION_COLORS[activeSection] }}
          />
          {activeSection} Dimensions
        </span>
      </div>
    </div>
  );
}
