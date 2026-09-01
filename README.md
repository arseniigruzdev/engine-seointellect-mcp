# SEO Intellect MCP

[engine.seointellect.ru](https://engine.seointellect.ru/?r=15408pNzMH) (affiliate link)

[Русская инструкция](INSTALL.ru.md) · [English installation guide](INSTALL.en.md)

Open-source MCP server for the complete [SEO Intellect](https://engine.seointellect.ru/api) API surface. One MCP server exposes 22 SEO tools and handles the upstream asynchronous task lifecycle (`set` → `check` → `get`).

The project supports:

- local `stdio` transport for Codex, Claude Desktop, and other MCP hosts;
- remote Streamable HTTP transport;
- BYOK hosting: every remote caller supplies their own SEO Intellect token;
- structured tool results, input validation, polling, and resumable `task_id` values;
- Node.js 20+, Docker, and horizontal stateless HTTP deployment.

> The project is an independent community integration and is not an official SEO Intellect product.

## Tools

| MCP tool | SEO Intellect API tool | Purpose |
|---|---|---|
| `lsi` | `lsi` | LSI words and n-grams |
| `seo_text` | `seo-text` | Competitor text sizes and page text |
| `site_age` | `site-age` | First known indexing date |
| `top_10` | `top-10` | Search result export |
| `page_index` | `pageindex` | Yandex and Google index checks |
| `clustering` | `clustering` | Keyword clustering |
| `lemma` | `lemma` | Lemmatization and n-grams |
| `positions_multi` | `positions-multi` | Multi-domain position checks |
| `headers` | `headers` | H1-H6 collection |
| `competitors` | `competitors` | Search competitor discovery |
| `suggest` | `suggest` | Search suggestions |
| `sqi` | `sqi` | Yandex site quality index |
| `keywords_checker` | `keywords-checker` | Copywriter brief compliance |
| `overoptimization_filter` | `filter` | Text-filter risk |
| `positions` | `positions` | Keyword positions |
| `link_checker` | `linkchecker` | Donor-link checks |
| `relevant_pages` | `relevant` | Relevant page discovery |
| `wordstat` | `wordstat` | Wordstat frequency collection |
| `semantic` | `semantic` | Competitor semantics |
| `site_scanner` | `site-scanner` | Technical site crawl |
| `copywriter_brief` | `copyrighters` | Content brief generation |
| `text_analyze` | `text-analyze` | Text and competitor analysis |

All 22 tools accept three optional execution fields:

- `wait_for_result` — wait for the final result; defaults to `true`;
- `poll_interval_ms` — polling interval;
- `timeout_ms` — maximum wait time.

When a task outlives the timeout, the response contains `task_id`. Pass only that `task_id` to the same MCP tool to continue waiting. Set `wait_for_result=false` to submit without polling.

## Local setup (stdio)

```bash
git clone https://github.com/arseniigruzdev/seointellect-mcp.git
cd seointellect-mcp
npm ci
npm run build
```

Set the token in the environment, then start the server:

```bash
SEOINTELLECT_API_TOKEN=your-token npm start
```

PowerShell:

```powershell
$env:SEOINTELLECT_API_TOKEN = "your-token"
npm start
```

### Codex configuration

Codex supports both stdio and Streamable HTTP MCP servers. Keep the token in the process environment and allow Codex to forward it instead of writing it into `config.toml`:

```toml
[mcp_servers.seointellect]
command = "node"
args = ["C:/absolute/path/to/seointellect-mcp/dist/index.js"]
env_vars = ["SEOINTELLECT_API_TOKEN"]
tool_timeout_sec = 180
default_tools_approval_mode = "writes"
```

The same MCP configuration is shared by Codex CLI, the IDE extension, and the ChatGPT desktop app on a Codex host. Restart the client after adding the server.

## Remote hosting (Streamable HTTP)

The recommended public mode is BYOK. The MCP endpoint treats the caller's bearer token as their SEO Intellect API token, forwards it only to SEO Intellect, and does not persist it.

```bash
MCP_TRANSPORT=http \
HOST=0.0.0.0 \
PORT=3000 \
MCP_HTTP_AUTH_MODE=byok \
MCP_ALLOWED_HOSTS=mcp.example.com \
npm start
```

Endpoints:

- `POST/GET/DELETE /mcp` — Streamable HTTP MCP;
- `GET /health` — health check;
- `GET /` — server metadata.

Remote Codex configuration:

```toml
[mcp_servers.seointellect]
url = "https://mcp.example.com/mcp"
bearer_token_env_var = "SEOINTELLECT_API_TOKEN"
tool_timeout_sec = 180
default_tools_approval_mode = "writes"
```

### Docker

```bash
docker build -t seointellect-mcp .
docker run --rm -p 3000:3000 \
  -e MCP_TRANSPORT=http \
  -e HOST=0.0.0.0 \
  -e MCP_HTTP_AUTH_MODE=byok \
  -e MCP_ALLOWED_HOSTS=localhost \
  seointellect-mcp
```

For Coolify or Dokploy:

1. deploy this repository with its `Dockerfile`;
2. expose container port `3000`;
3. set `MCP_TRANSPORT=http`, `HOST=0.0.0.0`, and `MCP_HTTP_AUTH_MODE=byok`;
4. set `MCP_ALLOWED_HOSTS` to the public MCP hostname;
5. proxy HTTPS to `/mcp` and use `/health` for health checks.

In BYOK mode, do **not** set `SEOINTELLECT_API_TOKEN` on the server.

## Private static-token mode

Static mode uses one SEO Intellect account and therefore must not be exposed publicly. It requires a separate MCP access token:

```bash
MCP_TRANSPORT=http \
MCP_HTTP_AUTH_MODE=static \
SEOINTELLECT_API_TOKEN=upstream-token \
MCP_ACCESS_TOKEN=random-private-access-token \
npm start
```

## Development

```bash
npm run check
npm audit
```

Tests use an in-memory MCP connection and mocked SEO Intellect responses. They do not consume API limits.

## Security and privacy

- Tokens are never logged or included in request bodies.
- BYOK tokens are held only in memory for the current MCP request.
- Every tool can consume SEO Intellect account limits, so all tools are marked non-read-only and non-idempotent.
- HTTP deployment validates allowed hosts and requires bearer authentication.
- Do not paste real tokens into issues, logs, screenshots, or committed configuration.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

MIT
