import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Highcharts from "highcharts";
import "highcharts/highcharts-more";
import HighchartsReact from "highcharts-react-official";
import { api } from "../../api/client";
import type { DimensionScore, DimensionsResponse } from "../../types/api";
import { LAYER_COLORS } from "../../data/chemicals";
import { levelToColor } from "../../data/levelColors";
import { useHighlight } from "../../contexts/HighlightContext";

interface Props {
  person: string;
  mode: "work" | "private";
}

const MODE_COLORS: Record<string, string> = {
  work: "#6366f1",
  private: "#10b981",
};

const SECTION_COLORS: Record<string, string> = {
  Behavioral: "rgba(99,102,241,0.08)",
  Personal: "rgba(16,185,129,0.08)",
};

function EvidencePanel({
  dim,
  data,
  mode,
  onClose,
}: {
  dim: { name: string; section: string };
  data: DimensionScore;
  mode: "work" | "private";
  onClose: () => void;
}) {
  const color = MODE_COLORS[mode];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{dim.name}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs">
          Close
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium" style={{ color }}>
          {mode}: {data.score}
        </span>
        <span className="text-[10px] text-gray-500">
          confidence {(data.confidence * 100).toFixed(0)}% · consistency{" "}
          {(data.consistency * 100).toFixed(0)}%
        </span>
      </div>
      {data.evidence.length > 0 ? (
        <div className="space-y-1">
          {data.evidence.slice(0, 5).map((e, i) => {
            const layerColor =
              LAYER_COLORS[e.layer as keyof typeof LAYER_COLORS] ?? "#6b7280";
            return (
              <div
                key={i}
                className="p-2 bg-gray-900 rounded border border-gray-700 text-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: layerColor + "30",
                      color: layerColor,
                    }}
                  >
                    {e.chemical}
                  </span>
                  <span className="text-gray-500">
                    level: {e.level.toFixed(2)} · recency: {e.recency.toFixed(2)}
                  </span>
                </div>
                <p className="text-gray-400 line-clamp-2">{e.reasoning}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-600">No evidence</p>
      )}
    </div>
  );
}

export default function DimensionsDisplay({ person, mode }: Props) {
  const [selectedDim, setSelectedDim] = useState<string | null>(null);
  const { setHighlight } = useHighlight();

  const color = MODE_COLORS[mode];

  const query = useQuery({
    queryKey: ["dimensions", person, mode],
    queryFn: () => api.persons.dimensions(person, mode),
    enabled: !!person,
    retry: false,
  });

  const isLoading = query.isLoading;
  const error = query.error;

  if (error) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-sm text-gray-500">
          Dimension scoring unavailable (embedding model not configured).
        </p>
      </div>
    );
  }

  const behavioral = query.data?.behavioral ?? [];
  const personal = query.data?.personal ?? [];
  const allDims = [...behavioral, ...personal];

  const handleSelect = (name: string) => {
    setSelectedDim(name);
    setHighlight({ dimension: name, source: "chart" });
  };

  const selectedData = selectedDim
    ? allDims.find((d) => d.name === selectedDim)
    : undefined;
  const selectedSection = selectedData?.section ?? "";

  // Build unified radar
  const names = allDims.map((d) => d.name);

  // Section plotBands
  const plotBands: Highcharts.XAxisPlotBandsOptions[] = [];
  if (behavioral.length > 0) {
    plotBands.push({
      from: -0.5,
      to: behavioral.length - 0.5,
      color: SECTION_COLORS.Behavioral,
      label: {
        text: "Behavioral",
        style: { color: "#6366f1", fontSize: "9px", fontWeight: "500" },
        align: "center",
        y: -8,
      },
    });
  }
  if (personal.length > 0) {
    plotBands.push({
      from: behavioral.length - 0.5,
      to: behavioral.length + personal.length - 0.5,
      color: SECTION_COLORS.Personal,
      label: {
        text: "Personal",
        style: { color: "#10b981", fontSize: "9px", fontWeight: "500" },
        align: "center",
        y: -8,
      },
    });
  }

  const data = allDims.map((d) => ({
    y: d.score,
    marker: {
      radius: 3 + d.confidence * 5,
      fillOpacity: 0.3 + d.confidence * 0.7,
      symbol: d.confidence >= 0.6 ? ("circle" as const) : ("diamond" as const),
    },
  }));

  const options: Highcharts.Options = {
    chart: {
      polar: true,
      type: "area",
      backgroundColor: "transparent",
      height: 480,
      spacingTop: 10,
      spacingBottom: 10,
    },
    title: { text: undefined },
    pane: { startAngle: 0, endAngle: 360 },
    xAxis: {
      categories: names,
      tickmarkPlacement: "on",
      lineWidth: 0,
      labels: {
        style: { color: "#9ca3af", fontSize: "9px" },
        distance: 18,
      },
      gridLineColor: "#374151",
      plotBands,
    },
    yAxis: {
      gridLineInterpolation: "polygon",
      min: 0,
      max: 100,
      tickPositions: [0, 20, 40, 60, 80, 100],
      labels: {
        style: { color: "#4b5563", fontSize: "8px" },
        formatter: function () {
          const v = this.value as number;
          if (v === 20) return "L1";
          if (v === 40) return "L2";
          if (v === 60) return "L3";
          if (v === 80) return "L4";
          if (v === 100) return "L5";
          return "";
        },
      },
      gridLineColor: "#374151",
      plotBands: [
        { from: 0, to: 20, color: levelToColor(1) + "08" },
        { from: 20, to: 40, color: levelToColor(2) + "08" },
        { from: 40, to: 60, color: levelToColor(3) + "08" },
        { from: 60, to: 80, color: levelToColor(4) + "08" },
        { from: 80, to: 100, color: levelToColor(5) + "08" },
      ],
    },
    tooltip: {
      backgroundColor: "#1f2937",
      borderColor: "#374151",
      style: { color: "#d1d5db" },
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        const dim = allDims.find((d) => d.name === this.x);
        let html = `<b style="color:#d1d5db">${this.x}</b><br/>`;
        html += `Score: <b>${this.y}</b><br/>`;
        if (dim) {
          html += `<span style="color:#6b7280">confidence: ${(dim.confidence * 100).toFixed(0)}% · consistency: ${(dim.consistency * 100).toFixed(0)}%</span>`;
        }
        return html;
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    plotOptions: {
      area: {
        fillOpacity: 0.2,
        lineWidth: 2,
        marker: { enabled: true, lineWidth: 1 },
        point: {
          events: {
            click: function (this: Highcharts.Point) {
              handleSelect(names[this.index]);
            },
          },
        },
      },
    },
    series: [
      {
        type: "area" as const,
        name: "Score",
        data,
        color,
        lineColor: color,
        fillColor: color + "33",
        marker: { fillColor: color, lineColor: color },
      },
    ],
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-2">
      {isLoading ? (
        <p className="text-gray-500 text-sm p-4">Scoring dimensions...</p>
      ) : allDims.length > 0 ? (
        <HighchartsReact highcharts={Highcharts} options={options} />
      ) : (
        <p className="text-gray-500 text-sm p-4">No dimension data.</p>
      )}

      {selectedDim && selectedData && (
        <EvidencePanel
          dim={{ name: selectedDim, section: selectedSection }}
          data={selectedData}
          mode={mode}
          onClose={() => setSelectedDim(null)}
        />
      )}
    </div>
  );
}

export { type DimensionsResponse };
