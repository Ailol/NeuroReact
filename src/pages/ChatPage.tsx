export default function ChatPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Chat</h1>
      <div className="p-8 bg-gray-800 rounded-lg border border-gray-700 text-center">
        <p className="text-gray-400 mb-2">CopilotKit chat integration</p>
        <p className="text-sm text-gray-500">
          Requires CopilotKit runtime configuration.
          Connect to the MCP server at <code className="text-indigo-400">/mcp</code> for
          tool-assisted conversations.
        </p>
      </div>
    </div>
  );
}
