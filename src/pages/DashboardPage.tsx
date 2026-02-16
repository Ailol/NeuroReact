import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export default function DashboardPage() {
  const { data: persons, isLoading } = useQuery({
    queryKey: ["persons"],
    queryFn: () => api.persons.list(),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card
          title="Persons"
          value={isLoading ? "..." : String(persons?.persons.length ?? 0)}
        />
        <Card title="Analysis Types" value="3" subtitle="Chat / Work / Journal" />
        <Card title="Biochemical Agents" value="27" subtitle="7 NT + 10 H + 10 P" />
      </div>

      {persons && persons.persons.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Tracked Persons</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {persons.persons.map((name) => (
              <a
                key={name}
                href={`/persons/${encodeURIComponent(name)}`}
                className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                {name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="text-sm text-gray-400">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}
