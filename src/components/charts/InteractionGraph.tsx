import { useMemo } from "react";
import type { DimensionScore, ShadowMatrixResponse } from "../../types/api";
import { CHEMICALS, LAYER_COLORS, LAYER_LABELS } from "../../data/chemicals";
import { levelToColor } from "../../data/levelColors";
import { useHighlight } from "../../contexts/HighlightContext";

interface Props {
  dimensions: DimensionScore[];
  matrixData: ShadowMatrixResponse | undefined;
}

interface ChemicalFact {
  key: string;
  label: string;
  layer: string;
  entryCount: number;
  avgLevel: number;
  topDimension: string;
  topLevel: number;
  bottomDimension: string;
  bottomLevel: number;
  dimCount: number;
  synergies: string[];
  conflicts: string[];
  fact: string;
}

const LAYERS = ["neurotransmitter", "hormone", "peptide"] as const;

function deriveFact(chem: Omit<ChemicalFact, "fact">): string {
  const { label, avgLevel, topDimension, topLevel, bottomDimension, bottomLevel, dimCount, synergies, conflicts, entryCount } = chem;

  // Activation intensity
  const intensity = avgLevel >= 4.0 ? "highly active" : avgLevel >= 3.5 ? "moderately active" : avgLevel >= 3.0 ? "baseline" : "subdued";

  // Build fact
  const parts: string[] = [];

  // Core pattern
  if (topLevel - bottomLevel >= 1.5) {
    parts.push(`Strongest in ${topDimension} (L${topLevel.toFixed(1)}), weakest in ${bottomDimension} (L${bottomLevel.toFixed(1)})`);
  } else if (dimCount > 1) {
    parts.push(`${intensity} across ${dimCount} dimensions, peaks at ${topDimension}`);
  } else {
    parts.push(`Only active in ${topDimension} (L${topLevel.toFixed(1)})`);
  }

  // Interaction note
  if (synergies.length > 0 && conflicts.length === 0) {
    parts.push(`Works with ${synergies.slice(0, 2).join(", ")}`);
  } else if (conflicts.length > 0 && synergies.length === 0) {
    parts.push(`Opposes ${conflicts.slice(0, 2).join(", ")}`);
  } else if (synergies.length > 0 && conflicts.length > 0) {
    parts.push(`Synergizes with ${synergies[0]}, conflicts with ${conflicts[0]}`);
  }

  return parts.join(". ") + ".";
}

