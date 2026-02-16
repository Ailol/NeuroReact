const placeholders = [
  {
    title: "Temporal Drift",
    description: "Biochemical profile changes over time per person. Track how chemical signatures shift across multiple analyses.",
  },
  {
    title: "Chemical Correlations",
    description: "Co-occurrence matrix of ADD decisions across analyses. Which chemicals appear together most frequently?",
  },
  {
    title: "Cluster View",
    description: "Persons clustered by biochemical similarity using embedding space. Visual grouping of personality archetypes.",
  },
  {
    title: "Prediction Panel",
    description: "Predicted biochemical response for hypothetical inputs. What chemicals would activate given specific scenarios?",
  },
];

export default function MlPipelinePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ML Pipeline</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {placeholders.map((p) => (
          <div
            key={p.title}
            className="p-6 bg-gray-800 rounded-lg border border-dashed border-gray-600"
          >
            <h3 className="font-semibold mb-2">{p.title}</h3>
            <p className="text-sm text-gray-400">{p.description}</p>
            <div className="mt-4 text-xs text-gray-600">Coming soon</div>
          </div>
        ))}
      </div>
    </div>
  );
}
