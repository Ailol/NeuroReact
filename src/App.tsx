import { Component, type ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CopilotKit } from "@copilotkit/react-core";
import Shell from "./components/layout/Shell";
import DashboardPage from "./pages/DashboardPage";
import PersonsPage from "./pages/PersonsPage";
import PersonDetailPage from "./pages/PersonDetailPage";
import AnalyzePage from "./pages/AnalyzePage";
import ChatPage from "./pages/ChatPage";
import MlPipelinePage from "./pages/MlPipelinePage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const COPILOT_URL =
  import.meta.env.VITE_COPILOT_URL ?? "http://localhost:4000/copilotkit";

class CopilotErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function CopilotUnavailable({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-xs text-yellow-300">
        CopilotKit runtime unavailable — start it with{" "}
        <code className="bg-gray-900 px-1.5 py-0.5 rounded">npm run copilot</code>
      </div>
      {children}
    </>
  );
}

function WithCopilot({ children }: { children: ReactNode }) {
  return (
    <CopilotErrorBoundary
      fallback={<CopilotUnavailable>{children}</CopilotUnavailable>}
    >
      <CopilotKit runtimeUrl={COPILOT_URL}>{children}</CopilotKit>
    </CopilotErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="persons" element={<PersonsPage />} />
            <Route
              path="persons/:name"
              element={
                <WithCopilot>
                  <PersonDetailPage />
                </WithCopilot>
              }
            />
            <Route path="analyze" element={<AnalyzePage />} />
            <Route
              path="chat"
              element={
                <WithCopilot>
                  <ChatPage />
                </WithCopilot>
              }
            />
            <Route path="ml" element={<MlPipelinePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
