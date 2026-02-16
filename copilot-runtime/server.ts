import express from "express";
import cors from "cors";
import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from "@copilotkit/runtime";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const ORCHESTRATOR_MODEL = process.env.ORCHESTRATOR_MODEL ?? "claude-sonnet-4-20250514";
const PORT = parseInt(process.env.PORT ?? "4000");

const app = express();
app.use(cors());

app.use("/copilotkit", (req, res, next) => {
  const runtime = new CopilotRuntime();

  const handler = copilotRuntimeNodeHttpEndpoint({
    endpoint: "/copilotkit",
    runtime,
    serviceAdapter: new AnthropicAdapter({
      model: ORCHESTRATOR_MODEL,
    }),
  });

  return handler(req, res, next);
});

app.listen(PORT, () => {
  console.log(`CopilotKit runtime at http://localhost:${PORT}/copilotkit`);
  console.log(`Orchestrator model: ${ORCHESTRATOR_MODEL}`);
});
