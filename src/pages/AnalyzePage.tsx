import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { AnalysisDecision, ChatAnalyzeResponse, WorkAnalyzeResponse, JournalAnalyzeResponse } from "../types/api";

type Mode = "chat" | "work" | "journal";
type Result = ChatAnalyzeResponse | WorkAnalyzeResponse | JournalAnalyzeResponse;

export default function AnalyzePage() {
  const [mode, setMode] = useState<Mode>("chat");
  const [person, setPerson] = useState("");
  const [text, setText] = useState("");
  const [relationship, setRelationship] = useState("");
  const [projected, setProjected] = useState("");
  const [save, setSave] = useState(true);
  const [result, setResult] = useState<Result | null>(null);

  const { data: relationships } = useQuery({
    queryKey: ["relationships"],
    queryFn: () => api.relationships.list(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      switch (mode) {
        case "chat":
          return api.analyze.chat({
            person, text,
            relationship: relationship || undefined,
            projectedRelationship: projected || undefined,
            save,
          });
        case "work":
          return api.analyze.work({
            person, text,
            relationship: relationship || undefined,
            save,
          });
        case "journal":
          return api.analyze.journal({ person, text, save });
      }
    },
    onSuccess: (data) => setResult(data),
  });

  const tabs: { key: Mode; label: string }[] = [
    { key: "chat", label: "Chat" },
    { key: "work", label: "Work" },
    { key: "journal", label: "Journal" },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Analyze</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setMode(t.key); setResult(null); }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              mode === t.key
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="space-y-4 mb-6">
        <input
          type="text"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          placeholder="Person name"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />

        {mode !== "journal" && (
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Relationship (optional)</option>
            {relationships?.relationshipTypes.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        )}

        {mode === "chat" && (
          <select
            value={projected}
            onChange={(e) => setProjected(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Projected relationship (optional)</option>
            {relationships?.relationshipTypes.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            mode === "chat" ? "What they wrote to you..."
            : mode === "work" ? "CV text, email body, report, meeting notes..."
            : "Journal entry, diary text, personal reflection..."
          }
          rows={6}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-y"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={save}
              onChange={(e) => setSave(e.target.checked)}
              className="rounded"
            />
            Save to personality profile
          </label>

          <button
            onClick={() => mutation.mutate()}
            disabled={!person.trim() || !text.trim() || mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 py-2 rounded text-sm font-medium transition-colors"
          >
            {mutation.isPending ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {/* Results */}
      {mutation.error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-300 mb-4">
          {String(mutation.error)}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Results</h2>

          {/* Synthesis */}
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-2">Synthesis</div>
            <p className="text-sm whitespace-pre-wrap">{result.synthesis}</p>
          </div>

          {/* Chat-specific: suggested response */}
          {"suggestedResponse" in result && (
            <div className="p-4 bg-indigo-900/20 rounded-lg border border-indigo-800">
              <div className="text-sm text-indigo-400 mb-2">Suggested Response</div>
              <p className="text-sm whitespace-pre-wrap">{result.suggestedResponse}</p>
            </div>
          )}

          {/* Chat-specific: layer responses */}
          {"layerResponses" in result && Object.keys(result.layerResponses).length > 0 && (
            <div>
              <div className="text-sm text-gray-400 mb-2">Layer Responses</div>
              <div className="grid gap-2">
                {Object.entries(result.layerResponses).map(([layer, response]) => (
                  <div key={layer} className="p-3 bg-gray-800 rounded border border-gray-700">
                    <span className="text-xs font-mono text-indigo-400">{layer}</span>
                    <p className="text-sm text-gray-300 mt-1">{response}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decisions */}
          <div>
            <div className="text-sm text-gray-400 mb-2">
              Decisions ({result.decisions.length})
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {result.decisions.map((d: AnalysisDecision, i: number) => (
                <div key={i} className="flex gap-3 p-2 bg-gray-800 rounded text-sm">
                  <span className="font-mono text-indigo-400 w-28 shrink-0">{d.chemical}</span>
                  <span className="text-gray-300">{d.reasoning}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
