import { describe, expect, it, vi } from "vitest";
import {
  extractTaskId,
  isErrorResponse,
  isPendingResponse,
  isReadyResponse,
  SeoIntellectClient,
} from "../src/api-client.js";

describe("SEO Intellect API client", () => {
  it("submits the expected task envelope without exposing the token in the body", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) =>
      new Response(JSON.stringify({ status: "ok", task_id: 42 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new SeoIntellectClient({
      token: "secret-token",
      fetchImpl: fetchMock as typeof fetch,
    });

    const result = await client.run(
      "positions",
      { keywords: ["seo"], url: "https://example.com" },
      { waitForResult: false },
    );

    expect(extractTaskId(result)).toBe(42);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://engine.seointellect.ru/api/task/set");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer secret-token" });
    expect(JSON.parse(String(init?.body))).toEqual({
      tool: "positions",
      data: { keywords: ["seo"], url: "https://example.com" },
    });
    expect(String(init?.body)).not.toContain("secret-token");
  });

  it("recognizes common pending and ready response shapes", () => {
    expect(isPendingResponse({ status: "processing", task_id: 1 })).toBe(true);
    expect(isPendingResponse({ status: "error", msg: "Результат ещё не готов" })).toBe(true);
    expect(
      isReadyResponse({
        status: "fail",
        msg: "Задача еще не готова, ожидайте, проверяйте через метод check!",
      }),
    ).toBe(false);
    expect(isReadyResponse({ status: "ok", result: { value: 1 } })).toBe(true);
    expect(isReadyResponse({ status: "completed", task_id: 1 })).toBe(true);
    expect(isErrorResponse({ status: "error", msg: "Invalid input" })).toBe(true);
    expect(isErrorResponse({ status: "error", msg: "Result is not ready" })).toBe(false);
  });
});
