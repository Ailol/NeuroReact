import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { api } from "../api/client";
import type { DimensionScore, PersonProfileResponse, ShadowMatrixResponse } from "../types/api";
import { useHighlight } from "../contexts/HighlightContext";

interface Props {
  person: string;
  mode: "work" | "private";
  dimensions: DimensionScore[];
  profile: PersonProfileResponse | undefined;
  matrixData: ShadowMatrixResponse | undefined;
}

interface Message {
  role: "user" | "assistant";
  content: string;
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
      (a, b) => Math.abs(b.trajectory!.slope) - Math.abs(a.trajectory!.slope),
    )[0];
    const dir = fastest.trajectory!.slope > 0 ? "rising" : "declining";
    questions.push(`Their ${fastest.name} is ${dir} — what's changing?`);
  }

  const mostEvidence = [...dims].sort((a, b) => b.evidenceCount - a.evidenceCount)[0];
  if (mostEvidence && mostEvidence.evidenceCount > 5) {
    questions.push(`Tell me about their ${mostEvidence.name} (${mostEvidence.evidenceCount} data points)`);
  }

  const conflicted = dims.find((d) => d.circuit?.pattern?.includes("Conflicted"));
  if (conflicted) {
    questions.push(`Their ${conflicted.name} shows conflicting signals — why?`);
  }

  const highest = [...dims].sort((a, b) => b.score - a.score)[0];
  if (highest) {
    questions.push(`What makes their ${highest.name} so strong?`);
  }

  return questions.slice(0, 4);
}

function buildSystemContext(props: Props): string {
  const parts: string[] = [];
  parts.push(`Person: ${props.person} (${props.mode} mode)`);

  if (props.profile) {
    if (props.profile.communicationStyle) {
      parts.push(`Communication style: ${props.profile.communicationStyle}`);
    }
    if (props.profile.chemicalCounts?.length) {
      const top = props.profile.chemicalCounts
        .slice(0, 5)
        .map((c) => `${c.chemical}(${c.count})`)
        .join(", ");
      parts.push(`Top chemicals: ${top}`);
    }
  }

  if (props.dimensions.length > 0) {
    const dimSummary = props.dimensions
      .map((d) => {
        let s = `${d.name}: ${(d.score * 100).toFixed(0)}%`;
        if (d.confidence < 0.7) s += " (low conf)";
        if (d.trajectory && Math.abs(d.trajectory.slope) > 0.005) {
          s += d.trajectory.slope > 0 ? " ^" : " v";
        }
        return s;
      })
      .join("; ");
    parts.push(`Dimensions: ${dimSummary}`);
  }

  if (props.matrixData) {
    parts.push(
      `Shadow matrix: ${props.matrixData.cells.length} cells, ${props.matrixData.chemicals.length} chemicals, ${props.matrixData.dimensions.length} dimensions`,
    );
  }

  return parts.join("\n");
}

export default function ProfileChat(props: Props) {
  const { person, dimensions } = props;
  const { setHighlight } = useHighlight();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => generateSuggestedQuestions(dimensions), [dimensions]);
  const systemContext = useMemo(() => buildSystemContext(props), [props]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Highlight dimensions mentioned in assistant responses
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;

    const dimNames = dimensions.map((d) => d.name);
    for (const name of dimNames) {
      if (last.content.toLowerCase().includes(name.toLowerCase())) {
        setHighlight({ dimension: name, source: "chat" });
        break;
      }
    }
  }, [messages, dimensions, setHighlight]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      const withContext: Message[] = [
        { role: "user", content: `[Context]\n${systemContext}` },
        ...messages,
        userMsg,
      ];

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const result = await api.analyze.orchestrator(person, withContext);
        setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, person, systemContext],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div
      className="flex flex-col bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
      style={{ height: 480 }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-xs font-semibold text-gray-300">Ask about {person}</h3>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgb(75 85 99) transparent" }}
      >
        {messages.length === 0 && !loading && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Ask questions about {person}'s biochemical profile, dimensions, or patterns.
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="px-2.5 py-1.5 text-[11px] bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-md border border-gray-600/50 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-xs leading-relaxed ${
              msg.role === "user"
                ? "text-gray-200 bg-gray-700/30 rounded-lg px-3 py-2"
                : "text-gray-300"
            }`}
          >
            {msg.role === "assistant" ? (
              <div className="whitespace-pre-wrap">{msg.content}</div>
            ) : (
              msg.content
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            Thinking...
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded px-2 py-1.5">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-gray-700 p-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about their profile..."
            disabled={loading}
            className="flex-1 bg-gray-900 text-xs text-gray-200 placeholder-gray-500 rounded-md px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-md transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
