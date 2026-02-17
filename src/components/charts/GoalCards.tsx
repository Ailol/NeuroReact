import { useState } from "react";
import { GOALS, type GoalDefinition } from "../../data/goals";
import type { GoalChemicalRank } from "../../hooks/useGoalChemicals";

interface Props {
  selectedGoal: GoalDefinition | null;
  onSelectGoal: (goal: GoalDefinition | null) => void;
  drivers: GoalChemicalRank[];
  inhibitors: GoalChemicalRank[];
  chemicalLabels: Map<string, string>;
}

export default function GoalCards({
  selectedGoal,
  onSelectGoal,
  drivers,
  inhibitors,
  chemicalLabels,
}: Props) {
  const [hoveredGoal, setHoveredGoal] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 w-[200px] flex-shrink-0">
      {GOALS.map((goal) => {
        const isActive = selectedGoal?.id === goal.id;
        const isHovered = hoveredGoal === goal.id;

        return (
          <div key={goal.id} className="relative">
            <button
              onClick={() => onSelectGoal(isActive ? null : goal)}
              onMouseEnter={() => setHoveredGoal(goal.id)}
              onMouseLeave={() => setHoveredGoal(null)}
              className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all duration-200 ${
                isActive
                  ? "border-indigo-400/60 bg-gradient-to-br from-[#0d1025] to-[#12142a]"
                  : "border-gray-700/50 bg-[#0a0a1a] hover:border-gray-600/60 hover:bg-[#0d0d1f]"
              }`}
              style={
                isActive
                  ? {
                      boxShadow:
                        "0 0 12px rgba(99, 102, 241, 0.25), inset 0 0 8px rgba(99, 102, 241, 0.08)",
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{goal.icon}</span>
                <span
                  className={`text-xs font-semibold ${isActive ? "text-indigo-300" : "text-gray-300"}`}
                >
                  {goal.name}
                </span>
              </div>

              {/* Chemical pills — only show when this goal is active */}
              {isActive && drivers.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex flex-wrap gap-1">
                    {drivers.slice(0, 3).map((d) => (
                      <span
                        key={d.chemicalKey}
                        className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/30"
                      >
                        {chemicalLabels.get(d.chemicalKey) ?? d.chemicalKey}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {inhibitors.slice(0, 3).map((d) => (
                      <span
                        key={d.chemicalKey}
                        className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-red-900/30 text-red-300 border border-red-700/30"
                      >
                        {chemicalLabels.get(d.chemicalKey) ?? d.chemicalKey}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>

            {/* Hover tooltip */}
            {isHovered && !isActive && (
              <div
                className="absolute left-full top-0 ml-2 z-50 w-56 rounded-lg border border-gray-600/50 bg-[#0d0d1f] px-3 py-2 shadow-xl"
                style={{ pointerEvents: "none" }}
              >
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  {goal.description}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
