import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSeoIntellectServer } from "../src/server.js";
import { toolNames } from "../src/tool-catalog.js";

const closeCallbacks: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closeCallbacks.splice(0).map((close) => close()));
});

async function connectedClient(fetchImpl: typeof fetch) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createSeoIntellectServer({ token: "test-token", fetchImpl });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  closeCallbacks.push(async () => {
    await client.close();
    await server.close();
  });
  return client;
}

describe("MCP server", () => {
  it("publishes exactly 22 SEO tools", async () => {
    const client = await connectedClient(vi.fn() as unknown as typeof fetch);
    const listed = await client.listTools();

    expect(listed.tools).toHaveLength(22);
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual([...toolNames].sort());
  });

  it("maps an MCP tool call to the correct upstream API tool", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify({ status: "ok", task_id: 77 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = await connectedClient(fetchMock as typeof fetch);

    const result = await client.callTool({
      name: "site_age",
      arguments: {
        urls: ["https://example.com"],
        wait_for_result: false,
      },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({
      data: { status: "ok", task_id: 77 },
    });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({
      tool: "site-age",
      data: { urls: ["https://example.com"] },
    });
  });
});
