# Web and development MCP boundary

This project keeps external research and application runtime access separate:

- The coding agent uses its web MCP connection for authoritative, time-sensitive research (for example, Schema.org and search documentation). Research results are translated into local code and are not fetched from a third-party service during a visitor request.
- Next.js 16 development/runtime inspection is exposed through the official `next-devtools-mcp` configuration in [`.mcp.json`](../.mcp.json). It can inspect routes, page metadata, compilation issues, and development errors while `pnpm dev` is running.
- The production application does not require an AI provider, a WordPress connection, a WooCommerce connection, or access to the archived backup. No customer or product records are sent to an MCP server.

## Local workflow

1. Start the app with `pnpm dev`.
2. Allow the configured MCP client to discover the local Next.js development server.
3. Use runtime inspection for route and error checks during development.
4. Run `pnpm readiness:agentic` for a repeatable local readiness check before release.

The application-facing boundary is intentionally conservative: public routes return webinar content and synthetic registration state, while administrative data remains behind the session guard. Any future AI assistant should call explicit, audited application APIs rather than receive direct database access.
