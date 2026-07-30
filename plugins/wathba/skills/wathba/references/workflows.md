# Wathba read-only MCP workflow

Use `--json` and normally `--no-input`. Keep credentials outside the agent.

## 1. Discover MCP setup

```sh
wathba mcp --api-url https://api.wathba.info --json
```

The response contains setup for:

- Replit: add a custom remote MCP URL and complete browser OAuth.
- Claude Code: `claude mcp add --transport http wathba
  https://api.wathba.info/mcp`, then authorize with `/mcp`.
- Codex: `codex mcp add wathba --url https://api.wathba.info/mcp`, then
  `codex mcp login wathba --scopes mcp:read`.
- MCP Inspector: connect to the same Streamable HTTP endpoint and complete
  OAuth.
- Any other host: use Streamable HTTP, OAuth authorization code with PKCE, and
  the `mcp:read` scope.

Do not put a Wathba CLI token or project API key in the MCP host configuration.

## 2. Read project and service facts

Call `list_projects`, select the exact project ID, then call
`get_project_setup` and `list_project_services`. For a selected service, call
`get_service_integration_docs`, `get_service_operations`, and
`get_service_troubleshooting` as needed.

Treat returned service, skill, operation, cost, limit, and environment pins as
authoritative. Missing, ambiguous, mismatched, or unknown facts fail closed.

## 3. Detect the local repository

```sh
wathba integrate inspect --project-dir . --json --no-input
```

Inspection does not upload or modify repository content. It recognizes
TypeScript, JavaScript, Python, Java, Go, PHP, .NET, cURL-oriented, and unknown
projects. Use the MCP SDK guide only for TypeScript/JavaScript; use its direct
HTTP guide for every other language.

## 4. Implement and test

Patch the member application with its normal coding tools. Keep Wathba calls in
trusted server-side code. Use local mocks and the test environment to validate
the integration without exposing the key to the agent.

MCP itself can be tested safely by connecting MCP Inspector, listing all six
tools and three resources, then calling only read operations. Attempting an
unknown tool or a mutating request must fail.

## 5. Hand off to the member

Report:

- which project, environment, service, skill pin, and operation contract were
  used;
- which local tests passed;
- what the member must do in the portal.

The member creates the production environment, completes production approval,
creates the one-time key, stores it directly in the trusted server secret
store, and deploys. Do not ask the member to reveal the key.

Legacy `.wathba` journal or `READY` files are ignored. The CLI does not track
integration progress or certify production readiness.
