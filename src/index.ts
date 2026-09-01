#!/usr/bin/env node
import { createHash, timingSafeEqual } from "node:crypto";
import { createMcpExpressApp, requireBearerAuth } from "@modelcontextprotocol/express";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createSeoIntellectServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

function envInt(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function tokenClientId(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const pollIntervalMs = envInt("SEOINTELLECT_POLL_INTERVAL_MS", 2_000);
const resultTimeoutMs = envInt("SEOINTELLECT_RESULT_TIMEOUT_MS", 120_000);

function startStdio(): void {
  const token = requireEnv("SEOINTELLECT_API_TOKEN");
  const handle = serveStdio(() =>
    createSeoIntellectServer({ token, pollIntervalMs, resultTimeoutMs }),
  );

  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

function startHttp(): void {
  const host = process.env.HOST?.trim() || "127.0.0.1";
  const port = envInt("PORT", 3_000);
  const authMode = process.env.MCP_HTTP_AUTH_MODE?.trim().toLowerCase() || "byok";
  if (authMode !== "byok" && authMode !== "static") {
    throw new Error("MCP_HTTP_AUTH_MODE must be byok or static");
  }

  const staticSeoToken = authMode === "static" ? requireEnv("SEOINTELLECT_API_TOKEN") : undefined;
  const mcpAccessToken = authMode === "static" ? requireEnv("MCP_ACCESS_TOKEN") : undefined;

  const verifier: OAuthTokenVerifier = {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      if (!token.trim()) throw new Error("Empty bearer token");
      if (mcpAccessToken && !secureEqual(token, mcpAccessToken)) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid bearer token");
      }
      return {
        token,
        clientId: tokenClientId(token),
        scopes: ["mcp"],
        expiresAt: Math.floor(Date.now() / 1_000) + 3_600,
      };
    },
  };

  const allowedHosts = (process.env.MCP_ALLOWED_HOSTS || "localhost,127.0.0.1")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const app = createMcpExpressApp({
    host,
    allowedHosts,
    ...(allowedOrigins.length ? { allowedOrigins } : {}),
  });
  const auth = requireBearerAuth({ verifier, requiredScopes: ["mcp"] });
  const handler = createMcpHandler((context) => {
    const token = staticSeoToken ?? context.authInfo?.token;
    if (!token) throw new Error("SEO Intellect bearer token is missing");
    return createSeoIntellectServer({ token, pollIntervalMs, resultTimeoutMs });
  });
  const nodeHandler = toNodeHandler(handler);

  app.get("/", (_req, res) => {
    res.json({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      transport: "Streamable HTTP",
      endpoint: "/mcp",
      auth_mode: authMode,
    });
  });
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.all("/mcp", auth, (req, res) => void nodeHandler(req, res, req.body));

  const httpServer = app.listen(port, host, () => {
    console.error(`[${SERVER_NAME}] listening on http://${host}:${port}/mcp (${authMode})`);
  });

  const shutdown = async () => {
    httpServer.close();
    await handler.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

const httpRequested =
  process.argv.includes("--http") || process.env.MCP_TRANSPORT?.toLowerCase() === "http";

if (httpRequested) startHttp();
else startStdio();
