import { useMemo } from "react";
import Highcharts from "highcharts";
import "highcharts/modules/heatmap";
import HighchartsReact from "highcharts-react-official";
import { CHEMICALS, LAYER_COLORS } from "../../data/chemicals";
import { useHighlight } from "../../contexts/HighlightContext";
import type { ShadowMatrixResponse } from "../../types/api";

interface Props {
  matrixData: ShadowMatrixResponse | undefined;
  onChemicalSelect?: (chemical: string) => void;
}

export default function ShadowLevelHeatmap({ matrixData, onChemicalSelect }: Props) {
  const { setHighlight } = useHighlight();

  const { heatData, dimLabels, chemLabels, cellMap, chemKeys } = useMemo(() => {
    if (!matrixData?.cells?.length)
      return { heatData: [], dimLabels: [], chemLabels: [], cellMap: new Map(), chemKeys: [] as string[] };

    const dims = matrixData.dimensions;
    const chems = matrixData.chemicals.length > 0
      ? matrixData.chemicals
      : CHEMICALS.map((c) => c.key);

    const lookup = new Map<string, typeof matrixData.cells[0]>();
    for (const cell of matrixData.cells) {
      lookup.set(`${cell.dimension}|${cell.chemical}`, cell);
    }

    const points: [number, number, number | null][] = [];
    for (let xi = 0; xi < dims.length; xi++) {
      for (let yi = 0; yi < chems.length; yi++) {
        const cell = lookup.get(`${dims[xi]}|${chems[yi]}`);
        points.push([xi, yi, cell ? cell.shadowLevel : null]);
      }
    }

    return {
      heatData: points,
      dimLabels: dims,
      chemLabels: chems.map((k) => {
        const meta = CHEMICALS.find((c) => c.key === k);
        return meta?.label ?? k;
      }),
      cellMap: lookup,
      chemKeys: chems,
    };
  }, [matrixData]);

  if (!matrixData || heatData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-sm font-semibold mb-1">Shadow Level Matrix</h2>
        <p className="text-xs text-gray-500">No dimension data available.</p>
      </div>
    );
  }

  const ntCount = chemKeys.filter((k) => {
    const m = CHEMICALS.find((c) => c.key === k);
    return m?.layer === "neurotransmitter";
  }).length;
  const hCount = chemKeys.filter((k) => {
    const m = CHEMICALS.find((c) => c.key === k);
    return m?.layer === "hormone";
  }).length;

  const behavioralCount = matrixData.dimensions.filter((d) => {
    const cell = matrixData.cells.find((c) => c.dimension === d);
    return cell?.section === "Behavioral";
  }).length;

  const options: Highcharts.Options = {
    chart: {
      type: "heatmap",
      backgroundColor: "transparent",
      height: Math.max(500, chemLabels.length * 20 + 100),
    },
    title: {
      text: "Shadow Level Matrix",
      style: { color: "#d1d5db", fontSize: "14px", fontWeight: "600" },
    },
    xAxis: {
      categories: dimLabels,
      labels: {
        style: { color: "#9ca3af", fontSize: "9px" },
        rotation: -45,
      },
      gridLineColor: "#374151",
      plotLines: [
        {
          value: behavioralCount - 0.5,
          color: "#6b7280",
          width: 2,
          label: {
            text: "Personal →",
            style: { color: "#4b5563", fontSize: "8px" },
            align: "left",
          },
        },
      ],
    },
    yAxis: {
      categories: chemLabels,
      labels: {
        style: { color: "#9ca3af", fontSize: "10px" },
        formatter: function () {
          const idx = typeof this.pos === "number" ? this.pos : 0;
          const chemKey = chemKeys[idx];
          const meta = CHEMICALS.find((c) => c.key === chemKey);
          const color = meta
            ? LAYER_COLORS[meta.layer as keyof typeof LAYER_COLORS]
            : "#9ca3af";
          return `<span style="color:${color}">${this.value}</span>`;
        },
        useHTML: true,
      },
      reversed: true,
      plotLines: [
        { value: ntCount - 0.5, color: "#4b5563", width: 2 },
        { value: ntCount + hCount - 0.5, color: "#4b5563", width: 2 },
      ],
    },
    colorAxis: {
      min: 1,
      max: 5,
      stops: [
        [0, "#3b82f6"],
        [0.25, "#6366f1"],
        [0.5, "#8b5cf6"],
        [0.75, "#f59e0b"],
        [1, "#22c55e"],
      ],
      labels: {
        style: { color: "#6b7280" },
        format: "L{value:.0f}",
      },
    },
    legend: {
      align: "right",
      layout: "vertical",
      verticalAlign: "middle",
      symbolHeight: 200,
    },
    tooltip: {
      backgroundColor: "#1f2937",
      borderColor: "#374151",
      style: { color: "#d1d5db" },
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        const point = this.point as Highcharts.Point & { value: number | null };
        const xi = point.x;
        const yi = point.y!;
        const dim = dimLabels[xi];
        const chemKey = chemKeys[yi];
        const chemLabel = chemLabels[yi];
        if (point.value === null)
          return `<b>${chemLabel}</b> × ${dim}<br/><span style="color:#6b7280">Not relevant</span>`;
        const cell = cellMap.get(`${dim}|${chemKey}`);
        return (
          `<b>${chemLabel}</b> × <b>${dim}</b><br/>` +
          `Shadow Level: <b>L${point.value.toFixed(1)}</b><br/>` +
          `Confidence: ${((cell?.confidence ?? 0) * 100).toFixed(0)}%<br/>` +
          `Entries: ${cell?.entryCount ?? 0}`
        );
      },
    },
    credits: { enabled: false },
    plotOptions: {
      heatmap: {
        nullColor: "#1a1a2e",
        borderWidth: 1,
        borderColor: "#111827",
        point: {
          events: {
            click: function (this: Highcharts.Point) {
              const chemKey = chemKeys[this.y!];
              if (chemKey) {
                setHighlight({ chemical: chemKey, source: "chart" });
                onChemicalSelect?.(chemKey);
              }
            },
          },
        },
      },
    },
    series: [
      {
        type: "heatmap" as const,
        name: "Shadow Level",
        data: heatData,
      },
    ],
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-2">
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
