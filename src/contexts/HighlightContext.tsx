import { createContext, useContext, useState, type ReactNode } from "react";

export interface HighlightState {
  dimension?: string;
  chemical?: string;
  source?: "chart" | "chat";
}

interface HighlightContextValue {
  highlight: HighlightState;
  setHighlight: (h: HighlightState) => void;
  clearHighlight: () => void;
}

const HighlightContext = createContext<HighlightContextValue>({
  highlight: {},
  setHighlight: () => {},
  clearHighlight: () => {},
});

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [highlight, setHighlight] = useState<HighlightState>({});
  const clearHighlight = () => setHighlight({});
  return (
    <HighlightContext.Provider value={{ highlight, setHighlight, clearHighlight }}>
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlight() {
  return useContext(HighlightContext);
}
