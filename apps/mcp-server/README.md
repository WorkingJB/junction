# Junction MCP Server

Model Context Protocol (MCP) server for Junction, enabling Claude Desktop users to manage tasks and track costs directly from their conversations.

## What is MCP?

The Model Context Protocol (MCP) allows AI assistants like Claude to interact with external tools and data sources. This server exposes Junction's task management capabilities to Claude Desktop, allowing you to:

- Create and manage tasks
- Update task statuses
- Track token usage and costs
- Request human input when needed
- View your tasks as contextual resources

## Installation

```bash
# Install dependencies (from the monorepo root)
pnpm install

# Build the MCP server
cd apps/mcp-server
pnpm build
```

## Configuration

### 1. Get Your API Key

First, register an agent in your Junction dashboard and copy the API key:

1. Go to https://your-junction-app.vercel.app/dashboard/agents
2. Click "Register Agent"
3. Enter a name (e.g., "Claude Desktop") and type (e.g., "mcp")
4. Copy the generated API key (starts with `jnct_`)

### 2. Configure Claude Desktop

Add the MCP server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "junction": {
      "command": "node",
      "args": [
        "/absolute/path/to/junction/apps/mcp-server/build/index.js"
      ],
      "env": {
        "JUNCTION_API_KEY": "jnct_your_api_key_here",
        "JUNCTION_API_URL": "https://your-junction-app.vercel.app"
      }
    }
  }
}
```

**Important Notes:**
- Replace `/absolute/path/to/junction` with the actual absolute path to your Junction project
- Replace `jnct_your_api_key_here` with your actual API key from step 1
- Replace `https://your-junction-app.vercel.app` with your Junction app URL
- For local development, you can use `http://localhost:3000` as the `JUNCTION_API_URL`

### 3. Restart Claude Desktop

After updating the configuration, restart Claude Desktop to load the MCP server.

### 4. Verify Installation

In Claude Desktop, you should now see Junction tools available. Try asking:

> "Can you create a task for me to review the quarterly report?"

Claude will use the `create_task` tool to add it to your Junction dashboard!

## Available Tools

### create_task
Create a new task in Junction.

**Parameters:**
- `title` (required): Task title
- `description`: Detailed description
- `priority`: One of: low, medium, high, urgent
- `estimated_duration`: Estimated time in minutes
- `metadata`: Additional JSON metadata

**Example:**
```
Create a task to "Review Q1 financial report" with high priority
```

### update_task_status
Update the status of an existing task.

**Parameters:**
- `task_id` (required): The task ID to update
- `status` (required): One of: pending, in_progress, completed, failed, cancelled
- `result`: Task result or output
- `error`: Error message if task failed

**Example:**
```
Mark task abc-123 as completed
```

### get_tasks
Retrieve your tasks with optional filtering.

**Parameters:**
- `status`: Filter by status
- `limit`: Maximum number of tasks to return

**Example:**
```
Show me all my pending tasks
```

### log_cost
Log token usage and cost for API calls.

**Parameters:**
- `model` (required): Model name (e.g., "claude-3-5-sonnet-20241022")
- `input_tokens` (required): Number of input tokens
- `output_tokens` (required): Number of output tokens
- `cost_usd` (required): Total cost in USD
- `agent_task_id`: Associated task ID
- `metadata`: Additional metadata

**Example:**
```
Log the cost for this conversation: 1000 input tokens, 500 output tokens, using claude-3-5-sonnet-20241022
```

### request_human_input
Request input from a human by updating a task to waiting_for_input status.

**Parameters:**
- `task_id` (required): Task ID that needs input
- `prompt` (required): Question or prompt for the human

**Example:**
```
Request human input for task abc-123 asking "Which database should I use?"
```

## Available Resources

Resources provide contextual information that Claude can access:

### junction://tasks
All tasks for this agent.

### junction://tasks/pending
Only tasks with pending status.

### junction://tasks/in_progress
Only tasks currently in progress.

Claude can proactively check these resources to understand your current workload.

## Development

### Local Testing

For local development, you can test the MCP server using stdio:

```bash
# Build the server
pnpm build

# Set environment variables
export JUNCTION_API_KEY="jnct_your_api_key"
export JUNCTION_API_URL="http://localhost:3000"

# Run the server
node build/index.js
```

The server will communicate via stdio (standard input/output), which is how MCP servers interact with Claude Desktop.

### Debugging

The MCP server logs to stderr, which you can view in Claude Desktop's logs:

**macOS**: `~/Library/Logs/Claude/mcp-server-junction.log`  
**Windows**: `%APPDATA%\Claude\Logs\mcp-server-junction.log`

## Architecture

The MCP server acts as a bridge between Claude Desktop and your Junction API:

```
Claude Desktop
    ↓ (stdio)
Junction MCP Server
    ↓ (HTTP REST API)
Junction Web App (Vercel)
    ↓
Supabase Database
```

## Security

- API keys are stored in Claude Desktop's configuration and never exposed to the conversation
- All API requests are authenticated using Bearer token authentication
- The MCP server only has access to tasks and costs for the authenticated agent
- Row-Level Security (RLS) in Supabase ensures multi-tenant isolation

## Troubleshooting

### Server not loading
- Verify the absolute path in your Claude Desktop config is correct
- Check that the API key is valid and starts with `jnct_`
- Ensure the server was built successfully (`pnpm build`)

### API requests failing
- Check that `JUNCTION_API_URL` points to your running Junction app
- Verify the agent exists in your Junction dashboard
- Check the MCP server logs for error messages

### Tools not appearing
- Restart Claude Desktop after configuration changes
- Verify the JSON configuration is valid (no syntax errors)
- Check Claude Desktop logs for MCP initialization errors

## License

Part of the Junction monorepo.
