import type { DimensionScore } from "../../types/api";

interface Props {
  dimensions: DimensionScore[];
}

interface ArchetypeDef {
  name: string;
  icon: string;
  color: string;
  criteria: { dimension: string; high: boolean }[];
}

const ARCHETYPES: ArchetypeDef[] = [
  {
    name: "The Strategist",
    icon: "\u265F",
    color: "#818cf8",
    criteria: [
      { dimension: "Strategic Thinking", high: true },
      { dimension: "Problem Solving", high: true },
      { dimension: "Emotional Depth", high: false },
    ],
  },
  {
    name: "The Caretaker",
    icon: "\u2764",
    color: "#f472b6",
    criteria: [
      { dimension: "Team Orientation", high: true },
      { dimension: "Emotional Depth", high: true },
      { dimension: "Intimacy Capacity", high: true },
    ],
  },
  {
    name: "The Maverick",
    icon: "\u26A1",
    color: "#fbbf24",
    criteria: [
      { dimension: "Risk Tolerance", high: true },
      { dimension: "Competitive Drive", high: true },
      { dimension: "Persistence", high: false },
    ],
  },
  {
    name: "The Anchor",
    icon: "\u2693",
    color: "#34d399",
    criteria: [
      { dimension: "Inner Peace", high: true },
      { dimension: "Persistence", high: true },
      { dimension: "Emotional Regulation", high: true },
    ],
  },
  {
    name: "The Innovator",
    icon: "\uD83D\uDCA1",
    color: "#f97316",
    criteria: [
      { dimension: "Problem Solving", high: true },
      { dimension: "Risk Tolerance", high: true },
      { dimension: "Playfulness", high: true },
    ],
  },
  {
    name: "The Mediator",
    icon: "\u2696",
    color: "#a78bfa",
    criteria: [
      { dimension: "Sensitivity", high: true },
      { dimension: "Self-Awareness", high: true },
      { dimension: "Attachment Security", high: true },
    ],
  },
  {
    name: "The Driver",
    icon: "\uD83D\uDE80",
    color: "#ef4444",
    criteria: [
      { dimension: "Ambition", high: true },
      { dimension: "Competitive Drive", high: true },
      { dimension: "Stress Capacity", high: true },
    ],
  },
  {
    name: "The Sage",
    icon: "\uD83E\uDDD8",
    color: "#06b6d4",
    criteria: [
      { dimension: "Self-Awareness", high: true },
      { dimension: "Knowledge Transfer", high: true },
      { dimension: "Purpose & Meaning", high: true },
    ],
  },
];

function computeMatch(archetype: ArchetypeDef, scoreMap: Map<string, number>): number {
  let total = 0;
  let count = 0;

  for (const c of archetype.criteria) {
    const score = scoreMap.get(c.dimension);
    if (score === undefined) continue;
    count++;

    if (c.high) {
      // Higher is better match
      total += score;
    } else {
      // Lower is better match (invert: 100 - score)
      total += 100 - score;
    }
  }

  return count > 0 ? total / count : 0;
}

export default function ArchetypeCards({ dimensions }: Props) {
  if (dimensions.length === 0) return null;

  const scoreMap = new Map(dimensions.map((d) => [d.name, d.score]));

  const ranked = ARCHETYPES.map((a) => ({
    ...a,
    match: computeMatch(a, scoreMap),
  }))
    .sort((a, b) => b.match - a.match)
    .slice(0, 3);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <h2 className="text-sm font-semibold mb-3">Archetype Profile</h2>
      <div className="grid grid-cols-1 gap-3">
        {ranked.map((arch, i) => (
          <div
            key={arch.name}
            className="relative p-4 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
          >
            {i === 0 && (
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: arch.color }}
              />
            )}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{arch.icon}</span>
              <span className="text-sm font-semibold" style={{ color: arch.color }}>
                {arch.name}
              </span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>Match</span>
                <span>{Math.round(arch.match)}%</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(arch.match, 100)}%`,
                    backgroundColor: arch.color,
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
            <div className="text-[10px] text-gray-500">
              {arch.criteria.map((c) => (
                <span key={c.dimension} className="mr-1.5">
                  {c.high ? "\u2191" : "\u2193"} {c.dimension}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
