export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface SeoIntellectClientOptions {
  token: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface RunTaskOptions {
  waitForResult?: boolean;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export class SeoIntellectApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly response?: JsonValue,
  ) {
    super(message);
    this.name = "SeoIntellectApiError";
  }
}

const DEFAULT_BASE_URL = "https://engine.seointellect.ru/api";

function asObject(value: JsonValue): JsonObject | undefined {
  return value !== null && !Array.isArray(value) && typeof value === "object"
    ? value
    : undefined;
}

function getMessage(value: JsonValue): string {
  const object = asObject(value);
  const message = object?.msg ?? object?.message ?? object?.error;
  return typeof message === "string" ? message : "";
}

function normalizedState(value: JsonValue): string {
  const object = asObject(value);
  const raw =
    object?.task_status ??
    object?.state ??
    object?.status_task ??
    object?.status;
  return typeof raw === "string" ? raw.toLowerCase() : String(raw ?? "");
}

const PENDING_PATTERN =
  /pending|queued|queue|processing|running|created|waiting|not.?ready|не.?готов|очеред|обработ|в работе/i;
const READY_PATTERN = /done|complete|completed|finished|ready|success|успеш|готов|заверш/i;

export function isPendingResponse(value: JsonValue): boolean {
  const state = normalizedState(value);
  const message = getMessage(value);
  return PENDING_PATTERN.test(`${state} ${message}`);
}

export function isReadyResponse(value: JsonValue): boolean {
  if (isPendingResponse(value)) return false;
  const object = asObject(value);
  if (!object) return false;
  if ("result" in object && object.result !== null) return true;
  for (const key of ["done", "ready", "completed"] as const) {
    if (object[key] === true || object[key] === 1) return true;
  }
  return READY_PATTERN.test(`${normalizedState(value)} ${getMessage(value)}`);
}

export function isErrorResponse(value: JsonValue): boolean {
  const state = normalizedState(value);
  return /^(error|failed|fail|rejected|cancelled|canceled)$/.test(state) && !isPendingResponse(value);
}

export function extractTaskId(value: JsonValue): string | number | undefined {
  const object = asObject(value);
  const taskId = object?.task_id ?? object?.taskId ?? object?.id;
  return typeof taskId === "string" || typeof taskId === "number"
    ? taskId
    : undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SeoIntellectClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: SeoIntellectClientOptions) {
    if (!options.token.trim()) {
      throw new Error("Engine SEO Intellect API token is required");
    }
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async post(path: string, body: JsonObject): Promise<JsonValue> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    let parsed: JsonValue;
    try {
      parsed = raw ? (JSON.parse(raw) as JsonValue) : null;
    } catch {
      throw new SeoIntellectApiError(
        `Engine SEO Intellect returned a non-JSON response (${response.status})`,
        response.status,
      );
    }

    if (!response.ok) {
      throw new SeoIntellectApiError(
        getMessage(parsed) || `Engine SEO Intellect request failed (${response.status})`,
        response.status,
        parsed,
      );
    }
    return parsed;
  }

  submit(tool: string, data: JsonObject): Promise<JsonValue> {
    return this.post("/task/set", { tool, data });
  }

  check(taskId: string | number): Promise<JsonValue> {
    return this.post("/task/check", { task_id: taskId });
  }

  get(taskId: string | number): Promise<JsonValue> {
    return this.post("/task/get", { task_id: taskId });
  }

  async run(
    tool: string,
    data: JsonObject,
    options: RunTaskOptions = {},
  ): Promise<JsonValue> {
    const submitted = await this.submit(tool, data);
    if (isErrorResponse(submitted)) {
      throw new SeoIntellectApiError(
        getMessage(submitted) || "Engine SEO Intellect rejected the task",
        200,
        submitted,
      );
    }
    const taskId = extractTaskId(submitted);
    if (!taskId || options.waitForResult === false) return submitted;
    return this.waitForResult(taskId, options);
  }

  async waitForResult(
    taskId: string | number,
    options: RunTaskOptions = {},
  ): Promise<JsonValue> {
    if (options.waitForResult === false) {
      return { status: "pending", task_id: taskId };
    }

    const pollIntervalMs = options.pollIntervalMs ?? 2_000;
    const timeoutMs = options.timeoutMs ?? 120_000;
    const startedAt = Date.now();
    let lastCheck: JsonValue = null;
    let lastGet: JsonValue = null;

    while (Date.now() - startedAt < timeoutMs) {
      lastCheck = await this.check(taskId);

      if (isErrorResponse(lastCheck)) {
        throw new SeoIntellectApiError(
          getMessage(lastCheck) || "Engine SEO Intellect task failed",
          200,
          lastCheck,
        );
      }

      if (isReadyResponse(lastCheck) && asObject(lastCheck)?.result !== undefined) {
        return lastCheck;
      }

      try {
        lastGet = await this.get(taskId);
        if (isErrorResponse(lastGet)) {
          throw new SeoIntellectApiError(
            getMessage(lastGet) || "Engine SEO Intellect task failed",
            200,
            lastGet,
          );
        }
        if (isReadyResponse(lastGet) || !isPendingResponse(lastGet)) {
          return lastGet;
        }
      } catch (error) {
        if (!(error instanceof SeoIntellectApiError)) throw error;
        if (!isPendingResponse(error.response ?? null)) throw error;
      }

      await delay(pollIntervalMs);
    }

    return {
      status: "pending",
      task_id: taskId,
      message: `Task is still running after ${timeoutMs} ms. Call the same MCP tool again with task_id to continue waiting.`,
      last_check: lastCheck,
      last_get: lastGet,
    };
  }
}