export default function InteractionGraph({ dimensions, matrixData }: Props) {
  const { highlight, setHighlight } = useHighlight();

  const layerGroups = useMemo(() => {
    // Build circuit edge data
    const edgeMap = new Map<string, { sum: number; count: number; relationship: string }>();
    for (const dim of dimensions) {
      if (!dim.circuit?.edges) continue;
      for (const edge of dim.circuit.edges) {
        const key = [edge.chemicalA, edge.chemicalB].sort().join("|");
        const existing = edgeMap.get(key);
        if (existing) {
          existing.sum += edge.correlation;
          existing.count += 1;
        } else {
          edgeMap.set(key, { sum: edge.correlation, count: 1, relationship: edge.relationship });
        }
      }
    }

    // Per-chemical synergies/conflicts
    const synergiesMap = new Map<string, string[]>();
    const conflictsMap = new Map<string, string[]>();
    for (const [key, val] of edgeMap) {
      const [a, b] = key.split("|");
      const avgCorr = val.sum / val.count;
      const aLabel = CHEMICALS.find((c) => c.key === a)?.label ?? a;
      const bLabel = CHEMICALS.find((c) => c.key === b)?.label ?? b;
      if (avgCorr > 0.3) {
        synergiesMap.set(a, [...(synergiesMap.get(a) ?? []), bLabel]);
        synergiesMap.set(b, [...(synergiesMap.get(b) ?? []), aLabel]);
      } else if (avgCorr < -0.3) {
        conflictsMap.set(a, [...(conflictsMap.get(a) ?? []), bLabel]);
        conflictsMap.set(b, [...(conflictsMap.get(b) ?? []), aLabel]);
      }
    }

    // Build per-chemical facts from shadow matrix
    const chemFacts = new Map<string, ChemicalFact>();
    if (matrixData?.cells) {
      const byChemical = new Map<string, typeof matrixData.cells>();
      for (const cell of matrixData.cells) {
        const list = byChemical.get(cell.chemical) ?? [];
        list.push(cell);
        byChemical.set(cell.chemical, list);
      }

      for (const [chemKey, cells] of byChemical) {
        const meta = CHEMICALS.find((c) => c.key === chemKey);
        if (!meta) continue;

        const sorted = [...cells].sort((a, b) => b.shadowLevel - a.shadowLevel);
        const avgLevel = cells.reduce((s, c) => s + c.shadowLevel, 0) / cells.length;
        const totalEntries = cells.reduce((s, c) => s + c.entryCount, 0);

        const base = {
          key: chemKey,
          label: meta.label,
          layer: meta.layer,
          entryCount: totalEntries,
          avgLevel,
          topDimension: sorted[0].dimension,
          topLevel: sorted[0].shadowLevel,
          bottomDimension: sorted[sorted.length - 1].dimension,
          bottomLevel: sorted[sorted.length - 1].shadowLevel,
          dimCount: cells.length,
          synergies: synergiesMap.get(chemKey) ?? [],
          conflicts: conflictsMap.get(chemKey) ?? [],
        };

        chemFacts.set(chemKey, { ...base, fact: deriveFact(base) });
      }
    }

    // Group by layer
    const groups = LAYERS.map((layer) => {
      const chemicals = CHEMICALS.filter((c) => c.layer === layer)
        .map((c) => chemFacts.get(c.key))
        .filter((f): f is ChemicalFact => f !== undefined)
        .sort((a, b) => b.avgLevel - a.avgLevel);
      return { layer, chemicals };
    }).filter((g) => g.chemicals.length > 0);

    return groups;
  }, [dimensions, matrixData]);

  if (layerGroups.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-sm font-semibold mb-2">Chemical Profile</h2>
        <p className="text-xs text-gray-500">No chemical data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <h2 className="text-sm font-semibold mb-3">Chemical Profile</h2>
      <div className="space-y-4">
        {layerGroups.map(({ layer, chemicals }) => {
          const layerColor = LAYER_COLORS[layer as keyof typeof LAYER_COLORS];
          return (
            <div key={layer}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: layerColor }}
                />
                <span className="text-xs font-medium" style={{ color: layerColor }}>
                  {LAYER_LABELS[layer] ?? layer}
                </span>
                <span className="text-[10px] text-gray-600">
                  {chemicals.length} active
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {chemicals.map((chem) => {
                  const isSelected = highlight?.chemical === chem.key;
                  return (
                    <div
                      key={chem.key}
                      className={`p-2.5 bg-gray-900 rounded border cursor-pointer transition-colors ${
                        isSelected
                          ? "border-gray-500 bg-gray-800"
                          : "border-gray-700/50 hover:border-gray-600"
                      }`}
                      onClick={() => setHighlight({ chemical: chem.key, source: "chart" })}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-medium"
                            style={{ color: layerColor }}
                          >
                            {chem.label}
                          </span>
                          <span
                            className="text-[10px] px-1 rounded"
                            style={{
                              color: levelToColor(chem.avgLevel),
                              backgroundColor: levelToColor(chem.avgLevel) + "15",
                            }}
                          >
                            L{chem.avgLevel.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-600">
                          <span>{chem.dimCount} dims</span>
                          <span>{chem.entryCount} entries</span>
                        </div>
                      </div>
                      {/* Level bar */}
                      <div className="h-1 bg-gray-800 rounded-full mb-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${((chem.avgLevel - 1) / 4) * 100}%`,
                            backgroundColor: levelToColor(chem.avgLevel),
                            opacity: 0.7,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        {chem.fact}
                      </p>
                      {(chem.synergies.length > 0 || chem.conflicts.length > 0) && (
                        <div className="flex gap-3 mt-1 text-[9px]">
                          {chem.synergies.length > 0 && (
                            <span className="text-green-600">
                              + {chem.synergies.slice(0, 3).join(", ")}
                            </span>
                          )}
                          {chem.conflicts.length > 0 && (
                            <span className="text-red-500">
                              - {chem.conflicts.slice(0, 3).join(", ")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
