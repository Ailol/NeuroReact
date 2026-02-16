import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Highcharts from "highcharts";
import "highcharts/highcharts-more";
import "highcharts/modules/parallel-coordinates";
import HighchartsReact from "highcharts-react-official";
import { api } from "../../api/client";
import type { ShadowMatrixResponse } from "../../types/api";
import { NEON_LAYER_COLORS, interactionColor, interactionLabel } from "../../data/chemicals";

interface Props {
  matrixData: ShadowMatrixResponse | undefined;
}

type ViewMode = "network" | "radial";

const NEON_BG = "#0a0a1a";
const NEON_TEXT = "#e0e0ff";

export default function ChemicalExplorer({ matrixData }: Props) {
  const [selectedChemical, setSelectedChemical] = useState("dopamine");
  const [view, setView] = useState<ViewMode>("network");

  const { data: interactions } = useQuery({
    queryKey: ["chemical-interactions"],
    queryFn: () => api.chemicalInteractions.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: chemicals } = useQuery({
    queryKey: ["chemicals"],
    queryFn: () => api.chemicals.list(),
    staleTime: 10 * 60 * 1000,
  });

  const chemicalLevels = useMemo(() => {
    const levels = new Map<string, { sum: number; count: number }>();
    if (!matrixData?.cells) return levels;
    for (const cell of matrixData.cells) {
      const existing = levels.get(cell.chemical) ?? { sum: 0, count: 0 };
      existing.sum += cell.shadowLevel;
      existing.count += 1;
      levels.set(cell.chemical, existing);
    }
    return levels;
  }, [matrixData]);

  const getAvgLevel = useCallback(
    (key: string) => {
      const entry = chemicalLevels.get(key);
      return entry ? entry.sum / entry.count : 3;
    },
    [chemicalLevels],
  );

  // ── Shared: related chemicals partitioned by modFactor ──────────────────

  const { agonists, antagonists, stabilizers, related } = useMemo(() => {
    if (!interactions || !chemicals) {
      return { agonists: [], antagonists: [], stabilizers: [], related: [] };
    }

    const chemMap = new Map(chemicals.map((c) => [c.key, c]));
    const rel = interactions.filter(
      (i) => i.sourceKey === selectedChemical || i.targetKey === selectedChemical,
    );

    const ag: { key: string; label: string; layer: string; modFactor: number }[] = [];
    const an: { key: string; label: string; layer: string; modFactor: number }[] = [];
    const st: { key: string; label: string; layer: string; modFactor: number }[] = [];

    for (const r of rel) {
      const otherKey = r.sourceKey === selectedChemical ? r.targetKey : r.sourceKey;
      const otherLabel = r.sourceKey === selectedChemical ? r.targetLabel : r.sourceLabel;
      const otherLayer = r.sourceKey === selectedChemical ? r.targetLayer : r.sourceLayer;
      const entry = { key: otherKey, label: otherLabel, layer: otherLayer, modFactor: r.modFactor };

      if (r.modFactor > 0.25) ag.push(entry);
      else if (r.modFactor < -0.25) an.push(entry);
      else st.push(entry);
    }

    ag.sort((a, b) => b.modFactor - a.modFactor);
    an.sort((a, b) => a.modFactor - b.modFactor);

    return { agonists: ag, antagonists: an, stabilizers: st, related: rel };
  }, [interactions, chemicals, selectedChemical]);

  // ── View 1: Neural Network (parallel coordinates) ──────────────────────

  const networkOptions = useMemo((): Highcharts.Options | null => {
    if (!interactions || !chemicals) return null;

    const chemMap = new Map(chemicals.map((c) => [c.key, c]));
    const selectedLabel = chemMap.get(selectedChemical)?.label ?? selectedChemical;
    const selectedLayer = (chemMap.get(selectedChemical)?.layer ?? "neurotransmitter") as keyof typeof NEON_LAYER_COLORS;

    // Merge stabilizers into agonists/antagonists for network display
    const topNodes = [...agonists, ...stabilizers.filter((_, i) => i % 2 === 0)];
    const bottomNodes = [...antagonists, ...stabilizers.filter((_, i) => i % 2 === 1)];

    const layers = [
      { label: "Agonists", chemicals: topNodes },
      { label: selectedLabel, chemicals: [{ key: selectedChemical, label: selectedLabel, layer: chemMap.get(selectedChemical)?.layer ?? "neurotransmitter", modFactor: 0 }] },
      { label: "Antagonists", chemicals: bottomNodes },
    ];

    const nodeKeyMap: string[][] = [
      topNodes.map((a) => a.key),
      [selectedChemical],
      bottomNodes.map((a) => a.key),
    ];

    const series: Highcharts.SeriesLineOptions[] = [];

    for (let i = 0; i < topNodes.length; i++) {
      const node = topNodes[i];
      const nodeLayer = node.layer as keyof typeof NEON_LAYER_COLORS;
      series.push({
        type: "line" as const,
        data: [i, 0, null],
        color: interactionColor(node.modFactor),
        lineWidth: 0.8 + Math.abs(node.modFactor) * 1.5,
        marker: {
          enabled: true,
          symbol: "circle",
          radius: 6 + getAvgLevel(node.key) * 2.5,
          fillColor: NEON_BG,
          lineWidth: 2.5,
          lineColor: NEON_LAYER_COLORS[nodeLayer] ?? "#7c6cff",
          states: { hover: { lineColor: "#ffffff", lineWidthPlus: 1 } },
        },
        states: {
          inactive: { enabled: false },
          hover: { lineWidthPlus: 0, lineColor: interactionColor(node.modFactor) },
        },
        custom: { chemKeys: nodeKeyMap },
      });
    }

    for (let i = 0; i < bottomNodes.length; i++) {
      const node = bottomNodes[i];
      const nodeLayer = node.layer as keyof typeof NEON_LAYER_COLORS;
      series.push({
        type: "line" as const,
        data: [null, 0, i],
        color: interactionColor(node.modFactor),
        lineWidth: 0.8 + Math.abs(node.modFactor) * 1.5,
        marker: {
          enabled: true,
          symbol: "circle",
          radius: 6 + getAvgLevel(node.key) * 2.5,
          fillColor: NEON_BG,
          lineWidth: 2.5,
          lineColor: NEON_LAYER_COLORS[nodeLayer] ?? "#7c6cff",
          states: { hover: { lineColor: "#ffffff", lineWidthPlus: 1 } },
        },
        states: {
          inactive: { enabled: false },
          hover: { lineWidthPlus: 0, lineColor: interactionColor(node.modFactor) },
        },
        custom: { chemKeys: nodeKeyMap },
      });
    }

    if (topNodes.length === 0 && bottomNodes.length === 0) {
      series.push({
        type: "line" as const,
        data: [null, 0, null],
        color: "transparent",
        marker: {
          enabled: true, symbol: "circle", radius: 14,
          fillColor: NEON_BG, lineWidth: 3,
          lineColor: NEON_LAYER_COLORS[selectedLayer],
        },
        custom: { chemKeys: nodeKeyMap },
      });
    }

    return {
      chart: {
        type: "line",
        parallelCoordinates: true,
        inverted: true,
        backgroundColor: NEON_BG,
        height: 480,
        style: { fontFamily: "inherit" },
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      tooltip: {
        stickOnContact: true,
        backgroundColor: "rgba(10, 10, 26, 0.95)",
        borderColor: "rgba(100, 100, 255, 0.3)",
        style: { color: NEON_TEXT },
        formatter(this: Highcharts.TooltipFormatterContextObject) {
          const lIdx = this.point.x;
          const nIdx = this.point.y;
          if (lIdx == null || nIdx == null) return false;
          const chem = layers[lIdx]?.chemicals[nIdx];
          if (!chem) return false;
          const avgLvl = getAvgLevel(chem.key).toFixed(1);
          const typeLabel = lIdx === 1 ? "Selected" : interactionLabel(chem.modFactor);
          const color = lIdx === 1 ? NEON_LAYER_COLORS[selectedLayer] : interactionColor(chem.modFactor);
          return `<span style="color:${color}">●</span> <b>${chem.label}</b><br/>Level: <b>${avgLvl}</b><br/>Type: <b>${typeLabel}</b>${chem.modFactor !== 0 ? ` (${chem.modFactor > 0 ? "+" : ""}${chem.modFactor.toFixed(1)})` : ""}`;
        },
      },
      plotOptions: {
        line: {
          lineWidth: 0.8,
          marker: {
            symbol: "circle", enabled: true, radius: 10,
            fillColor: NEON_BG, lineWidth: 2.5,
            lineColor: NEON_LAYER_COLORS[selectedLayer],
            states: { hover: { lineColor: "#ffffff", lineWidthPlus: 1 } },
          },
          states: { inactive: { enabled: false }, hover: { lineWidthPlus: 0 } },
          point: {
            events: {
              click(this: Highcharts.Point) {
                const lIdx = this.x;
                const nIdx = this.y;
                if (lIdx == null || nIdx == null) return;
                const keys = (this.series.options as { custom?: { chemKeys: string[][] } }).custom?.chemKeys;
                const chemKey = keys?.[lIdx]?.[nIdx];
                if (chemKey && chemKey !== selectedChemical) setSelectedChemical(chemKey);
              },
            },
          },
        },
      },
      xAxis: {
        categories: layers.map((l) => l.label),
        labels: { style: { color: NEON_TEXT, fontSize: "11px", fontWeight: "600" } },
        lineColor: "transparent",
        gridLineColor: "rgba(100, 100, 255, 0.06)",
      },
      yAxis: layers.map((layer) => ({
        type: "category" as const,
        visible: false,
        categories: layer.chemicals.map((c) => c.label),
      })),
      series,
    };
  }, [interactions, chemicals, selectedChemical, agonists, antagonists, stabilizers, getAvgLevel]);

  // ── View 2: Radial Bar (inverted polar column) ─────────────────────────

  const radialOptions = useMemo((): Highcharts.Options | null => {
    if (!interactions || !chemicals) return null;

    const allRelated = [...agonists, ...stabilizers, ...antagonists];
    if (allRelated.length === 0) return null;

    const categories = allRelated.map((r) => r.label);
    const agonistData = allRelated.map((r) => r.modFactor > 0.25 ? Math.abs(r.modFactor) * getAvgLevel(r.key) : 0);
    const stabilizerData = allRelated.map((r) => Math.abs(r.modFactor) <= 0.25 ? getAvgLevel(r.key) : 0);
    const antagonistData = allRelated.map((r) => r.modFactor < -0.25 ? Math.abs(r.modFactor) * getAvgLevel(r.key) : 0);

    const selectedLabel = chemicals.find((c) => c.key === selectedChemical)?.label ?? selectedChemical;

    return {
      colors: ["#00ff88", "#00ccff", "#ff3366"],
      chart: {
        type: "column",
        inverted: true,
        polar: true,
        backgroundColor: NEON_BG,
        height: 480,
        style: { fontFamily: "inherit" },
      },
      title: {
        text: selectedLabel,
        style: { color: NEON_TEXT, fontSize: "14px", fontWeight: "600" },
      },
      credits: { enabled: false },
      legend: { enabled: false },
      tooltip: {
        outside: true,
        backgroundColor: "rgba(10, 10, 26, 0.95)",
        borderColor: "rgba(100, 100, 255, 0.3)",
        style: { color: NEON_TEXT },
      },
      pane: {
        size: "85%",
        innerSize: "20%",
        endAngle: 270,
      },
      xAxis: {
        tickInterval: 1,
        labels: {
          align: "right",
          allowOverlap: true,
          step: 1,
          y: 3,
          style: { fontSize: "10px", color: NEON_TEXT },
        },
        lineWidth: 0,
        gridLineWidth: 0,
        categories,
      },
      yAxis: {
        lineWidth: 0,
        tickInterval: 1,
        reversedStacks: false,
        endOnTick: true,
        showLastLabel: true,
        gridLineWidth: 0,
        labels: { style: { color: NEON_TEXT, fontSize: "8px" } },
      },
      plotOptions: {
        column: {
          stacking: "normal",
          borderWidth: 0,
          pointPadding: 0,
          groupPadding: 0.15,
          borderRadius: { radius: "50%", where: "all" } as unknown as number,
          point: {
            events: {
              click(this: Highcharts.Point) {
                const idx = this.index;
                const chem = allRelated[idx];
                if (chem && chem.key !== selectedChemical) setSelectedChemical(chem.key);
              },
            },
          },
        },
      },
      series: [
        { type: "column" as const, name: "Agonist", data: agonistData },
        { type: "column" as const, name: "Stabilizer", data: stabilizerData },
        { type: "column" as const, name: "Antagonist", data: antagonistData },
      ],
    };
  }, [interactions, chemicals, selectedChemical, agonists, antagonists, stabilizers, getAvgLevel]);

  // ── Chemical selector ───────────────────────────────────────────────────

  const chemicalOptions = useMemo(() => {
    if (!chemicals) return [];
    return chemicals.map((c) => ({ key: c.key, label: c.label, layer: c.layer }));
  }, [chemicals]);

  const loading = !interactions || !chemicals;

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        background: "linear-gradient(135deg, #0a0a1a, #0d1025)",
        borderColor: "rgba(100, 100, 255, 0.15)",
        boxShadow: "0 0 20px rgba(100, 100, 255, 0.05)",
      }}
    >
      {/* Header + Controls */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: NEON_TEXT }}>
          Chemical Network
        </h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded overflow-hidden border" style={{ borderColor: "rgba(100, 100, 255, 0.2)" }}>
            {(["network", "radial"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-2 py-0.5 text-[10px] transition-colors"
                style={{
                  color: view === v ? NEON_BG : NEON_TEXT,
                  backgroundColor: view === v ? "#7c6cff" : "transparent",
                }}
              >
                {v === "network" ? "Network" : "Radial"}
              </button>
            ))}
          </div>
          {/* Chemical selector */}
          <select
            value={selectedChemical}
            onChange={(e) => setSelectedChemical(e.target.value)}
            className="px-2 py-0.5 text-[10px] rounded border appearance-none cursor-pointer"
            style={{
              color: NEON_TEXT,
              backgroundColor: "rgba(100, 100, 255, 0.08)",
              borderColor: "rgba(100, 100, 255, 0.2)",
            }}
          >
            {chemicalOptions.map((c) => (
              <option key={c.key} value={c.key} style={{ backgroundColor: NEON_BG }}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-[480px]">
          <p className="text-xs" style={{ color: NEON_TEXT }}>Loading chemical network...</p>
        </div>
      ) : view === "network" && networkOptions ? (
        <HighchartsReact highcharts={Highcharts} options={networkOptions} />
      ) : view === "radial" && radialOptions ? (
        <HighchartsReact highcharts={Highcharts} options={radialOptions} />
      ) : null}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[9px]" style={{ color: "rgba(224, 224, 255, 0.5)" }}>
        <span><span style={{ color: "#00ff88" }}>●</span> Agonist</span>
        <span><span style={{ color: "#00ccff" }}>●</span> Stabilizer</span>
        <span><span style={{ color: "#ff3366" }}>●</span> Antagonist</span>
        <span className="ml-auto flex items-center gap-2">
          <span style={{ color: NEON_LAYER_COLORS.neurotransmitter }}>●</span> NT
          <span style={{ color: NEON_LAYER_COLORS.hormone }}>●</span> H
          <span style={{ color: NEON_LAYER_COLORS.peptide }}>●</span> P
        </span>
      </div>
    </div>
  );
}
