import { useMemo } from "react";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { api } from "../api/client";
import type { DimensionScore } from "../types/api";
import { useHighlight } from "../contexts/HighlightContext";

interface Props {
  person: string;
  dimensions: DimensionScore[];
}

function generateSuggestedQuestions(dims: DimensionScore[]): string[] {
  if (dims.length === 0) return [];
  const questions: string[] = [];

  const lowestConf = [...dims].sort((a, b) => a.confidence - b.confidence)[0];
  if (lowestConf && lowestConf.confidence < 0.7) {
    questions.push(`What drives their ${lowestConf.name}? (low confidence)`);
  }

  const withTrajectory = dims.filter((d) => d.trajectory && Math.abs(d.trajectory.slope) > 0.005);
  if (withTrajectory.length > 0) {
    const fastest = withTrajectory.sort(
      (a, b) => Math.abs(b.trajectory!.slope) - Math.abs(a.trajectory!.slope)
    )[0];
    const dir = fastest.trajectory!.slope > 0 ? "rising" : "declining";
    questions.push(`Their ${fastest.name} is ${dir} - what's changing?`);
  }

  const mostEvidence = [...dims].sort((a, b) => b.evidenceCount - a.evidenceCount)[0];
  if (mostEvidence && mostEvidence.evidenceCount > 5) {
    questions.push(`Tell me about their ${mostEvidence.name} (${mostEvidence.evidenceCount} data points)`);
  }

  const conflicted = dims.find((d) => d.circuit?.pattern?.includes("Conflicted"));
  if (conflicted) {
    questions.push(`Their ${conflicted.name} shows conflicting signals - why?`);
  }

  const highest = [...dims].sort((a, b) => b.score - a.score)[0];
  if (highest) {
    questions.push(`What makes their ${highest.name} so strong?`);
  }

  return questions.slice(0, 4);
}

export default function ProfileChat({ person, dimensions }: Props) {
  const { setHighlight } = useHighlight();

  const suggestions = useMemo(() => {
    const qs = generateSuggestedQuestions(dimensions);
    return qs.map((q) => ({ title: q, message: q }));
  }, [dimensions]);

  // Make dimension names available so the AI can reference them
  useCopilotReadable({
    description: `Available dimension names for ${person} that can be highlighted on charts`,
    value: dimensions.map((d) => d.name),
  }, [dimensions]);

  // Frontend action: analyze a chat message for this person
  useCopilotAction({
    name: "analyze_chat",
    description: `Analyze a chat/conversation message to update ${person}'s biochemical profile. Use this when the user provides a conversation excerpt or message to analyze.`,
    parameters: [
      { name: "text", type: "string", description: "The chat message text to analyze", required: true },
      { name: "relationship", type: "string", description: "Relationship type (e.g. 'colleague', 'friend')", required: false },
      { name: "save", type: "boolean", description: "Whether to save to profile (default true)", required: false },
    ],
    handler: async ({ text, relationship, save }) => {
      const result = await api.analyze.chat({
        person,
        text,
        relationship,
        save: save ?? true,
      });
      return JSON.stringify({
        decisions: result.decisions,
        synthesis: result.synthesis,
        suggestedResponse: result.suggestedResponse,
      });
    },
  }, [person]);

  // Frontend action: analyze work-related text
  useCopilotAction({
    name: "analyze_work",
    description: `Analyze work-related text (emails, reports, feedback) to update ${person}'s profile.`,
    parameters: [
      { name: "text", type: "string", description: "The work text to analyze", required: true },
      { name: "relationship", type: "string", description: "Work relationship type", required: false },
      { name: "save", type: "boolean", description: "Whether to save to profile (default true)", required: false },
    ],
    handler: async ({ text, relationship, save }) => {
      const result = await api.analyze.work({
        person,
        text,
        relationship,
        save: save ?? true,
      });
      return JSON.stringify({
        decisionsCount: result.decisionsCount,
        decisions: result.decisions,
        synthesis: result.synthesis,
      });
    },
  }, [person]);

  // Frontend action: analyze journal entry
  useCopilotAction({
    name: "analyze_journal",
    description: `Analyze a personal journal entry to update ${person}'s profile.`,
    parameters: [
      { name: "text", type: "string", description: "The journal entry text to analyze", required: true },
      { name: "save", type: "boolean", description: "Whether to save to profile (default true)", required: false },
    ],
    handler: async ({ text, save }) => {
      const result = await api.analyze.journal({
        person,
        text,
        save: save ?? true,
      });
      return JSON.stringify({
        decisionsCount: result.decisionsCount,
        decisions: result.decisions,
        synthesis: result.synthesis,
      });
    },
  }, [person]);

  // Frontend action: highlight a dimension or chemical on the charts
  useCopilotAction({
    name: "highlight_dimension",
    description: "Highlight a dimension or chemical on the profile charts to draw the user's attention to it.",
    parameters: [
      { name: "dimension", type: "string", description: "The dimension name to highlight", required: false },
      { name: "chemical", type: "string", description: "The chemical name to highlight", required: false },
    ],
    handler: async ({ dimension, chemical }) => {
      setHighlight({ dimension, chemical, source: "chat" });
      return `Highlighted ${dimension ?? chemical ?? "nothing"} on the charts.`;
    },
  }, [setHighlight]);

  return (
    <div
      className="copilot-profile-chat flex flex-col bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
      style={{ height: 480 }}
    >
      <CopilotChat
        className="h-full"
        instructions={[
          `You are an expert analyst for ${person}'s biochemical personality profile in the NeuroReact system.`,
          `The user is viewing ${person}'s profile page with dimension charts, archetype cards, trajectory sparklines, chemical sankey diagrams, and seam cards.`,
          `You have access to their full dimension scores, profile data, and shadow matrix via context.`,
          `You can run analysis on new text (chat, work, journal) using the analyze_* actions — use analyze_chat for conversation messages, analyze_work for emails/reports, analyze_journal for personal reflections.`,
          `You can highlight dimensions/chemicals on the charts using highlight_dimension.`,
          `You also have access to MCP tools from the backend for deeper queries.`,
          `Be concise but insightful. Reference specific dimension scores, trajectories, and patterns when answering.`,
        ].join("\n")}
        labels={{
          title: `Ask about ${person}`,
          placeholder: "Ask about their profile...",
          initial: "Ask questions about this person's biochemical profile, run analysis on new text, or explore their dimensions.",
        }}
        suggestions={suggestions}
      />
    </div>
  );
}
