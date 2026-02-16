import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const { data: personsData } = useQuery({
    queryKey: ["persons"],
    queryFn: () => api.persons.list(),
  });

  const persons = personsData?.persons ?? [];
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-select first person when loaded
  useEffect(() => {
    if (persons.length > 0 && !selectedPerson) {
      setSelectedPerson(persons[0]);
    }
  }, [persons, selectedPerson]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || !selectedPerson) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      const allMessages = [...messages, userMsg];

      setMessages(allMessages);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const result = await api.analyze.orchestrator(selectedPerson, allMessages);
        setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, selectedPerson],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const suggestions = [
    "Give me an overview of this person",
    "What are their strongest dimensions?",
    "Analyze this conversation for their profile",
    "What patterns do you see in their behavior?",
  ];

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 6rem)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Chat</h1>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500">Person:</label>
          <select
            value={selectedPerson}
            onChange={(e) => {
              setSelectedPerson(e.target.value);
              clearChat();
            }}
            className="bg-gray-800 text-sm text-gray-200 rounded-md px-3 py-1.5 border border-gray-600 focus:border-indigo-500 focus:outline-none"
          >
            {persons.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 min-h-0 flex flex-col rounded-lg border border-gray-700 overflow-hidden bg-gray-800">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgb(75 85 99) transparent" }}
        >
          {messages.length === 0 && !loading && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Ask anything about {selectedPerson || "a person"}'s biochemical profile.
                The orchestrator has access to MCP tools for deep analysis.
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={!selectedPerson}
                    className="px-3 py-2 text-xs bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-lg border border-gray-600/50 transition-colors text-left disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm leading-relaxed ${
                msg.role === "user"
                  ? "text-gray-200 bg-gray-700/30 rounded-lg px-4 py-3 max-w-[85%] ml-auto"
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
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              Thinking...
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-gray-700 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedPerson ? `Ask about ${selectedPerson}...` : "Select a person first..."}
              disabled={loading || !selectedPerson}
              className="flex-1 bg-gray-900 text-sm text-gray-200 placeholder-gray-500 rounded-lg px-4 py-2.5 border border-gray-600 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !selectedPerson}
              className="px-4 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
