import { useState } from "react";
import type { DimensionScore } from "../../types/api";

interface Props {
  dimensions: DimensionScore[];
}

const DIRECTION_COLORS: Record<string, string> = {
  "Rising Sharply": "#22c55e",
  Rising: "#4ade80",
  Stable: "#6b7280",
  Declining: "#f87171",
  "Declining Sharply": "#ef4444",
};

const DIRECTION_ARROWS: Record<string, string> = {
  "Rising Sharply": "\u2191\u2191",
  Rising: "\u2191",
  Stable: "\u2192",
  Declining: "\u2193",
  "Declining Sharply": "\u2193\u2193",
};

const POSITIVE = new Set(["Rising Sharply", "Rising"]);
const NEGATIVE = new Set(["Declining Sharply", "Declining"]);

function TrendCard({ dim }: { dim: DimensionScore }) {
  const t = dim.trajectory!;
  const color = DIRECTION_COLORS[t.direction] ?? "#6b7280";
  const arrow = DIRECTION_ARROWS[t.direction] ?? "";
  const slopePerMonth = (t.slope * 30).toFixed(2);

  const minLevel = Math.min(t.earliestLevel, t.latestLevel);
  const maxLevel = Math.max(t.earliestLevel, t.latestLevel);
  const range = maxLevel - minLevel || 1;
  const y1 = 28 - ((t.earliestLevel - minLevel) / range) * 24;
  const y2 = 28 - ((t.latestLevel - minLevel) / range) * 24;

  return (
    <div className="p-3 bg-gray-900 rounded border border-gray-700 flex items-center gap-3">
      <svg width="48" height="32" className="flex-shrink-0">
        <line x1="4" y1={y1} x2="44" y2={y2} stroke={color} strokeWidth="2" />
        <circle cx="4" cy={y1} r="2.5" fill={color} />
        <circle cx="44" cy={y2} r="2.5" fill={color} />
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate">{dim.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-sm font-bold" style={{ color }}>
            {arrow}
          </span>
          <span className="text-[10px] text-gray-400">
            {t.direction} ({slopePerMonth}/mo)
          </span>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          R&sup2;: {t.r2.toFixed(2)} &middot; {t.dataPoints} pts &middot;{" "}
          {t.earliestLevel.toFixed(1)} &rarr; {t.latestLevel.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

export default function TrajectorySparklines({ dimensions }: Props) {
  const [view, setView] = useState<"top" | "rising" | "declining">("top");

  const withTrajectory = dimensions.filter(
    (d) => d.trajectory && d.trajectory.dataPoints >= 3
  );

  if (withTrajectory.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-sm font-semibold mb-1">Trajectory Trends</h2>
        <p className="text-xs text-gray-500">
          Not enough temporal data for trend analysis (need 3+ data points per
          dimension).
        </p>
      </div>
    );
  }

  const top6 = [...withTrajectory]
    .sort((a, b) => Math.abs(b.trajectory!.slope) - Math.abs(a.trajectory!.slope))
    .slice(0, 6);

  const positive = withTrajectory
    .filter((d) => POSITIVE.has(d.trajectory!.direction))
    .sort((a, b) => b.trajectory!.slope - a.trajectory!.slope)
    .slice(0, 6);

  const negative = withTrajectory
    .filter((d) => NEGATIVE.has(d.trajectory!.direction))
    .sort((a, b) => a.trajectory!.slope - b.trajectory!.slope)
    .slice(0, 6);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Trajectory Trends</h2>
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {(["top", "rising", "declining"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                view === v
                  ? "bg-gray-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {v === "top" ? "Top 6" : v === "rising" ? "Rising" : "Declining"}
            </button>
          ))}
        </div>
      </div>

      {view === "top" && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {top6.map((dim) => (
            <TrendCard key={dim.name} dim={dim} />
          ))}
        </div>
      )}

      {view === "rising" && (
        positive.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {positive.map((dim) => (
              <TrendCard key={dim.name} dim={dim} />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gray-600">No rising trends</p>
        )
      )}

      {view === "declining" && (
        negative.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {negative.map((dim) => (
              <TrendCard key={dim.name} dim={dim} />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gray-600">No declining trends</p>
        )
      )}
    </div>
  );
}
