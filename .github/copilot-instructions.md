# OmwStar Copilot instructions

## Image generation MCP

- The workspace image tool is implemented in `tools/image-generator-mcp/` with the official TypeScript MCP SDK.
- SDK reference: <https://github.com/modelcontextprotocol/typescript-sdk>
- MCP protocol documentation: <https://modelcontextprotocol.io/docs>
- The server runs over stdio; never write ordinary logs to stdout.
- Generated files must remain under `IMAGE_OUTPUT_ROOT` and existing files must not be overwritten without an explicit code change.
- Never read, print, persist, or commit `IMAGE_API_KEY`.
- Keep provider-specific request/response adaptation inside `requestImage()`.
