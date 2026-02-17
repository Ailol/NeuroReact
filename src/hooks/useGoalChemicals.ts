import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { DimensionScore } from "../types/api";
import type { GoalDefinition } from "../data/goals";

export interface GoalChemicalRank {
  chemicalKey: string;
  aggregateWeight: number;
}

export function useGoalChemicals(
  goal: GoalDefinition | null,
  personDimensions: DimensionScore[],
) {
  const { data: masterDimensions } = useQuery({
    queryKey: ["dimensions-master"],
    queryFn: () => api.dimensions.list(),
    staleTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    if (!goal || !masterDimensions || personDimensions.length === 0) {
      return { drivers: [] as GoalChemicalRank[], inhibitors: [] as GoalChemicalRank[], allRanked: [] as GoalChemicalRank[] };
    }

    const scoreMap = new Map(personDimensions.map((d) => [d.name, d.score]));
    const chemAgg = new Map<string, number>();

    for (const dimName of goal.dimensions) {
      const master = masterDimensions.find((m) => m.name === dimName);
      const personScore = scoreMap.get(dimName) ?? 0.5;
      if (!master) continue;

      for (const aff of master.affinities) {
        const prev = chemAgg.get(aff.chemicalKey) ?? 0;
        chemAgg.set(aff.chemicalKey, prev + aff.weight * personScore);
      }
    }

    const sorted = [...chemAgg.entries()]
      .map(([chemicalKey, aggregateWeight]) => ({ chemicalKey, aggregateWeight }))
      .sort((a, b) => b.aggregateWeight - a.aggregateWeight);

    return {
      drivers: sorted.slice(0, 5),
      inhibitors: sorted.slice(-5).reverse(),
      allRanked: sorted,
    };
  }, [goal, masterDimensions, personDimensions]);
}
