# Security policy

## Reporting a vulnerability

Please report security issues privately to the repository owner instead of opening a public issue. Include affected versions, impact, and a minimal reproduction without real API tokens or personal data.

## Token handling

This server supports two authentication modes:

- `byok`: the caller's bearer token is forwarded to SEO Intellect for the current MCP request and is not persisted;
- `static`: a server-side SEO Intellect token is used and access is protected by a separate `MCP_ACCESS_TOKEN`.

Never expose static mode to the public internet without an additional trusted gateway and rate controls.
