import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function PersonsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newName, setNewName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["persons"],
    queryFn: () => api.persons.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.persons.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      setNewName("");
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Persons</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && newName.trim() && createMutation.mutate(newName.trim())}
          placeholder="New person name..."
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
          disabled={!newName.trim() || createMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          {createMutation.isPending ? "Creating..." : "Add Person"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-1">
          {data?.persons.map((name) => (
            <div
              key={name}
              onClick={() => navigate(`/persons/${encodeURIComponent(name)}`)}
              className="flex items-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <span className="text-sm font-medium">{name}</span>
            </div>
          ))}
          {data?.persons.length === 0 && (
            <p className="text-gray-500 text-sm">No persons yet. Create one above.</p>
          )}
        </div>
      )}
    </div>
  );
}
