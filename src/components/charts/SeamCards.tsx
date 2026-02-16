import { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import type { ShadowMatrixResponse, ChemicalSeam } from "../../types/api";
import { LAYER_COLORS } from "../../data/chemicals";
import { levelToColor } from "../../data/levelColors";

interface Props {
  matrixData: ShadowMatrixResponse | undefined;
  selectedChemical?: string;
}

function computeSeams(matrixData: ShadowMatrixResponse | undefined): ChemicalSeam[] {
  if (!matrixData?.cells?.length) return [];

  const byChemical = new Map<string, { dimension: string; level: number; layer: string }[]>();
  for (const cell of matrixData.cells) {
    const list = byChemical.get(cell.chemical) ?? [];
    list.push({ dimension: cell.dimension, level: cell.shadowLevel, layer: cell.layer });
    byChemical.set(cell.chemical, list);
  }

  const seams: ChemicalSeam[] = [];
  for (const [chemical, entries] of byChemical) {
    if (entries.length < 2) continue;
    const levels = entries.map((e) => e.level);
    const spread = Math.max(...levels) - Math.min(...levels);
    if (spread < 2.0) continue;

    const sorted = [...entries].sort((a, b) => b.level - a.level);
    seams.push({
      chemical,
      layer: entries[0].layer,
      spread,
      dimensionLevels: sorted.map((e) => ({
        dimension: e.dimension,
        level: e.level,
      })),
      highDimension: sorted[0].dimension,
      lowDimension: sorted[sorted.length - 1].dimension,
    });
  }

  return seams.sort((a, b) => b.spread - a.spread);
}

function SeamCard({ seam }: { seam: ChemicalSeam }) {
  const layerColor =
    LAYER_COLORS[seam.layer as keyof typeof LAYER_COLORS] ?? "#6b7280";
  const highLevel = seam.dimensionLevels[0];
  const lowLevel = seam.dimensionLevels[seam.dimensionLevels.length - 1];

  return (
    <div className="p-3 bg-gray-900 rounded border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: layerColor }}
          />
          <span className="text-sm font-medium" style={{ color: layerColor }}>
            {seam.chemical}
          </span>
        </div>
        <span className="text-[10px] text-gray-500">
          {seam.spread.toFixed(1)} level spread
        </span>
      </div>
      <div className="flex gap-4 text-xs mb-2">
        <div>
          <span className="text-gray-500">High </span>
          <span style={{ color: levelToColor(highLevel.level) }}>
            L{highLevel.level.toFixed(1)}
          </span>
          <span className="text-gray-400"> {highLevel.dimension}</span>
        </div>
        <div>
          <span className="text-gray-500">Low </span>
          <span style={{ color: levelToColor(lowLevel.level) }}>
            L{lowLevel.level.toFixed(1)}
          </span>
          <span className="text-gray-400"> {lowLevel.dimension}</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-500">
        {seam.chemical} activates strongly for {highLevel.dimension} but weakly
        for {lowLevel.dimension}. Context-dependent activation pattern.
      </p>
    </div>
  );
}

function ExpandedSeamChart({ seam }: { seam: ChemicalSeam }) {
  const layerColor =
    LAYER_COLORS[seam.layer as keyof typeof LAYER_COLORS] ?? "#6b7280";

  const options: Highcharts.Options = {
    chart: {
      type: "bar",
      backgroundColor: "transparent",
      height: Math.max(200, seam.dimensionLevels.length * 28 + 60),
    },
    title: {
      text: `${seam.chemical} — Per-Dimension Levels`,
      style: { color: "#d1d5db", fontSize: "13px", fontWeight: "600" },
    },
    xAxis: {
      categories: seam.dimensionLevels.map((d) => d.dimension),
      labels: { style: { color: "#9ca3af", fontSize: "10px" } },
    },
    yAxis: {
      min: 1,
      max: 5,
      title: {
        text: "Shadow Level",
        style: { color: "#6b7280", fontSize: "10px" },
      },
      labels: {
        style: { color: "#6b7280", fontSize: "9px" },
        format: "L{value:.0f}",
      },
      gridLineColor: "#1f2937",
      plotBands: [
        { from: 1, to: 2, color: "rgba(59,130,246,0.05)" },
        { from: 2, to: 3, color: "rgba(99,102,241,0.05)" },
        { from: 3, to: 4, color: "rgba(139,92,246,0.05)" },
        { from: 4, to: 5, color: "rgba(34,197,94,0.05)" },
      ],
    },
    tooltip: {
      backgroundColor: "#1f2937",
      borderColor: "#374151",
      style: { color: "#d1d5db" },
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        return `<b>${this.x}</b><br/>Level: <b>L${(this.y ?? 0).toFixed(1)}</b>`;
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    plotOptions: {
      bar: {
        borderWidth: 0,
        borderRadius: 2,
        colorByPoint: true,
        colors: seam.dimensionLevels.map((d) => levelToColor(d.level)),
      },
    },
    series: [
      {
        type: "bar" as const,
        name: "Shadow Level",
        data: seam.dimensionLevels.map((d) => d.level),
      },
    ],
  };

  return (
    <div className="bg-gray-900 rounded border border-gray-700 p-2">
      <div className="flex items-center gap-2 px-2 pt-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: layerColor }}
        />
        <span className="text-xs text-gray-400">{seam.layer}</span>
        <span className="text-[10px] text-gray-600">
          {seam.spread.toFixed(1)} level spread
        </span>
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}

export default function SeamCards({ matrixData, selectedChemical }: Props) {
  const seams = useMemo(() => computeSeams(matrixData), [matrixData]);

  const selectedSeam = useMemo(
    () =>
      selectedChemical
        ? seams.find((s) => s.chemical === selectedChemical) ??
          // Build from matrix even if spread < 2
          (() => {
            if (!matrixData?.cells) return undefined;
            const cells = matrixData.cells.filter(
              (c) => c.chemical === selectedChemical
            );
            if (cells.length < 2) return undefined;
            const sorted = [...cells].sort(
              (a, b) => b.shadowLevel - a.shadowLevel
            );
            return {
              chemical: selectedChemical,
              layer: cells[0].layer,
              spread:
                sorted[0].shadowLevel -
                sorted[sorted.length - 1].shadowLevel,
              dimensionLevels: sorted.map((c) => ({
                dimension: c.dimension,
                level: c.shadowLevel,
              })),
              highDimension: sorted[0].dimension,
              lowDimension: sorted[sorted.length - 1].dimension,
            } satisfies ChemicalSeam;
          })()
        : undefined,
    [selectedChemical, seams, matrixData]
  );

  if (seams.length === 0 && !selectedSeam) return null;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <h2 className="text-sm font-semibold mb-3">
        Seams — Cross-Dimension Disagreement
      </h2>

      {/* Expanded view for selected chemical */}
      {selectedSeam && <ExpandedSeamChart seam={selectedSeam} />}

      {/* Auto-detected seam cards */}
      {seams.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[10px] text-gray-500 mb-2">
            Top seams: chemicals with {"\u2265"}2 level spread across dimensions
          </p>
          <div className="grid grid-cols-1 gap-2">
            {seams.slice(0, 5).map((s) => (
              <SeamCard key={s.chemical} seam={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
