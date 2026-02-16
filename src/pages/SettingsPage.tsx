import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { useState } from "react";

export default function SettingsPage() {
  const [backfillPerson, setBackfillPerson] = useState("");

  const backfill = useMutation({
    mutationFn: () => api.embeddings.backfill(backfillPerson || undefined),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="font-semibold mb-3">Backfill Embeddings</h2>
          <p className="text-sm text-gray-400 mb-3">
            Generate vector embeddings for analyzed data entries that don't have them yet.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={backfillPerson}
              onChange={(e) => setBackfillPerson(e.target.value)}
              placeholder="Person name (optional — blank for all)"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => backfill.mutate()}
              disabled={backfill.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              {backfill.isPending ? "Running..." : "Backfill"}
            </button>
          </div>
          {backfill.data && (
            <p className="text-sm text-green-400 mt-2">{backfill.data.message}</p>
          )}
          {backfill.error && (
            <p className="text-sm text-red-400 mt-2">{String(backfill.error)}</p>
          )}
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="font-semibold mb-2">API Connection</h2>
          <p className="text-sm text-gray-400">
            Backend: <code className="text-indigo-400">{import.meta.env.VITE_API_URL ?? "http://localhost:18080"}</code>
          </p>
          <p className="text-sm text-gray-400">
            MCP: <code className="text-indigo-400">/mcp</code> |
            REST: <code className="text-indigo-400">/api/*</code>
          </p>
        </div>
      </div>
    </div>
  );
}
