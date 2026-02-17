import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { GoalDefinition } from "../../data/goals";
import { GOALS } from "../../data/goals";
import type { DimensionScore } from "../../types/api";
import { useGoalChemicals } from "../../hooks/useGoalChemicals";
import { getChemicalMeta, interactionLabel } from "../../data/chemicals";
import GoalTree from "./GoalTree";

interface Props {
  person: string;
  mode: "work" | "private";
  dimensions: DimensionScore[];
  onChatQuestion: (question: string) => void;
}

export default function GoalExplorer({
  dimensions,
  onChatQuestion,
}: Props) {
  const [selectedGoal, setSelectedGoal] = useState<GoalDefinition | null>(null);

  const { data: chemicals = [] } = useQuery({
    queryKey: ["chemicals"],
    queryFn: () => api.chemicals.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["chemical-interactions"],
    queryFn: () => api.chemicalInteractions.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { drivers } = useGoalChemicals(selectedGoal, dimensions);

  const handleChemicalClick = useCallback(
    (chemicalKey: string, parentKey: string | null, goalName: string) => {
      const meta = getChemicalMeta(chemicalKey);
      const chemLabel = meta?.label ?? chemicalKey;

      if (parentKey) {
        // Clicked a child node (agonist/antagonist of a driver)
        const parentMeta = getChemicalMeta(parentKey);
        const parentLabel = parentMeta?.label ?? parentKey;
        // Find the interaction to get the relationship type
        const interaction = interactions.find(
          (i) =>
            (i.sourceKey === chemicalKey && i.targetKey === parentKey) ||
            (i.targetKey === chemicalKey && i.sourceKey === parentKey),
        );
        const relLabel = interaction
          ? interactionLabel(interaction.modFactor).toLowerCase()
          : "relationship";

        const question = `How does ${chemLabel}'s ${relLabel} interaction with ${parentLabel} affect my ${goalName}? What actions can optimize this pathway?`;
        onChatQuestion(question);
      } else {
        // Clicked a driver node
        const question = `How does ${chemLabel} influence ${goalName}? What can I do to optimize this chemical for better ${goalName.toLowerCase()} outcomes?`;
        onChatQuestion(question);
      }
    },
    [onChatQuestion, interactions],
  );

  return (
    <div
      className="rounded-lg border border-gray-700/50 bg-[#0a0a1a] overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0a0a1a 0%, #0d1025 100%)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-700/40 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
          Goal Explorer
        </h3>
        {selectedGoal && (
          <span className="text-[10px] text-indigo-400">
            {selectedGoal.icon} {selectedGoal.name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {selectedGoal ? (
          <GoalTree
            goal={selectedGoal}
            drivers={drivers}
            chemicals={chemicals}
            interactions={interactions}
            onChemicalClick={handleChemicalClick}
            onBack={() => setSelectedGoal(null)}
          />
        ) : (
          <GoalCardGrid onSelectGoal={setSelectedGoal} />
        )}
      </div>
    </div>
  );
}

/** Compact closed-card grid for goal selection */
function GoalCardGrid({
  onSelectGoal,
}: {
  onSelectGoal: (goal: GoalDefinition) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {GOALS.map((goal) => (
        <button
          key={goal.id}
          onClick={() => onSelectGoal(goal)}
          className="group text-left rounded-lg border border-gray-700/50 bg-[#0a0a1a] hover:border-indigo-500/40 hover:bg-[#0d0d1f] px-4 py-4 transition-all duration-200"
        >
          <div className="text-2xl mb-2">{goal.icon}</div>
          <div className="text-xs font-semibold text-gray-300 group-hover:text-indigo-300 mb-1">
            {goal.name}
          </div>
          <p className="text-[9px] text-gray-500 leading-relaxed line-clamp-2">
            {goal.description}
          </p>
        </button>
      ))}
    </div>
  );
}
