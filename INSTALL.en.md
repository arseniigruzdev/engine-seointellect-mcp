[engine.seointellect.ru](https://engine.seointellect.ru/?r=15408pNzMH) (affiliate link)

# Installing SEO Intellect MCP

SEO Intellect MCP is an independent open-source adapter that exposes all 22 SEO Intellect API tools through one MCP server.

## Requirements

- Node.js 20 or newer;
- an SEO Intellect account and API token;
- an MCP client supporting stdio or Streamable HTTP.

## Installation

```bash
git clone https://github.com/arseniigruzdev/seointellect-mcp.git
cd seointellect-mcp
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
codex mcp add seointellect -- node /absolute/path/seointellect-mcp/dist/index.js
```

On Windows:

```powershell
codex mcp add seointellect -- node C:/absolute/path/seointellect-mcp/dist/index.js
```

Verify the configuration:

```bash
codex mcp list
```

Restart Codex after adding the server. The server loads the API token from the local `.env`; the key is not stored in the Codex configuration.

Alternative manual `~/.codex/config.toml` configuration:

```toml
[mcp_servers.seointellect]
command = "node"
args = ["C:/absolute/path/seointellect-mcp/dist/index.js"]
tool_timeout_sec = 180
default_tools_approval_mode = "writes"
```

## Run locally

```bash
npm start
```

The process communicates over stdio and does not open a network port.

## Docker and remote MCP

Use BYOK mode for a public deployment: every caller supplies their own SEO Intellect token and the server does not persist it.

```bash
docker build -t seointellect-mcp .
docker run --rm -p 3000:3000 \
  -e MCP_TRANSPORT=http \
  -e HOST=0.0.0.0 \
  -e MCP_HTTP_AUTH_MODE=byok \
  -e MCP_ALLOWED_HOSTS=mcp.example.com \
  seointellect-mcp
```

Remote endpoint: `https://mcp.example.com/mcp`.

Remote Codex configuration:

```toml
[mcp_servers.seointellect]
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
