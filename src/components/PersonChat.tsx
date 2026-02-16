import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import type { DimensionScore } from "../types/api";

interface Props {
  person: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  dimension?: DimensionScore;
}

function DimensionCard({ dim }: { dim: DimensionScore }) {
  return (
    <div className="mt-2 p-3 bg-gray-900 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{dim.name}</span>
        <span className="text-xs text-gray-400">{dim.category}</span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${dim.score}%`,
              backgroundColor: dim.score >= 50 ? "#6366f1" : "#8b5cf6",
            }}
          />
        </div>
        <span className="text-xs font-mono text-indigo-400 w-7 text-right">{dim.score}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <span>Coherence: {(dim.coherence * 100).toFixed(0)}%</span>
        <span>Evidence: {dim.evidenceCount}</span>
      </div>
    </div>
  );
}

export default function PersonChat({ person }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const mutation = useMutation({
    mutationFn: (query: string) => api.persons.queryDimension(person, query),
    onSuccess: (result, query) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Scored "${result.dimension.name}" at ${result.dimension.score}/100 (coherence ${(result.dimension.coherence * 100).toFixed(0)}%)`,
          dimension: result.dimension,
        },
      ]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${String(err)}` },
      ]);
    },
  });

  function send() {
    const q = input.trim();
    if (!q || mutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    mutation.mutate(q);
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col" style={{ height: 360 }}>
      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ask about {person}</h3>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[10px] text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-8">
            Ask a question to score a custom dimension for this person
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700 text-gray-200"
              }`}
            >
              <p>{msg.text}</p>
              {msg.dimension && <DimensionCard dim={msg.dimension} />}
            </div>
          </div>
        ))}
        {mutation.isPending && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg bg-gray-700 text-gray-400 text-sm">
              Scoring...
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="e.g. How resilient is this person under pressure?"
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm
                       placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={send}
            disabled={mutation.isPending || !input.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700
                       disabled:text-gray-500 text-sm rounded-lg transition-colors"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
