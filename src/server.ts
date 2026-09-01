import { McpServer } from "@modelcontextprotocol/server";
import type { JsonObject, JsonValue } from "./api-client.js";
import { SeoIntellectApiError, SeoIntellectClient } from "./api-client.js";
import { toolCatalog } from "./tool-catalog.js";

export const SERVER_NAME = "engine-seo-intellect";
export const SERVER_VERSION = "0.1.0";

export interface ServerOptions {
  token: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
  resultTimeoutMs?: number;
}

function asStructuredContent(data: JsonValue): { data: JsonValue } {
  return { data };
}

function errorResult(error: unknown) {
  const details =
    error instanceof SeoIntellectApiError
      ? {
          error: error.message,
          status: error.status ?? null,
          upstream: error.response ?? null,
        }
      : {
          error: error instanceof Error ? error.message : String(error),
          status: null,
          upstream: null,
        };

  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify(details, null, 2) }],
    structuredContent: details,
  };
}

export function createSeoIntellectServer(options: ServerOptions): McpServer {
  const client = new SeoIntellectClient({
    token: options.token,
    ...(options.apiBaseUrl ? { baseUrl: options.apiBaseUrl } : {}),
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Engine SEO Intellect tools create asynchronous API tasks and may consume account limits. Each tool waits for a result by default. Set wait_for_result=false to receive task_id immediately; pass task_id to the same tool to resume polling.",
    },
  );

  for (const spec of toolCatalog) {
    server.registerTool(
      spec.name,
      {
        title: spec.title,
        description: `${spec.description} Upstream API tool: ${spec.apiTool}. This operation may consume Engine SEO Intellect account limits.`,
        inputSchema: spec.inputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      async (rawInput) => {
        const input = rawInput as Record<string, unknown>;
        const waitForResult = input.wait_for_result !== false;
        const pollIntervalMs =
          typeof input.poll_interval_ms === "number"
            ? input.poll_interval_ms
            : options.pollIntervalMs;
        const timeoutMs =
          typeof input.timeout_ms === "number"
            ? input.timeout_ms
            : options.resultTimeoutMs;

        try {
          let result: JsonValue;
          if (typeof input.task_id === "string" || typeof input.task_id === "number") {
            result = await client.waitForResult(input.task_id, {
              waitForResult,
              ...(pollIntervalMs ? { pollIntervalMs } : {}),
              ...(timeoutMs ? { timeoutMs } : {}),
            });
          } else {
            const {
              wait_for_result: _wait,
              poll_interval_ms: _poll,
              timeout_ms: _timeout,
              task_id: _taskId,
              ...payload
            } = input;
            result = await client.run(spec.apiTool, payload as JsonObject, {
              waitForResult,
              ...(pollIntervalMs ? { pollIntervalMs } : {}),
              ...(timeoutMs ? { timeoutMs } : {}),
            });
          }

          return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
            structuredContent: asStructuredContent(result),
          };
        } catch (error) {
          return errorResult(error);
        }
      },
    );
  }

  return server;
}
