export interface ChemicalMeta {
  key: string;
  layer: "neurotransmitter" | "hormone" | "peptide";
  label: string;
}

export const CHEMICALS: ChemicalMeta[] = [
  // Neurotransmitter (7)
  { key: "dopamine", layer: "neurotransmitter", label: "Dopamine" },
  { key: "serotonin", layer: "neurotransmitter", label: "Serotonin" },
  { key: "norepinephrine", layer: "neurotransmitter", label: "Norepinephrine" },
  { key: "gaba", layer: "neurotransmitter", label: "GABA" },
  { key: "acetylcholine", layer: "neurotransmitter", label: "Acetylcholine" },
  { key: "endocannabinoid", layer: "neurotransmitter", label: "Endocannabinoid" },
  { key: "glutamate", layer: "neurotransmitter", label: "Glutamate" },
  // Hormone (10)
  { key: "cortisol", layer: "hormone", label: "Cortisol" },
  { key: "testosterone", layer: "hormone", label: "Testosterone" },
  { key: "estradiol", layer: "hormone", label: "Estradiol" },
  { key: "progesterone", layer: "hormone", label: "Progesterone" },
  { key: "thyroid", layer: "hormone", label: "Thyroid" },
  { key: "adrenaline", layer: "hormone", label: "Adrenaline" },
  { key: "melatonin", layer: "hormone", label: "Melatonin" },
  { key: "dhea", layer: "hormone", label: "DHEA" },
  { key: "prolactin", layer: "hormone", label: "Prolactin" },
  { key: "oxytocin_h", layer: "hormone", label: "Oxytocin (H)" },
  // Peptide (10)
  { key: "oxytocin", layer: "peptide", label: "Oxytocin" },
  { key: "vasopressin", layer: "peptide", label: "Vasopressin" },
  { key: "endorphins", layer: "peptide", label: "Endorphins" },
  { key: "enkephalins", layer: "peptide", label: "Enkephalins" },
  { key: "dynorphin", layer: "peptide", label: "Dynorphin" },
  { key: "substance_p", layer: "peptide", label: "Substance P" },
  { key: "crh", layer: "peptide", label: "CRH" },
  { key: "npy", layer: "peptide", label: "NPY" },
  { key: "bdnf", layer: "peptide", label: "BDNF" },
  { key: "orexin", layer: "peptide", label: "Orexin" },
];

export const LAYER_COLORS = {
  neurotransmitter: "#6366f1",
  hormone: "#f59e0b",
  peptide: "#10b981",
} as const;

export const LAYER_LABELS: Record<string, string> = {
  neurotransmitter: "Neurotransmitter",
  hormone: "Hormone",
  peptide: "Peptide",
};

export function getChemicalsByLayer(layer: string): ChemicalMeta[] {
  return CHEMICALS.filter((c) => c.layer === layer);
}

export function getChemicalMeta(key: string): ChemicalMeta | undefined {
  return CHEMICALS.find((c) => c.key === key);
}

// ── Neon theme colors for ChemicalExplorer ─────────────────────────────────

export const NEON_LAYER_COLORS = {
  neurotransmitter: "#7c6cff",
  hormone: "#ffaa00",
  peptide: "#00ff99",
} as const;

/** Derive edge/bar color from mod_factor: +1 agonist → 0 stabilizer → -1 antagonist */
export function interactionColor(modFactor: number): string {
  if (modFactor > 0.3) return "#00ff88";    // agonist — neon green
  if (modFactor < -0.3) return "#ff3366";   // antagonist — neon red
  return "#00ccff";                          // stabilizer — neon cyan
}

/** Derive category label from mod_factor */
export function interactionLabel(modFactor: number): string {
  if (modFactor >= 0.75) return "Agonist";
  if (modFactor >= 0.25) return "Partial Agonist";
  if (modFactor > -0.25) return "Stabilizer";
  if (modFactor > -0.75) return "Partial Antagonist";
  return "Antagonist";
}
