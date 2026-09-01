[engine.seointellect.ru](https://engine.seointellect.ru/?r=15408pNzMH) (affiliate link)

# Installing Engine SEO Intellect

Engine SEO Intellect is an independent open-source adapter that exposes all 22 Engine SEO Intellect API tools through one MCP server.

## Requirements

- Node.js 20 or newer;
- an Engine SEO Intellect account and API token;
- an MCP client supporting stdio or Streamable HTTP.

## Installation

```bash
git clone https://github.com/arseniigruzdev/engine-seointellect-mcp.git
cd engine-seointellect-mcp
npm ci
npm run build
```

Copy the example environment file and add your token:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and set:

```dotenv
SEOINTELLECT_API_TOKEN=your-token
```

`.env` is excluded from Git. Never publish it or paste the token into issues, logs, or screenshots.

## Local Codex setup

Add the built server as a stdio MCP server:

```bash
codex mcp add engine-seointellect-mcp -- node /absolute/path/engine-seointellect-mcp/dist/index.js
```

On Windows:

```powershell
codex mcp add engine-seointellect-mcp -- node C:/absolute/path/engine-seointellect-mcp/dist/index.js
```

Verify the configuration:

```bash
codex mcp list
```

Restart Codex after adding the server. The server loads the API token from the local `.env`; the key is not stored in the Codex configuration.

Alternative manual `~/.codex/config.toml` configuration:

```toml
[mcp_servers.engine-seointellect-mcp]
command = "node"
args = ["C:/absolute/path/engine-seointellect-mcp/dist/index.js"]
tool_timeout_sec = 180
default_tools_approval_mode = "writes"
```

## Run locally

```bash
npm start
```

The process communicates over stdio and does not open a network port.

## Request frequency and result polling

The Engine SEO Intellect API executes tasks asynchronously. The MCP server calls `check` and `get` automatically until the result is ready.

- The default polling interval is **15 seconds** (`15000` ms).
- Do not reduce the interval below 15 seconds: during live verification, polling every 2 seconds caused HTTP `429 Too Many Attempts` responses.
- Run tasks sequentially, especially when they share one API token. Avoid starting several heavy tasks at once.
- `wait_for_result=true` waits for the result inside the current MCP call.
- `wait_for_result=false` returns `task_id` immediately without polling.
- The standard result timeout is 120 seconds. If the task is still running, the MCP returns `pending` with `task_id`; pass that `task_id` to the same tool to continue waiting without creating a new task.
- `seo_text`, `headers`, `copywriter_brief`, and other heavy tools may need `timeout_ms` between `180000` and `300000`. The MCP client's tool timeout must be longer than this value.
- After HTTP 429, stop retrying, wait at least 60 seconds, and retry once. Rapid retry loops only extend the throttling period.

Global defaults can be configured in `.env`:

```dotenv
SEOINTELLECT_POLL_INTERVAL_MS=15000
SEOINTELLECT_RESULT_TIMEOUT_MS=120000
```

Per-tool `poll_interval_ms` and `timeout_ms` values override the global defaults.

## Docker and remote MCP

Use BYOK mode for a public deployment: every caller supplies their own Engine SEO Intellect token and the server does not persist it.

```bash
docker build -t engine-seointellect-mcp .
docker run --rm -p 3000:3000 \
  -e MCP_TRANSPORT=http \
  -e HOST=0.0.0.0 \
  -e MCP_HTTP_AUTH_MODE=byok \
  -e MCP_ALLOWED_HOSTS=mcp.example.com \
  engine-seointellect-mcp
```

Remote endpoint: `https://mcp.example.com/mcp`.

Remote Codex configuration:

```toml
[mcp_servers.engine-seointellect-mcp]
url = "https://mcp.example.com/mcp"
bearer_token_env_var = "SEOINTELLECT_API_TOKEN"
tool_timeout_sec = 180
default_tools_approval_mode = "writes"
```

## Verify the project

```bash
npm run check
npm audit
```

The automated tests use mocked API responses and do not consume account limits.

## Updating

```bash
git pull
npm ci
npm run build
```

Restart the MCP client or container after updating.
