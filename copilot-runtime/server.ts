import express from "express";
import cors from "cors";
import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from "@copilotkit/runtime";

const ORCHESTRATOR_MODEL = process.env.ORCHESTRATOR_MODEL ?? "claude-sonnet-4-20250514";
const MCP_ENDPOINT = process.env.MCP_ENDPOINT ?? "http://100.104.149.87:13370/mcp";
const PORT = parseInt(process.env.PORT ?? "4000");

const app = express();
app.use(cors());

app.use("/copilotkit", (req, res, next) => {
  const runtime = new CopilotRuntime({
    mcpServers: [{ endpoint: MCP_ENDPOINT }],
  });

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
  console.log(`MCP endpoint: ${MCP_ENDPOINT}`);
});
