import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import type { DimensionScore } from "../types/api";
import { useHighlight } from "../contexts/HighlightContext";

interface Props {
  person: string;
  dimensions: DimensionScore[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const LOADING_STEPS = [
  "Thinking...",
];

function generateSuggestedQuestions(dims: DimensionScore[]): string[] {
  if (dims.length === 0) return [];
  const questions: string[] = [];

  // Lowest confidence dimension
  const lowestConf = [...dims].sort((a, b) => a.confidence - b.confidence)[0];
  if (lowestConf && lowestConf.confidence < 0.7) {
    questions.push(`What drives their ${lowestConf.name}? (low confidence)`);
  }

  // Highest trajectory slope
  const withTrajectory = dims.filter((d) => d.trajectory && Math.abs(d.trajectory.slope) > 0.005);
  if (withTrajectory.length > 0) {
    const fastest = withTrajectory.sort(
      (a, b) => Math.abs(b.trajectory!.slope) - Math.abs(a.trajectory!.slope)
    )[0];
    const dir = fastest.trajectory!.slope > 0 ? "rising" : "declining";
    questions.push(`Their ${fastest.name} is ${dir} - what's changing?`);
  }

  // Most evidence
  const mostEvidence = [...dims].sort((a, b) => b.evidenceCount - a.evidenceCount)[0];
  if (mostEvidence && mostEvidence.evidenceCount > 5) {
    questions.push(`Tell me about their ${mostEvidence.name} (${mostEvidence.evidenceCount} data points)`);
  }

  // Conflicted circuit
  const conflicted = dims.find((d) => d.circuit?.pattern?.includes("Conflicted"));
  if (conflicted) {
    questions.push(`Their ${conflicted.name} shows conflicting signals - why?`);
  }

  // High score dimension
  const highest = [...dims].sort((a, b) => b.score - a.score)[0];
  if (highest) {
    questions.push(`What makes their ${highest.name} so strong?`);
  }

  return questions.slice(0, 4);
}

export default function ProfileChat({ person, dimensions }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { highlight } = useHighlight();

  const suggestedQuestions = useMemo(
    () => generateSuggestedQuestions(dimensions),
    [dimensions]
  );

  // When a dimension is highlighted from a chart, show a contextual prompt
  const highlightedQuestion = useMemo(() => {
    if (highlight.dimension && highlight.source === "chart") {
      return `Tell me about their ${highlight.dimension}`;
    }
    return null;
  }, [highlight]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const mutation = useMutation({
    mutationFn: (text: string) => {
      const history = [
        ...messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
        { role: "user" as const, content: text },
      ];
      return api.analyze.orchestrator(person, history);
    },
    onMutate: () => {
      setLoadingStep(0);
      const interval = setInterval(() => {
        setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
      }, 3000);
      return interval;
    },
    onSuccess: (data, _, interval) => {
      clearInterval(interval as unknown as number);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    },
    onError: (err, _, interval) => {
      clearInterval(interval as unknown as number);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    },
  });

  const sendMessage = (text: string) => {
    if (!text.trim() || mutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    mutation.mutate(text);
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg border border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold">Ask about {person}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && !mutation.isPending && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Ask questions about this person's biochemical profile.
            </p>
            {/* Highlighted dimension prompt */}
            {highlightedQuestion && (
              <button
                onClick={() => sendMessage(highlightedQuestion)}
                className="w-full text-left p-2 rounded border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-300 hover:bg-indigo-500/20"
              >
                {highlightedQuestion}
              </button>
            )}
            {/* Suggested questions */}
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="w-full text-left p-2 rounded border border-gray-700 text-xs text-gray-400 hover:text-gray-200 hover:border-gray-500"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
            <div
              className={`max-w-[90%] rounded-lg p-3 text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600/20 text-indigo-100"
                  : "bg-gray-900 text-gray-200 border border-gray-700"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {mutation.isPending && (
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div className="space-y-1">
              {LOADING_STEPS.map((step, i) => (
                <div
                  key={i}
                  className={`text-xs flex items-center gap-2 ${
                    i <= loadingStep ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {i < loadingStep ? (
                    <span className="text-green-400">&#10003;</span>
                  ) : i === loadingStep ? (
                    <span className="animate-pulse text-indigo-400">&#9679;</span>
                  ) : (
                    <span className="text-gray-600">&#9675;</span>
                  )}
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask about their profile..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            disabled={mutation.isPending}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || mutation.isPending}
            className="px-4 py-2 bg-indigo-600 rounded text-sm text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
