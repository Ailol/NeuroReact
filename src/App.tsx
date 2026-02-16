import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="persons" element={<PersonsPage />} />
            <Route path="persons/:name" element={<PersonDetailPage />} />
            <Route path="analyze" element={<AnalyzePage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="ml" element={<MlPipelinePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
