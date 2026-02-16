import Highcharts from "highcharts";
import "highcharts/highcharts-more";
import HighchartsReact from "highcharts-react-official";
import type { ChemicalMeta } from "../../data/chemicals";
import { LAYER_COLORS, LAYER_LABELS } from "../../data/chemicals";

interface Props {
  layer: "neurotransmitter" | "hormone" | "peptide";
  chemicals: ChemicalMeta[];
  counts: Map<string, number>;
  onSelect: (chemicalKey: string) => void;
}

export default function LayerRadarChart({ layer, chemicals, counts, onSelect }: Props) {
  const color = LAYER_COLORS[layer];
  const maxCount = Math.max(1, ...chemicals.map((c) => counts.get(c.key) ?? 0));

  const options: Highcharts.Options = {
    chart: {
      polar: true,
      type: "area",
      backgroundColor: "transparent",
      height: 300,
    },
    title: {
      text: LAYER_LABELS[layer] ?? layer,
      style: { color: "#d1d5db", fontSize: "14px", fontWeight: "600" },
    },
    pane: {
      startAngle: 0,
      endAngle: 360,
    },
    xAxis: {
      categories: chemicals.map((c) => c.label),
      tickmarkPlacement: "on",
      lineWidth: 0,
      labels: {
        style: { color: "#9ca3af", fontSize: "10px" },
      },
      gridLineColor: "#374151",
    },
    yAxis: {
      gridLineInterpolation: "polygon",
      min: 0,
      max: 1,
      labels: { enabled: false },
      gridLineColor: "#374151",
    },
    tooltip: {
      shared: true,
      formatter: function (this: Highcharts.Point) {
        const key = chemicals[this.index]?.key;
        const count = key ? counts.get(key) ?? 0 : 0;
        return `<b>${this.category}</b><br/>Count: ${count}`;
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    plotOptions: {
      area: {
        fillOpacity: 0.25,
        marker: {
          enabled: true,
          radius: 4,
          fillColor: color,
          lineColor: color,
          lineWidth: 1,
        },
        point: {
          events: {
            click: function (this: Highcharts.Point) {
              const chem = chemicals[this.index];
              if (chem) onSelect(chem.key);
            },
          },
        },
      },
    },
    series: [
      {
        type: "area" as const,
        name: LAYER_LABELS[layer],
        data: chemicals.map((c) => (counts.get(c.key) ?? 0) / maxCount),
        color,
        lineColor: color,
        lineWidth: 2,
      },
    ],
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-2">
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
