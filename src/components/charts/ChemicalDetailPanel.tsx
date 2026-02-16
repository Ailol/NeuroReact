import type { ChemicalMeta } from "../../data/chemicals";
import { LAYER_COLORS, LAYER_LABELS } from "../../data/chemicals";

interface Props {
  chemical: ChemicalMeta;
  count: number;
  reasonings: string[];
  onClose: () => void;
}

export default function ChemicalDetailPanel({ chemical, count, reasonings, onClose }: Props) {
  const layerColor = LAYER_COLORS[chemical.layer];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{chemical.label}</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: layerColor + "30", color: layerColor }}
          >
            {LAYER_LABELS[chemical.layer]}
          </span>
          <span className="text-sm text-gray-400">{count} occurrences</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      {reasonings.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {reasonings.map((r, i) => (
            <div key={i} className="p-3 bg-gray-900 rounded border border-gray-700">
              <p className="text-sm text-gray-300">{r}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No reasoning entries for this chemical.</p>
      )}
    </div>
  );
}
