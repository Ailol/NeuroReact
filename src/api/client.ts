import type {
  PersonListResponse,
  CreatePersonResponse,
  PersonProfileResponse,
  DimensionsResponse,
  ProfileTimelineResponse,
  ShadowMatrixResponse,
  ChatAnalyzeRequest,
  ChatAnalyzeResponse,
  WorkAnalyzeRequest,
  WorkAnalyzeResponse,
  JournalAnalyzeRequest,
  JournalAnalyzeResponse,
  RelationshipListResponse,
  BackfillResponse,
  ChemicalEntry,
  DimensionEntry,
  ChemicalInteractionEntry,
} from "../types/api";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status}`);
  return res.json();
}

export const api = {
  persons: {
    list: () => get<PersonListResponse>("/api/persons"),
    create: (name: string) => post<CreatePersonResponse>("/api/persons", { name }),
    profile: (name: string) => get<PersonProfileResponse>(`/api/persons/${encodeURIComponent(name)}/profile`),
    dimensions: (name: string, mode: "work" | "private" = "work") =>
      get<DimensionsResponse>(`/api/persons/${encodeURIComponent(name)}/dimensions?mode=${mode}`),
    timeline: (name: string) =>
      get<ProfileTimelineResponse>(`/api/persons/${encodeURIComponent(name)}/profile/timeline`),
    shadowMatrix: (name: string, mode: "work" | "private" = "work") =>
      get<ShadowMatrixResponse>(`/api/persons/${encodeURIComponent(name)}/shadow-matrix?mode=${mode}`),
  },
  analyze: {
    chat: (req: ChatAnalyzeRequest) => post<ChatAnalyzeResponse>("/api/analyze/chat", req),
    work: (req: WorkAnalyzeRequest) => post<WorkAnalyzeResponse>("/api/analyze/work", req),
    journal: (req: JournalAnalyzeRequest) => post<JournalAnalyzeResponse>("/api/analyze/journal", req),
    orchestrator: (person: string, messages: { role: string; content: string }[]) =>
      post<{ response: string }>("/api/analyze/orchestrator", { person, messages }),
  },
  relationships: {
    list: () => get<RelationshipListResponse>("/api/relationships"),
  },
  chemicals: {
    list: () => get<ChemicalEntry[]>("/api/chemicals"),
  },
  dimensions: {
    list: () => get<DimensionEntry[]>("/api/dimensions"),
  },
  chemicalInteractions: {
    list: () => get<ChemicalInteractionEntry[]>("/api/chemical-interactions"),
    forChemical: (key: string) =>
      get<ChemicalInteractionEntry[]>(`/api/chemical-interactions/${encodeURIComponent(key)}`),
  },
  embeddings: {
    backfill: (person?: string) => post<BackfillResponse>("/api/embeddings/backfill", person ? { person } : {}),
  },
};
