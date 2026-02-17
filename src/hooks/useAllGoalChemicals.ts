import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { DimensionScore } from "../types/api";
import { GOALS, type GoalDefinition } from "../data/goals";

export interface GoalChemicalLink {
  goalId: string;
  chemicalKey: string;
  weight: number; // positive = driver, negative = inhibitor
}

export interface GoalChemicalsMap {
  links: GoalChemicalLink[];
  goalDrivers: Map<string, string[]>; // goalId → top 5 chemical keys
  goalInhibitors: Map<string, string[]>; // goalId → bottom 5 chemical keys
}

export function useAllGoalChemicals(
  personDimensions: DimensionScore[],
): GoalChemicalsMap {
  const { data: masterDimensions } = useQuery({
    queryKey: ["dimensions-master"],
    queryFn: () => api.dimensions.list(),
    staleTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    const empty: GoalChemicalsMap = {
      links: [],
      goalDrivers: new Map(),
      goalInhibitors: new Map(),
    };

    if (!masterDimensions || personDimensions.length === 0) return empty;

    const scoreMap = new Map(personDimensions.map((d) => [d.name, d.score]));
    const links: GoalChemicalLink[] = [];
    const goalDrivers = new Map<string, string[]>();
    const goalInhibitors = new Map<string, string[]>();

    for (const goal of GOALS) {
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

      const topDrivers = sorted.slice(0, 5).map((d) => d.chemicalKey);
      const topInhibitors = sorted.slice(-5).map((d) => d.chemicalKey);

      goalDrivers.set(goal.id, topDrivers);
      goalInhibitors.set(goal.id, topInhibitors);

      // Create links for drivers (positive weight) and inhibitors (negative weight)
      for (const d of sorted.slice(0, 5)) {
        links.push({
          goalId: goal.id,
          chemicalKey: d.chemicalKey,
          weight: d.aggregateWeight,
        });
      }
      for (const d of sorted.slice(-3)) {
        links.push({
          goalId: goal.id,
          chemicalKey: d.chemicalKey,
          weight: d.aggregateWeight,
        });
      }
    }

    return { links, goalDrivers, goalInhibitors };
  }, [masterDimensions, personDimensions]);
}
