import type { ToolCall } from "../api";

interface Props {
  toolCalls: ToolCall[];
}

export function ToolTrace({ toolCalls }: Props) {
  if (toolCalls.length === 0) {
    return (
      <div className="text-gray-400 text-sm italic mt-4">
        No tool calls yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 mt-2">
      {toolCalls.map((tc, i) => (
        <div key={i} className="border border-yellow-300 bg-yellow-50 rounded-lg p-3 text-sm">
          <div className="font-semibold text-yellow-800 mb-1">
            🔧 {tc.tool}
          </div>
          <div className="text-xs text-gray-600 mb-1">
            <span className="font-medium">Args:</span>{" "}
            <code className="bg-gray-100 px-1 rounded">
              {JSON.stringify(tc.args)}
            </code>
          </div>
          <details className="text-xs text-gray-600">
            <summary className="cursor-pointer font-medium text-green-700">
              Result ▸
            </summary>
            <pre className="mt-1 bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
              {typeof tc.result === "string"
                ? tc.result
                : JSON.stringify(tc.result, null, 2)}
            </pre>
          </details>
        </div>
      ))}
    </div>
  );
}
