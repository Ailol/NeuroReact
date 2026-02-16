import { useMemo } from "react";
import Highcharts from "highcharts";
import "highcharts/modules/sankey";
import HighchartsReact from "highcharts-react-official";
import type { ShadowMatrixResponse } from "../../types/api";
import { CHEMICALS, LAYER_COLORS, LAYER_LABELS } from "../../data/chemicals";

interface Props {
  matrixData: ShadowMatrixResponse | undefined;
}

const SECTION_COLORS: Record<string, string> = {
  Behavioral: "#6366f1",
  Personal: "#10b981",
};

const LAYERS = ["neurotransmitter", "hormone", "peptide"] as const;

function buildGraph(matrixData: ShadowMatrixResponse | undefined) {
  if (!matrixData?.cells?.length)
    return { nodes: [], links: [], hasData: false };

  const chemToLayer = new Map<string, { layer: string; totalWeight: number }>();
  const layerToDim = new Map<string, number>();

  for (const cell of matrixData.cells) {
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

  for (const layer of LAYERS) {
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

  for (const cell of matrixData.cells) {
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

export default function DimensionSankey({ matrixData }: Props) {
  const { nodes, links, hasData } = useMemo(
    () => buildGraph(matrixData),
    [matrixData]
  );

  if (!hasData) {
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
      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500 justify-center">
        <span className="text-gray-600">Chemicals</span>
        <span className="text-gray-700">→</span>
        {Object.entries(LAYER_COLORS).map(([layer, color]) => (
          <span key={layer} className="flex items-center gap-1">
            <span
              className="w-3 h-1.5 rounded-sm inline-block"
              style={{ backgroundColor: color }}
            />
            {LAYER_LABELS[layer] ?? layer}
          </span>
        ))}
        <span className="text-gray-700">→</span>
        {Object.entries(SECTION_COLORS).map(([section, color]) => (
          <span key={section} className="flex items-center gap-1">
            <span
              className="w-3 h-1.5 rounded-sm inline-block"
              style={{ backgroundColor: color }}
            />
            {section}
          </span>
        ))}
      </div>
    </div>
  );
}
