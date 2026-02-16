// ── Persons ─────────────────────────────────────────────────────────────────

export interface PersonListResponse {
  persons: string[];
}

export interface CreatePersonResponse {
  personId: string;
  personalityId: number;
}

export interface ChemicalCount {
  chemical: string;
  count: number;
}

export interface ProfileEntry {
  chemical: string;
  reasoning: string;
}

export interface PersonProfileResponse {
  person: string;
  communicationStyle: string | null;
  chemicalCounts: ChemicalCount[];
  profiles: ProfileEntry[];
}

// ── Analysis ────────────────────────────────────────────────────────────────

export interface AnalysisDecision {
  chemical: string;
  reasoning: string;
}

export interface ChatAnalyzeResponse {
  person: string;
  sourceType: "chat";
  decisions: AnalysisDecision[];
  synthesis: string;
  layerResponses: Record<string, string>;
  suggestedResponse: string;
}

export interface WorkAnalyzeResponse {
  person: string;
  sourceType: "work";
  decisionsCount: number;
  decisions: AnalysisDecision[];
  synthesis: string;
}

export interface JournalAnalyzeResponse {
  person: string;
  sourceType: "journal";
  decisionsCount: number;
  decisions: AnalysisDecision[];
  synthesis: string;
}

// ── Relationships ───────────────────────────────────────────────────────────

export interface RelationshipType {
  name: string;
  description: string | null;
}

export interface RelationshipListResponse {
  relationshipTypes: RelationshipType[];
}

// ── Dimensions ─────────────────────────────────────────────────────────────

export interface DimensionEvidence {
  chemical: string;
  layer: string;
  reasoning: string;
  level: number;
  recency: number;
}

export interface TemporalTrajectory {
  slope: number;
  direction: string;
  r2: number;
  dataPoints: number;
  earliestLevel: number;
  latestLevel: number;
}

export interface ChemicalEdge {
  chemicalA: string;
  chemicalB: string;
  correlation: number;
  relationship: string;
}

export interface CircuitCoherence {
  coherenceScore: number;
  edges: ChemicalEdge[];
  pattern: string;
}

export interface DimensionScore {
  name: string;
  section: string;
  category: string;
  score: number;
  confidence: number;
  consistency: number;
  evidenceCount: number;
  evidence: DimensionEvidence[];
  trajectory?: TemporalTrajectory;
  circuit?: CircuitCoherence;
}

export type ScoringMode = "work" | "private";

export interface DimensionsResponse {
  person: string;
  mode: ScoringMode;
  behavioral: DimensionScore[];
  personal: DimensionScore[];
}

// ── Profile Timeline ────────────────────────────────────────────────────────

export interface ProfileTimelineEntry {
  chemical: string;
  intensityFactor: number;
  createdAt: string;
}

export interface ProfileTimelineResponse {
  person: string;
  entries: ProfileTimelineEntry[];
}

// ── Shadow Matrix ──────────────────────────────────────────────────────────

export interface ShadowMatrixCell {
  dimension: string;
  section: string;
  chemical: string;
  layer: string;
  shadowLevel: number;
  confidence: number;
  entryCount: number;
}

export interface ShadowMatrixResponse {
  person: string;
  mode: string;
  cells: ShadowMatrixCell[];
  dimensions: string[];
  chemicals: string[];
}

export interface ChemicalSeam {
  chemical: string;
  layer: string;
  spread: number;
  dimensionLevels: { dimension: string; level: number }[];
  highDimension: string;
  lowDimension: string;
}

// ── Chemicals (master) ──────────────────────────────────────────────────────

export interface ChemicalEntry {
  id: number;
  key: string;
  label: string;
  layer: string;
}

export interface ChemicalListResponse {
  chemicals: ChemicalEntry[];
}

// ── Dimensions (master) ─────────────────────────────────────────────────────

export interface DimensionAffinity {
  chemicalKey: string;
  weight: number;
}

export interface DimensionEntry {
  id: number;
  name: string;
  section: string;
  category: string;
  description: string;
  workRelevance: number;
  privateRelevance: number;
  sortOrder: number;
  affinities: DimensionAffinity[];
}

// ── Chemical Interactions ───────────────────────────────────────────────────

export interface ChemicalInteractionEntry {
  id: number;
  sourceKey: string;
  sourceLabel: string;
  sourceLayer: string;
  targetKey: string;
  targetLabel: string;
  targetLayer: string;
  modFactor: number;
  mechanism: string | null;
  notes: string | null;
}

export interface ChemicalInteractionListResponse {
  interactions: ChemicalInteractionEntry[];
}

// ── Embeddings ──────────────────────────────────────────────────────────────

export interface BackfillResponse {
  analyzed_data_embeddings: number;
  profile_embeddings: number;
  total: number;
  message: string;
}

// ── Request types ───────────────────────────────────────────────────────────

export interface ChatAnalyzeRequest {
  person: string;
  text: string;
  relationship?: string;
  projectedRelationship?: string;
  save?: boolean;
}

export interface WorkAnalyzeRequest {
  person: string;
  text: string;
  relationship?: string;
  save?: boolean;
}

export interface JournalAnalyzeRequest {
  person: string;
  text: string;
  save?: boolean;
}
