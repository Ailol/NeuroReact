import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { HighlightProvider } from "../contexts/HighlightContext";
import DimensionsDisplay from "../components/charts/DimensionsDisplay";
import DimensionSankey from "../components/charts/DimensionSankey";
import ArchetypeCards from "../components/charts/ArchetypeCards";
import TrajectorySparklines from "../components/charts/TrajectorySparklines";
import InteractionGraph from "../components/charts/InteractionGraph";
import SeamCards from "../components/charts/SeamCards";
import ProfileChat from "../components/ProfileChat";

function PersonDetailContent({ name }: { name: string }) {
  const [mode, setMode] = useState<"work" | "private">("work");
  const [selectedChemical, setSelectedChemical] = useState<string | undefined>();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", name],
    queryFn: () => api.persons.profile(name),
    enabled: !!name,
  });

  const dimsQuery = useQuery({
    queryKey: ["dimensions", name, mode],
    queryFn: () => api.persons.dimensions(name, mode),
    enabled: !!name,
    retry: false,
  });

  const { data: matrixData } = useQuery({
    queryKey: ["shadow-matrix", name, mode],
    queryFn: () => api.persons.shadowMatrix(name, mode),
    enabled: !!name,
    staleTime: 5 * 60 * 1000,
  });

  const allDimensions = [
    ...(dimsQuery.data?.behavioral ?? []),
    ...(dimsQuery.data?.personal ?? []),
  ];

  if (isLoading) return <p className="text-gray-500">Loading profile...</p>;

  return (
    <div>
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{profile?.person ?? name}</h1>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => setMode("work")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === "work"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              Work
            </button>
            <button
              onClick={() => setMode("private")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === "private"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              Private
            </button>
          </div>
        </div>
        {profile?.communicationStyle && (
          <span className="text-xs text-gray-500 max-w-md truncate">
            {profile.communicationStyle}
          </span>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left column: chart grid */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Row 1: Radar (left) + Archetypes stacked (right) */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3">
              <DimensionsDisplay person={name} mode={mode} />
            </div>
            <div className="col-span-2">
              <ArchetypeCards dimensions={allDimensions} />
            </div>
          </div>

          {/* Row 2: Trajectory — full width */}
          <TrajectorySparklines dimensions={allDimensions} />

          {/* Row 3: Chemical → Dimension (Sankey) — full width */}
          <DimensionSankey matrixData={matrixData} mode={mode} />

          {/* Row 4: Neurochemical Profile — full width */}
          <InteractionGraph dimensions={allDimensions} matrixData={matrixData} />
        </div>

        {/* Right column: Seam Cards + Chat */}
        <div
          className="w-[420px] flex-shrink-0 sticky top-4 self-start space-y-4"
          style={{ maxHeight: "calc(100vh - 2rem)", overflowY: "auto" }}
        >
          <SeamCards
            matrixData={matrixData}
            selectedChemical={selectedChemical}
          />
          <ProfileChat
            person={name}
            mode={mode}
            dimensions={allDimensions}
            profile={profile}
            matrixData={matrixData}
          />
        </div>
      </div>
    </div>
  );
}

export default function PersonDetailPage() {
  const { name } = useParams<{ name: string }>();

  if (!name) return null;

  return (
    <HighlightProvider>
      <PersonDetailContent name={name} />
    </HighlightProvider>
  );
}
