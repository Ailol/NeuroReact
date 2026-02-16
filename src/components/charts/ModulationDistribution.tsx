import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { api } from "../../api/client";

interface Props {
  person: string;
}

const BIN_COUNT = 20;

export default function ModulationDistribution({ person }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["timeline", person],
    queryFn: () => api.persons.timeline(person),
    enabled: !!person,
    retry: false,
  });

  const { bins, mean, median, skewLabel, totalEntries } = useMemo(() => {
    if (!data?.entries?.length)
      return { bins: [], mean: 0, median: 0, skewLabel: "", totalEntries: 0 };

    const values = data.entries.map((e) => e.modulationFactor).sort((a, b) => a - b);
    const n = values.length;

    // Mean
    const avg = values.reduce((a, b) => a + b, 0) / n;

    // Median
    const mid = Math.floor(n / 2);
    const med = n % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];

    // Skew label
    const label =
      avg > 0.1 ? "Positive Skew" : avg < -0.1 ? "Negative Skew" : "Balanced";

    // Bin into histogram
    const binWidth = 2 / BIN_COUNT; // -1 to 1 range
    const histogram = new Array(BIN_COUNT).fill(0);
    for (const v of values) {
      const idx = Math.min(Math.floor((v + 1) / binWidth), BIN_COUNT - 1);
      histogram[idx]++;
    }

    const binData = histogram.map((count, i) => {
      const center = -1 + (i + 0.5) * binWidth;
      return { x: center, y: count };
    });

    return { bins: binData, mean: avg, median: med, skewLabel: label, totalEntries: n };
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <p className="text-sm text-gray-500">Loading distribution...</p>
      </div>
    );
  }

  if (bins.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-sm font-semibold mb-1">Modulation Distribution</h2>
        <p className="text-xs text-gray-500">No profile data available.</p>
      </div>
    );
  }

  const skewColor =
    skewLabel === "Positive Skew"
      ? "#4ade80"
      : skewLabel === "Negative Skew"
        ? "#f87171"
        : "#9ca3af";

  const options: Highcharts.Options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      height: 260,
    },
    title: { text: undefined },
    xAxis: {
      title: {
        text: "Modulation Factor",
        style: { color: "#6b7280", fontSize: "10px" },
      },
      labels: { style: { color: "#6b7280", fontSize: "9px" } },
      gridLineColor: "#374151",
      plotLines: [
        {
          value: mean,
          color: "#fbbf24",
          width: 2,
          dashStyle: "Dash",
          label: {
            text: `Mean: ${mean.toFixed(2)}`,
            style: { color: "#fbbf24", fontSize: "9px" },
          },
        },
        {
          value: median,
          color: "#60a5fa",
          width: 2,
          dashStyle: "Dot",
          label: {
            text: `Median: ${median.toFixed(2)}`,
            style: { color: "#60a5fa", fontSize: "9px" },
          },
        },
      ],
    },
    yAxis: {
      title: { text: undefined },
      labels: { style: { color: "#6b7280", fontSize: "9px" } },
      gridLineColor: "#1f2937",
    },
    tooltip: {
      backgroundColor: "#1f2937",
      borderColor: "#374151",
      style: { color: "#d1d5db" },
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        return `Range: ${(this.x as number).toFixed(2)}<br/>Count: <b>${this.y}</b>`;
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    plotOptions: {
      column: {
        borderWidth: 0,
        pointPadding: 0,
        groupPadding: 0.05,
        borderRadius: 2,
        colorByPoint: true,
        colors: bins.map((b) => {
          if (b.x > 0.1) return "#4ade8066";
          if (b.x < -0.1) return "#f8717166";
          return "#6b728066";
        }),
      },
    },
    series: [
      {
        type: "column" as const,
        name: "Count",
        data: bins.map((b) => [b.x, b.y]),
      },
    ],
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Modulation Distribution</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: skewColor }}>
            {skewLabel}
          </span>
          <span className="text-[10px] text-gray-500">{totalEntries} entries</span>
        </div>
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
