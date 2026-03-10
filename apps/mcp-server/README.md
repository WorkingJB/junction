# Junction MCP Server

Model Context Protocol (MCP) server for Junction, enabling AI agents to interact with the platform.

## Features

- **Resources**: Access agent tasks and status
- **Tools**: Create, update, and manage tasks
- **Progress Reporting**: Report task progress
- **Human Input Requests**: Request user input when needed
- **Cost Logging**: Track token usage and costs

## Installation

This server is part of the Junction monorepo. Install dependencies from the root:

```bash
pnpm install
```

## Building

```bash
cd apps/mcp-server
pnpm build
```

## Usage

### Configure in Claude Code

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "junction": {
      "command": "node",
      "args": ["/path/to/junction/apps/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_KEY": "your-service-key",
        "JUNCTION_API_KEY": "your-agent-api-key"
      }
    }
  }
}
```

### Available Tools

#### `create_task`

Create a new agent task.

```json
{
  "title": "Process user data",
  "description": "Analyze and process uploaded data",
  "priority": "high"
}
```

#### `update_task`

Update task status and progress.

```json
{
  "task_id": "task-uuid",
  "status": "in_progress"
}
```

#### `log_cost`

Log token usage and cost.

```json
{
  "task_id": "task-uuid",
  "model": "claude-3-opus",
  "input_tokens": 1500,
  "output_tokens": 500,
  "cost_usd": 0.05
}
```

#### `request_input`

Request human input.

```json
{
  "task_id": "task-uuid",
  "prompt": "Which format should I use for the export?"
}
```

### Available Resources

#### `tasks://list`

List all tasks for the agent.

## Development

Watch mode for development:

```bash
pnpm dev
```

## License

MIT
