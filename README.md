# Junction

> A unified platform for managing human tasks and AI agent work

Junction is an open-source task and agent management platform that provides a single pane of glass for understanding what you're working on, what your team (humans and AI agents) is working on, and enabling you to interact and guide those activities from a centralized space.

## Features

### Human Task Management
- **Native Tasks**: Create and manage tasks directly in Junction
- **Task Aggregation**: Sync tasks from external services (Todoist, Microsoft To Do, Asana, Linear, Jira)
- **Work/Personal Separation**: Organize tasks by context
- **Smart Filtering**: Filter, search, and sort tasks efficiently

### AI Agent Tracking
- **Agent-Agnostic**: Works with any AI agent (Claude Code, custom agents, etc.)
- **Real-time Monitoring**: Track what agents are doing, have done, and are waiting to do
- **Human-in-the-Loop**: Get notified when agents need your input
- **Cost Tracking**: Monitor token usage and costs per agent/task
- **Complete Audit Trail**: Every agent action logged for governance and security
- **Multiple Integration Methods**:
  - **MCP Server**: Native support for MCP-compatible agents
  - **REST API**: Simple HTTP endpoints for any agent
  - **Webhooks**: Event-driven updates for real-time sync

### Manager View
- **Unified Dashboard**: See both human and agent tasks in one place
- **Team Insights**: Understand blockers and progress across your team
- **Metrics & Reporting**: Track productivity and agent efficiency

### Open Source & Self-Hostable
- **MIT License**: Free and open source
- **Docker Compose**: One-command self-hosting
- **Customizable**: Adapt to your team's specific needs
- **Hosted Option**: Coming soon for quick setup

## Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm** 8+
- **Docker** and **Docker Compose** (for local database)
- **Supabase** account (or use local Supabase)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/junction.git
cd junction
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. Start the database (using Docker Compose):
```bash
docker compose up -d db
```

5. Run migrations:
```bash
# If using Supabase CLI
supabase db push

# Or apply migrations manually to your database
```

6. Start the development server:
```bash
pnpm dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### First Steps

1. Sign up for an account at `/signup`
2. Create your first task
3. (Optional) Connect a task integration like Todoist
4. (Optional) Register an AI agent using the SDK or MCP server

## Architecture

Junction is built as a monorepo with the following structure:

```
junction/
├── apps/
│   ├── web/          # Next.js web application
│   └── mcp-server/   # MCP server for agent integration
├── packages/
│   ├── database/     # Supabase client and types
│   ├── ui/           # Shared UI components
│   └── agent-sdk/    # SDK for agent developers
├── supabase/
│   └── migrations/   # Database migrations
└── docs/             # Documentation
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL, Auth, Realtime)
- **Agent Integration**: MCP Server, REST API, Webhooks
- **Deployment**: Vercel (web), Supabase (backend), Docker Compose (self-host)

## Agent Integration

Junction supports three ways for agents to integrate:

### 1. MCP Server (Recommended for MCP-compatible agents)

Configure in your Claude Code or other MCP client:

```json
{
  "mcpServers": {
    "junction": {
      "command": "node",
      "args": ["/path/to/junction/apps/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "JUNCTION_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 2. REST API (For any agent)

```typescript
import { JunctionClient } from '@junction/agent-sdk';

const client = new JunctionClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://junction.example.com',
});

await client.register('My Agent', 'custom');
const task = await client.createTask({
  title: 'Process user data',
  priority: 'high',
});
await client.updateTask(task.id, { status: 'completed' });
```

### 3. Webhooks (For event-driven updates)

Configure your agent to send webhooks to:
```
POST https://junction.example.com/api/webhooks/agent-events
```

See [Agent Integration Guide](./docs/AGENT_INTEGRATION_GUIDE.md) for detailed instructions.

## Development

### Running Locally

```bash
# Install dependencies
pnpm install

# Start database
docker compose up -d db

# Run migrations
supabase db push

# Start dev server
pnpm dev

# Start MCP server (in another terminal)
pnpm mcp-server
```

### Building for Production

```bash
# Build all packages
pnpm build

# Run production server
pnpm start
```

### Running with Docker Compose

```bash
# Start all services
docker compose up

# Or in detached mode
docker compose up -d

# View logs
docker compose logs -f web

# Stop all services
docker compose down
```

## Documentation

- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md) - Detailed roadmap and architecture
- [Agent Integration Guide](./docs/AGENT_INTEGRATION_GUIDE.md) - How to integrate your agents (coming soon)
- [API Reference](./docs/API_REFERENCE.md) - REST API documentation (coming soon)
- [Self-Hosting Guide](./docs/SELF_HOSTING.md) - Deploy Junction yourself (coming soon)
- [Contributing Guide](./docs/CONTRIBUTING.md) - How to contribute to Junction

## Roadmap

### MVP (Current - Week 10)
- ✅ Phase 1: Foundation (project setup, database, auth)
- → Phase 2: Human task management + Todoist integration
- → Phase 3: Agent integration (MCP + REST + webhooks)
- → Phase 4: Unified dashboard
- → Phase 5: Auditing & security
- → Phase 6: Deployment & documentation

### Post-MVP
- Additional integrations (Microsoft To Do, Linear, Asana, Jira)
- Project/goals tracking
- Calendar integration
- Mobile app (PWA or React Native)
- Browser extension
- Advanced analytics and reporting
- Agent-to-agent communication
- Workflow automation
- Integration marketplace

See [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md) for detailed timeline.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

Areas we'd love help with:
- New task integrations
- Agent framework examples
- UI/UX improvements
- Documentation
- Bug fixes
- Performance optimizations

## Community

- **Issues**: [GitHub Issues](https://github.com/yourusername/junction/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/junction/discussions)
- **Twitter**: [@junction](https://twitter.com/junction) (coming soon)

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- Inspired by [Mission Control](https://github.com/builderz-labs/mission-control) for agent tracking concepts
- Built on [Supabase](https://supabase.com) for backend infrastructure
- Uses [Model Context Protocol (MCP)](https://modelcontextprotocol.io) for agent integration

---

Built with ❤️ by the Junction team
