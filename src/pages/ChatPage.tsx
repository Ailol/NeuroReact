import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export default function ChatPage() {
  const { data: persons } = useQuery({
    queryKey: ["persons"],
    queryFn: () => api.persons.list(),
  });

  const { data: relationships } = useQuery({
    queryKey: ["relationships"],
    queryFn: () => api.relationships.list(),
  });

  // Give the AI awareness of all persons and relationships
  useCopilotReadable({
    description: "List of all persons tracked in NeuroReact",
    value: persons?.persons ?? [],
  }, [persons]);

  useCopilotReadable({
    description: "Available relationship types for analysis",
    value: relationships?.relationshipTypes ?? [],
  }, [relationships]);

  // Action: analyze chat text for any person
  useCopilotAction({
    name: "analyze_chat",
    description: "Analyze a chat/conversation message to update a person's biochemical profile.",
    parameters: [
      { name: "person", type: "string", description: "The person's name", required: true },
      { name: "text", type: "string", description: "The chat message text to analyze", required: true },
      { name: "relationship", type: "string", description: "Relationship type (e.g. 'colleague', 'friend')", required: false },
      { name: "save", type: "boolean", description: "Whether to save to profile (default true)", required: false },
    ],
    handler: async ({ person, text, relationship, save }) => {
      const result = await api.analyze.chat({ person, text, relationship, save: save ?? true });
      return JSON.stringify({
        person: result.person,
        decisions: result.decisions,
        synthesis: result.synthesis,
        suggestedResponse: result.suggestedResponse,
      });
    },
  });

  // Action: analyze work text for any person
  useCopilotAction({
    name: "analyze_work",
    description: "Analyze work-related text (emails, reports, feedback) to update a person's profile.",
    parameters: [
      { name: "person", type: "string", description: "The person's name", required: true },
      { name: "text", type: "string", description: "The work text to analyze", required: true },
      { name: "relationship", type: "string", description: "Work relationship type", required: false },
      { name: "save", type: "boolean", description: "Whether to save to profile (default true)", required: false },
    ],
    handler: async ({ person, text, relationship, save }) => {
      const result = await api.analyze.work({ person, text, relationship, save: save ?? true });
      return JSON.stringify({
        person: result.person,
        decisionsCount: result.decisionsCount,
        decisions: result.decisions,
        synthesis: result.synthesis,
      });
    },
  });

  // Action: analyze journal entry for any person
  useCopilotAction({
    name: "analyze_journal",
    description: "Analyze a personal journal entry to update a person's profile.",
    parameters: [
      { name: "person", type: "string", description: "The person's name", required: true },
      { name: "text", type: "string", description: "The journal entry text to analyze", required: true },
      { name: "save", type: "boolean", description: "Whether to save to profile (default true)", required: false },
    ],
    handler: async ({ person, text, save }) => {
      const result = await api.analyze.journal({ person, text, save: save ?? true });
      return JSON.stringify({
        person: result.person,
        decisionsCount: result.decisionsCount,
        decisions: result.decisions,
        synthesis: result.synthesis,
      });
    },
  });

  // Action: get a person's dimension scores
  useCopilotAction({
    name: "get_dimensions",
    description: "Fetch dimension scores for a person in work or private mode.",
    parameters: [
      { name: "person", type: "string", description: "The person's name", required: true },
      { name: "mode", type: "string", description: "'work' or 'private' (default 'work')", required: false },
    ],
    handler: async ({ person, mode }) => {
      const m = mode === "private" ? "private" : "work";
      const result = await api.persons.dimensions(person, m);
      const all = [...result.behavioral, ...result.personal];
      return JSON.stringify(
        all.map((d) => ({
          name: d.name,
          section: d.section,
          score: d.score,
          confidence: d.confidence,
          evidenceCount: d.evidenceCount,
          trajectory: d.trajectory
            ? { slope: d.trajectory.slope, direction: d.trajectory.direction }
            : null,
          circuitPattern: d.circuit?.pattern ?? null,
        }))
      );
    },
  });

  // Action: get a person's profile overview
  useCopilotAction({
    name: "get_profile",
    description: "Fetch a person's profile overview including communication style and chemical counts.",
    parameters: [
      { name: "person", type: "string", description: "The person's name", required: true },
    ],
    handler: async ({ person }) => {
      const result = await api.persons.profile(person);
      return JSON.stringify({
        person: result.person,
        communicationStyle: result.communicationStyle,
        chemicalCounts: result.chemicalCounts,
        profileEntries: result.profiles.length,
      });
    },
  });

  // Action: create a new person
  useCopilotAction({
    name: "create_person",
    description: "Create a new person to track in NeuroReact.",
    parameters: [
      { name: "name", type: "string", description: "The person's name", required: true },
    ],
    handler: async ({ name }) => {
      const result = await api.persons.create(name);
      return JSON.stringify(result);
    },
  });

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 6rem)" }}>
      <h1 className="text-2xl font-bold mb-4">Chat</h1>
      <div className="copilot-chat-page flex-1 min-h-0 rounded-lg border border-gray-700 overflow-hidden">
        <CopilotChat
          className="h-full"
          instructions={[
            "You are NeuroReact's AI assistant — an expert in biochemical personality profiling.",
            "You have access to all persons tracked in the system and can analyze new text, fetch profiles and dimensions, and create new persons.",
            "You also have access to MCP tools from the backend for deeper queries and orchestration.",
            "When analyzing text, always specify which person it's for.",
            "Be concise and insightful. Reference specific dimension scores and patterns when discussing a person.",
          ].join("\n")}
          labels={{
            title: "NeuroReact Chat",
            placeholder: "Ask about persons, analyze text, or explore profiles...",
            initial: "Ask me anything about the persons in NeuroReact. I can analyze conversations, look up profiles, fetch dimensions, and more.",
          }}
          suggestions={[
            { title: "List all persons", message: "Who are all the persons being tracked?" },
            { title: "Analyze a conversation", message: "I'd like to analyze a conversation for someone." },
            { title: "Compare dimensions", message: "Can you compare the dimension profiles of two people?" },
          ]}
        />
      </div>
    </div>
  );
}
