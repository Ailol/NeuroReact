import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Highcharts from "highcharts";
import "highcharts/modules/heatmap";
import HighchartsReact from "highcharts-react-official";
import { api } from "../../api/client";
import { CHEMICALS, LAYER_COLORS } from "../../data/chemicals";
import { useHighlight } from "../../contexts/HighlightContext";

interface Props {
  person: string;
}

export default function ChemicalHeatmap({ person }: Props) {
  const { setHighlight } = useHighlight();

  const { data, isLoading } = useQuery({
    queryKey: ["timeline", person],
    queryFn: () => api.persons.timeline(person),
    enabled: !!person,
    retry: false,
  });

  const { chartData, dateLabels, chemicalLabels } = useMemo(() => {
    if (!data?.entries?.length) return { chartData: [], dateLabels: [], chemicalLabels: [] };

    // Build chemical order (grouped by layer)
    const orderedChemicals = CHEMICALS.map((c) => c.key);
    const chemLabels = CHEMICALS.map((c) => c.label);

    // Bin entries by day
    const dateBins = new Map<string, Map<string, number[]>>();
    for (const entry of data.entries) {
      const day = entry.createdAt.slice(0, 10);
      if (!dateBins.has(day)) dateBins.set(day, new Map());
      const dayMap = dateBins.get(day)!;
      const key = entry.chemical.toLowerCase();
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(entry.modulationFactor);
    }

    const sortedDates = [...dateBins.keys()].sort();
    const heatData: [number, number, number | null][] = [];

    for (let xi = 0; xi < sortedDates.length; xi++) {
      const dayMap = dateBins.get(sortedDates[xi])!;
      for (let yi = 0; yi < orderedChemicals.length; yi++) {
        const values = dayMap.get(orderedChemicals[yi]);
        if (values && values.length > 0) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          heatData.push([xi, yi, Math.round(avg * 1000) / 1000]);
        } else {
          heatData.push([xi, yi, null]);
        }
      }
    }

    return {
      chartData: heatData,
      dateLabels: sortedDates,
      chemicalLabels: chemLabels,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <p className="text-sm text-gray-500">Loading chemical timeline...</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-sm font-semibold mb-1">Chemical Heatmap</h2>
        <p className="text-xs text-gray-500">No profile timeline data available.</p>
      </div>
    );
  }

  // Layer separator lines
  const ntCount = CHEMICALS.filter((c) => c.layer === "neurotransmitter").length;
  const hCount = CHEMICALS.filter((c) => c.layer === "hormone").length;

  const options: Highcharts.Options = {
    chart: {
      type: "heatmap",
      backgroundColor: "transparent",
      height: Math.max(400, chemicalLabels.length * 18 + 80),
    },
    title: {
      text: "Chemical Activation Timeline",
      style: { color: "#d1d5db", fontSize: "14px", fontWeight: "600" },
    },
    xAxis: {
      categories: dateLabels,
      labels: {
        style: { color: "#6b7280", fontSize: "9px" },
        rotation: -45,
      },
      gridLineColor: "#374151",
    },
    yAxis: {
      categories: chemicalLabels,
      labels: {
        style: { color: "#9ca3af", fontSize: "10px" },
        formatter: function () {
          const idx = typeof this.pos === "number" ? this.pos : 0;
          const chem = CHEMICALS[idx];
          const color = chem ? LAYER_COLORS[chem.layer as keyof typeof LAYER_COLORS] : "#9ca3af";
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
      min: -1,
      max: 1,
      stops: [
        [0, "#3b82f6"],
        [0.25, "#60a5fa"],
        [0.5, "#f3f4f6"],
        [0.75, "#f87171"],
        [1, "#ef4444"],
      ],
      labels: { style: { color: "#6b7280" } },
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
        if (point.value === null) return `<b>${chemicalLabels[point.y!]}</b><br/>No data`;
        return `<b>${chemicalLabels[point.y!]}</b><br/>Date: ${dateLabels[point.x]}<br/>Modulation: <b>${point.value.toFixed(3)}</b>`;
      },
    },
    credits: { enabled: false },
    plotOptions: {
      heatmap: {
        nullColor: "#1f2937",
        borderWidth: 1,
        borderColor: "#111827",
        point: {
          events: {
            click: function (this: Highcharts.Point) {
              const chem = CHEMICALS[this.y!];
              if (chem) setHighlight({ chemical: chem.key, source: "chart" });
            },
          },
        },
      },
    },
    series: [
      {
        type: "heatmap" as const,
        name: "Modulation",
        data: chartData,
      },
    ],
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-2">
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
