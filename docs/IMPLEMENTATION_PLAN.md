# Task & Agent Management Platform - Implementation Plan

## Project Overview

A unified platform for managing human tasks and AI agent work in a single pane of glass. This system enables users to:
- Track personal and work tasks from multiple sources (native + integrations)
- Monitor AI agent activity, costs, and progress in real-time
- Manage agent workflows and respond to agent requests for human input
- Audit all agent actions for governance and security
- View team activity across both human and AI workers

## Core Concepts

### 1. Human Task Aggregation
- Native in-app tasks
- Integration with external services (Todoist, Microsoft To Do, etc.)
- Work vs. personal task separation
- Future: Project/goals alignment, calendar tracking

### 2. Agent Task Tracking
- Agent-generated todo tracking (what they're doing, have done, waiting to do)
- "Waiting for human input" notifications
- Token cost tracking per agent/request
- Remote agent guidance and feedback
- Complete audit trail for governance
- Agent-agnostic design (works with any agent framework)

### 3. Manager View
- Unified visibility into human and agent work
- Team-level insights and blockers
- Metrics and reporting

### 4. Open Source
- Self-deployable via Docker Compose
- Hosted version on Vercel + Supabase
- Customizable for business teams
- MIT License

---

## Recommended Agent Integration Strategy

After researching MCP (Model Context Protocol), Mission Control, and current integration patterns, we're using a **hybrid three-layer approach**:

### 1. MCP Server (Primary)
- **Why**: Native support for Claude Code and growing MCP ecosystem
- **Features**:
  - Tasks primitive for long-running operations
  - Progress reporting capabilities
  - Elicitation mechanism for requesting human input
  - Bidirectional communication
- **Future-proof**: Major platforms (HubSpot, Stripe, GitHub) are adopting MCP

### 2. REST API (Secondary)
- **Why**: For agents without MCP support and custom integrations
- **Features**:
  - Simple JSON endpoints
  - Agent registration and heartbeat
  - Task CRUD operations
  - Status reporting
  - API key authentication

### 3. Webhooks (Event-driven)
- **Why**: Real-time agent notifications without polling
- **Features**:
  - Agents push events (task_completed, waiting_for_input, error)
  - Reduces overhead for long-running operations
  - Better user experience with instant notifications

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **State**: Zustand or React Context
- **Charts**: Recharts
- **Date Handling**: date-fns

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Realtime**: Supabase Realtime (subscriptions)
- **Storage**: Supabase Storage (future: attachments)

### Agent Integration
- **MCP**: @modelcontextprotocol/sdk
- **Validation**: Zod
- **API Framework**: Next.js API Routes

### DevOps
- **Self-hosting**: Docker Compose
- **Hosted**: Vercel (web) + Supabase (backend)
- **CI/CD**: GitHub Actions (future)

---

## Database Schema

### Core Tables

#### users
```sql
- id: uuid (PK)
- email: string
- full_name: string
- avatar_url: string
- created_at: timestamp
- updated_at: timestamp
```

#### tasks (Human tasks)
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users)
- title: string
- description: text
- status: enum (todo, in_progress, completed, cancelled)
- priority: enum (low, medium, high, urgent)
- type: enum (work, personal)
- due_date: timestamp
- completed_at: timestamp
- integration_id: uuid (FK -> task_integrations, nullable)
- external_id: string (nullable - ID in external system)
- metadata: jsonb (flexible storage for integration-specific data)
- created_at: timestamp
- updated_at: timestamp
```

#### agents
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users)
- name: string
- type: string (claude_code, custom, etc.)
- status: enum (active, idle, waiting_for_input, offline, error)
- api_key: string (hashed)
- last_heartbeat: timestamp
- metadata: jsonb (version, capabilities, etc.)
- created_at: timestamp
- updated_at: timestamp
```

#### agent_tasks
```sql
- id: uuid (PK)
- agent_id: uuid (FK -> agents)
- user_id: uuid (FK -> users)
- title: string
- description: text
- status: enum (pending, in_progress, completed, failed, waiting_for_input)
- priority: enum (low, medium, high)
- started_at: timestamp
- completed_at: timestamp
- error_message: text (nullable)
- metadata: jsonb (context, related files, etc.)
- created_at: timestamp
- updated_at: timestamp
```

#### agent_costs
```sql
- id: uuid (PK)
- agent_id: uuid (FK -> agents)
- agent_task_id: uuid (FK -> agent_tasks, nullable)
- user_id: uuid (FK -> users)
- model: string
- input_tokens: integer
- output_tokens: integer
- cost_usd: decimal
- timestamp: timestamp
- metadata: jsonb
```

#### task_integrations
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users)
- provider: enum (todoist, microsoft_todo, asana, linear, jira)
- access_token: text (encrypted)
- refresh_token: text (encrypted, nullable)
- token_expires_at: timestamp (nullable)
- last_sync: timestamp
- sync_enabled: boolean
- metadata: jsonb
- created_at: timestamp
- updated_at: timestamp
```

#### audit_logs
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users, nullable)
- agent_id: uuid (FK -> agents, nullable)
- action: string (task_created, task_updated, agent_registered, etc.)
- entity_type: string (task, agent_task, agent)
- entity_id: uuid
- changes: jsonb (before/after state)
- ip_address: string
- user_agent: string
- timestamp: timestamp
```

---

## MVP Implementation Timeline (10 weeks)

### Phase 1: Foundation (Weeks 1-2)

**Goals**: Project setup, database, authentication

**Tasks**:
1. Initialize Next.js 14+ with App Router and TypeScript
2. Configure monorepo structure (apps/web, apps/mcp-server, packages/database, packages/ui, packages/agent-sdk)
3. Set up Tailwind CSS and Shadcn UI
4. Create Supabase project and database schema
5. Write and run initial migrations
6. Configure Docker Compose (web app, postgres, optional supabase-local)
7. Set up Supabase Auth (email/password)
8. Create protected route layouts
9. Basic project documentation (README, setup instructions)

**Deliverables**:
- Working development environment
- Database with tables and relationships
- Authentication flow (signup, login, logout)
- Project structure ready for feature development

---

### Phase 2: Human Task Management (Weeks 3-4)

**Goals**: Native task CRUD, dashboard UI, first integration

**Tasks**:
1. Task CRUD API endpoints
2. Task list UI with filtering (work/personal, status, priority)
3. Task detail view and edit modal
4. Create task form with validation
5. Kanban board view (optional: start with list view)
6. Search functionality
7. Todoist OAuth integration
   - OAuth flow (authorize, callback, token storage)
   - Bidirectional sync (pull tasks, push changes)
   - Webhook setup for real-time updates
   - Conflict resolution strategy
8. Integration management UI

**Deliverables**:
- Fully functional task management system
- Working Todoist integration
- Clean, responsive UI

---

### Phase 3: Agent Integration Layer (Weeks 5-7)

**Goals**: MCP server, REST API, agent task tracking UI

**Tasks**:

**Week 5: MCP Server**
1. Set up MCP server project (apps/mcp-server)
2. Implement MCP resources:
   - `tasks://` - List agent tasks
   - `task://{id}` - Get specific task
3. Implement MCP tools:
   - `create_task` - Agent creates a new task
   - `update_task_status` - Agent updates task progress
   - `report_progress` - Agent reports progress on current task
   - `request_human_input` - Agent requests user input/decision
   - `complete_task` - Agent marks task complete
   - `log_cost` - Agent logs token usage
4. Connect MCP server to Supabase
5. Test with Claude Code

**Week 6: REST API**
1. Agent registration endpoint (`POST /api/agents/register`)
2. Heartbeat endpoint (`POST /api/agents/:id/heartbeat`)
3. Agent task endpoints:
   - `POST /api/agents/:id/tasks` - Create task
   - `GET /api/agents/:id/tasks` - List tasks
   - `PATCH /api/agents/:id/tasks/:taskId` - Update task
   - `DELETE /api/agents/:id/tasks/:taskId` - Delete task
4. Status reporting (`POST /api/agents/:id/status`)
5. Cost logging (`POST /api/agents/:id/costs`)
6. Waiting for input (`POST /api/agents/:id/waiting`)
7. Webhook receiver (`POST /api/webhooks/agent-events`)
8. API key generation and validation middleware
9. Rate limiting
10. Create agent SDK package for easy integration

**Week 7: Agent UI**
1. Agent list view (all user's agents, status, last seen)
2. Agent detail page (metadata, current task, history)
3. Agent task list with status indicators
4. "Waiting for input" notification center
5. Agent response form (send instructions back to agent)
6. Task timeline/history view
7. Token cost visualization (per agent, per task, aggregate)
8. Agent registration UI (generate API key)

**Deliverables**:
- Working MCP server
- Complete REST API for agents
- Agent SDK for easy integration
- Agent management UI
- Real-time agent task tracking

---

### Phase 4: Unified Dashboard (Week 8)

**Goals**: Combine human and agent work in one view

**Tasks**:
1. Unified task view (human + agent tasks)
2. Filter controls:
   - By source (human, agent, specific agent)
   - By status
   - By type (work/personal for human tasks)
   - By date range
3. Sort controls (priority, due date, created date)
4. Task grouping options (by source, by status, by date)
5. Manager/team view:
   - Overview metrics (tasks completed, in progress, blocked)
   - Agent status dashboard (active, idle, waiting)
   - Blocker list (agents waiting for input)
   - Cost summary (total spend, by agent, by time period)
6. Quick actions (respond to waiting agents, reassign tasks)

**Deliverables**:
- Single pane of glass for all work
- Manager view with team insights
- Clean, intuitive UX

---

### Phase 5: Auditing & Security (Week 9)

**Goals**: Complete audit trail, security hardening

**Tasks**:
1. Audit logging middleware
   - Log all API calls
   - Log all database changes (via triggers or app layer)
   - Include user, agent, timestamp, IP, changes
2. Audit log UI:
   - Searchable/filterable log viewer
   - Export capability (CSV, JSON)
   - Retention policy configuration
3. Security enhancements:
   - API key rotation
   - Permission system (agent scopes: read-only, write, admin)
   - Rate limiting per agent
   - IP allowlisting (optional)
   - Webhook signature verification
4. Monitoring:
   - Error tracking setup (Sentry or similar)
   - Performance monitoring
   - Usage analytics

**Deliverables**:
- Complete audit trail
- Security best practices implemented
- Monitoring and error tracking

---

### Phase 6: Deployment & Documentation (Week 10)

**Goals**: Production-ready deployment, comprehensive docs

**Tasks**:
1. Docker Compose finalization:
   - Production-ready configuration
   - Environment variable documentation
   - Health checks
   - Logging configuration
   - One-command setup script
2. Hosted deployment:
   - Vercel project setup
   - Supabase production instance
   - Environment variables in Vercel
   - Custom domain configuration
   - SSL/HTTPS setup
3. Documentation:
   - README with overview, features, quick start
   - Detailed setup guide (local development)
   - Self-hosting guide (Docker Compose)
   - Agent integration guide:
     - MCP integration example
     - REST API integration example
     - Webhook setup
     - SDK usage
   - API reference documentation
   - Contributing guide
   - Architecture documentation
   - Troubleshooting guide
4. Example integrations:
   - Sample agent using MCP
   - Sample agent using REST API
   - Sample custom workflow

**Deliverables**:
- Production deployment (self-host + hosted)
- Comprehensive documentation
- Example integrations
- MVP complete and ready for users

---

## Post-MVP Roadmap

### Short-term Enhancements (Weeks 11-16)
- Additional task integrations (Microsoft To Do, Linear, Asana, Jira)
- Mobile-responsive improvements
- Progressive Web App (PWA) support
- Browser extension for quick task capture
- Email integration (create tasks from email)
- Slack/Discord notifications

### Medium-term Enhancements (Months 4-6)
- Project management features:
  - Projects/workspaces
  - Goals and objectives tracking
  - Milestones
  - Project templates
- Calendar integration:
  - Google Calendar, Outlook Calendar
  - Time blocking
  - Task scheduling
- Team collaboration:
  - Shared workspaces
  - Task assignment and delegation
  - Comments and discussions
  - @mentions
- Advanced analytics:
  - Productivity insights
  - Agent efficiency metrics
  - Cost optimization recommendations
  - Customizable dashboards

### Long-term Vision (6+ months)
- Mobile native apps (React Native):
  - iOS app
  - Android app
  - Push notifications
- Agent-to-agent communication:
  - Agents can create subtasks for other agents
  - Workflow orchestration
  - Agent collaboration patterns
- Workflow automation:
  - Visual workflow builder
  - Trigger-action rules
  - Integration marketplace
- Advanced AI features:
  - AI task suggestions
  - Smart prioritization
  - Automated task categorization
  - Natural language task creation
- Enterprise features:
  - SSO (SAML, OAuth)
  - RBAC (Role-Based Access Control)
  - Team hierarchy and permissions
  - Advanced audit and compliance
  - SLA tracking
  - Custom branding

---

## Project Structure

```
junction/
├── apps/
│   ├── web/                          # Next.js web application
│   │   ├── app/                      # App Router
│   │   │   ├── (auth)/               # Auth-related pages
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (dashboard)/          # Protected dashboard routes
│   │   │   │   ├── layout.tsx        # Dashboard layout
│   │   │   │   ├── page.tsx          # Dashboard home (unified view)
│   │   │   │   ├── tasks/            # Human tasks
│   │   │   │   ├── agents/           # Agent management
│   │   │   │   ├── team/             # Team/manager view
│   │   │   │   ├── integrations/     # Integration settings
│   │   │   │   └── settings/         # User settings
│   │   │   └── api/                  # API routes
│   │   │       ├── agents/
│   │   │       │   ├── register/
│   │   │       │   └── [id]/
│   │   │       │       ├── heartbeat/
│   │   │       │       ├── tasks/
│   │   │       │       ├── status/
│   │   │       │       ├── costs/
│   │   │       │       └── waiting/
│   │   │       ├── tasks/
│   │   │       ├── integrations/
│   │   │       │   └── todoist/
│   │   │       │       ├── auth/
│   │   │       │       ├── callback/
│   │   │       │       ├── sync/
│   │   │       │       └── webhook/
│   │   │       └── webhooks/
│   │   │           └── agent-events/
│   │   ├── components/               # React components
│   │   │   ├── tasks/
│   │   │   ├── agents/
│   │   │   ├── dashboard/
│   │   │   └── ui/                   # Shared UI components
│   │   ├── lib/                      # Utilities
│   │   ├── hooks/                    # Custom React hooks
│   │   └── types/                    # TypeScript types
│   │
│   └── mcp-server/                   # MCP server for agent integration
│       ├── src/
│       │   ├── index.ts              # Server entry point
│       │   ├── resources/            # MCP resources
│       │   ├── tools/                # MCP tools
│       │   └── lib/                  # Utilities
│       └── package.json
│
├── packages/
│   ├── database/                     # Supabase client, types, queries
│   │   ├── src/
│   │   │   ├── client.ts             # Supabase client setup
│   │   │   ├── types.ts              # Database types
│   │   │   └── queries/              # Reusable queries
│   │   │       ├── tasks.ts
│   │   │       ├── agents.ts
│   │   │       └── audit.ts
│   │   └── package.json
│   │
│   ├── ui/                           # Shared UI components
│   │   ├── src/
│   │   │   └── components/
│   │   └── package.json
│   │
│   └── agent-sdk/                    # SDK for agent developers
│       ├── src/
│       │   ├── index.ts
│       │   ├── client.ts             # API client
│       │   ├── mcp.ts                # MCP helpers
│       │   └── types.ts              # Type definitions
│       ├── examples/
│       │   ├── mcp-integration.ts
│       │   └── rest-integration.ts
│       └── package.json
│
├── supabase/
│   ├── migrations/                   # Database migrations
│   │   ├── 20240101_initial_schema.sql
│   │   ├── 20240102_agent_tables.sql
│   │   └── ...
│   ├── functions/                    # Edge functions (if needed)
│   └── config.toml                   # Supabase config
│
├── docs/
│   ├── IMPLEMENTATION_PLAN.md        # This file
│   ├── ARCHITECTURE.md               # System architecture
│   ├── API_REFERENCE.md              # API documentation
│   ├── AGENT_INTEGRATION_GUIDE.md    # How to integrate agents
│   ├── SELF_HOSTING.md               # Self-hosting guide
│   └── CONTRIBUTING.md               # Contributing guide
│
├── docker-compose.yml                # Docker Compose configuration
├── .env.example                      # Example environment variables
├── package.json                      # Root package.json (workspaces)
├── pnpm-workspace.yaml               # pnpm workspace config
├── tsconfig.json                     # Root TypeScript config
└── README.md                         # Project README
```

---

## Key Technical Decisions

### Monorepo vs. Polyrepo
**Decision**: Monorepo with pnpm workspaces

**Rationale**:
- Easier to share code between web app, MCP server, and packages
- Single source of truth for types
- Simplified dependency management
- Better developer experience

### Database Choice
**Decision**: Supabase (PostgreSQL)

**Rationale**:
- Team familiarity
- Built-in auth, real-time subscriptions, storage
- Easy to self-host (local Supabase or postgres container)
- Great TypeScript support
- Row-level security for multi-tenancy

### MCP Server Architecture
**Decision**: Separate Node.js process, not in Next.js API routes

**Rationale**:
- MCP requires persistent WebSocket/stdio connections
- Next.js API routes are serverless (Vercel) - not suitable for long-lived connections
- Easier to scale independently
- Can run alongside web app in Docker Compose

### Real-time Updates
**Decision**: Supabase Realtime (PostgreSQL subscriptions)

**Rationale**:
- Built-in to Supabase
- No additional infrastructure (no Redis, no Socket.io)
- Automatically syncs database changes to clients
- Works well for agent status updates, task changes

### Agent SDK
**Decision**: Separate npm package for easy integration

**Rationale**:
- Makes it easy for agent developers to integrate
- Can be published to npm for wider distribution
- Provides TypeScript types and helper functions
- Abstracts away API details

### Task Integration Strategy
**Decision**: OAuth + webhooks for real-time sync

**Rationale**:
- OAuth is secure and standard
- Webhooks provide instant updates (no polling)
- Scales better than constant polling
- Better user experience

---

## Security Considerations

### Authentication
- Supabase Auth with JWT tokens
- Secure HTTP-only cookies
- Refresh token rotation
- Future: SSO for enterprise

### Authorization
- Row-level security (RLS) in Supabase
- Users can only access their own data
- Agent API keys scoped to specific user
- Permission system for agents (read-only, write, admin)

### Data Protection
- Encrypted OAuth tokens (at rest)
- API keys hashed before storage
- HTTPS everywhere (TLS)
- No sensitive data in logs

### Agent Security
- API key authentication for REST endpoints
- MCP server validates agent connections
- Rate limiting per agent
- IP allowlisting (optional)
- Webhook signature verification
- Audit logging for all agent actions

### Compliance
- Complete audit trail
- Data export capability
- GDPR considerations (data deletion)
- Retention policies

---

## Monitoring & Observability

### Error Tracking
- Sentry (or similar) for error tracking
- Source maps for debugging
- User feedback integration

### Performance Monitoring
- Vercel Analytics
- Core Web Vitals tracking
- API response time monitoring
- Database query performance

### Usage Analytics
- PostHog or similar for privacy-friendly analytics
- Track feature usage
- User behavior flows
- Conversion funnels

### Logs
- Structured logging
- Log aggregation (future: DataDog, Logtail)
- Retention policies

---

## Testing Strategy

### Unit Tests
- Jest for business logic
- React Testing Library for components
- Target: 80%+ coverage on critical paths

### Integration Tests
- API endpoint testing
- Database migration testing
- OAuth flow testing

### E2E Tests
- Playwright for critical user flows
- Signup/login flow
- Task creation and management
- Agent integration flow

### Manual Testing
- Cross-browser testing
- Mobile responsiveness
- Accessibility (WCAG AA)

---

## Success Metrics

### MVP Success Criteria
- [ ] User can sign up and log in
- [ ] User can create, edit, delete native tasks
- [ ] User can connect Todoist and see tasks synced
- [ ] User can register an agent via REST API
- [ ] User can register an agent via MCP
- [ ] Agent can create and update tasks
- [ ] Agent can request human input
- [ ] User receives notification when agent waits
- [ ] User can see token costs per agent
- [ ] All agent actions are audited
- [ ] System can be deployed via Docker Compose
- [ ] System can be deployed to Vercel + Supabase
- [ ] Documentation is complete and accurate

### Key Performance Indicators (KPIs)
- **Engagement**: DAU/MAU ratio
- **Retention**: 7-day, 30-day retention
- **Agent Usage**: Number of active agents per user
- **Task Volume**: Tasks created per user per week
- **Integration Adoption**: % of users with at least one integration
- **Error Rate**: < 1% API error rate
- **Performance**: P95 API response time < 500ms

---

## Risks & Mitigations

### Technical Risks

**Risk**: MCP specification changes
- **Mitigation**: Abstract MCP interface, version pinning, gradual upgrades

**Risk**: Supabase rate limits on free tier
- **Mitigation**: Document limits, optimize queries, provide self-host option

**Risk**: OAuth token expiration handling
- **Mitigation**: Robust refresh token flow, user notifications, error handling

**Risk**: Agent spam or abuse
- **Mitigation**: Rate limiting, API key rotation, user controls to disable agents

### Product Risks

**Risk**: Too complex for MVP
- **Mitigation**: Strict scope control, focus on core workflows, defer nice-to-haves

**Risk**: Poor agent adoption
- **Mitigation**: Excellent documentation, SDK, examples, easy integration

**Risk**: Task integrations difficult to maintain
- **Mitigation**: Start with one (Todoist), abstract integration interface, community contributions

### Business Risks

**Risk**: Self-hosting cannibalizes hosted revenue
- **Mitigation**: Focus on enterprise self-hosting, provide support tier, hosted version has better UX

**Risk**: Cost of running agents (tokens) is high
- **Mitigation**: Cost visibility, usage limits, user controls, potential cost pass-through

---

## Open Questions

1. **Agent Lifecycle**: How do we handle agents that crash or go offline? Auto-retry? User notification?
2. **Task Conflicts**: If user edits a task in Todoist and in Orqestr simultaneously, how do we resolve?
3. **Agent Permissions**: Should agents be able to edit human tasks, or only create agent tasks?
4. **Team Features**: When we add teams, how do we handle agent ownership? Can agents work across team members?
5. **Billing**: For hosted version, do we charge per user, per agent, per token usage, or combination?
6. **Data Retention**: How long do we keep completed tasks? Audit logs? Agent cost data?
7. **Agent Discovery**: Should there be a marketplace for pre-built agent integrations?

---

## Getting Started (After MVP Completion)

### For End Users
1. Visit hosted version or deploy via Docker Compose
2. Sign up for account
3. Create your first task
4. Connect Todoist (or other integration)
5. Register an agent using API key or MCP
6. Watch your agents work!

### For Agent Developers
1. Install agent SDK: `npm install @junction/agent-sdk`
2. Follow agent integration guide
3. Choose integration method (MCP or REST API)
4. Implement agent task reporting
5. Test and deploy

### For Self-Hosters
1. Clone repository
2. Copy `.env.example` to `.env` and configure
3. Run `docker-compose up`
4. Visit http://localhost:3000
5. Create admin account

---

## Contributing

This is an open-source project. Contributions are welcome!

Areas for contribution:
- New task integrations (Microsoft To Do, Linear, Asana, Jira)
- Agent framework examples (LangChain, AutoGPT, etc.)
- UI/UX improvements
- Documentation improvements
- Bug fixes
- Performance optimizations

See `docs/CONTRIBUTING.md` for guidelines.

---

## License

MIT License - See LICENSE file for details

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building a unified task and agent management platform. The MVP focuses on core functionality (human task aggregation + agent tracking) with a clear path to advanced features.

The hybrid agent integration approach (MCP + REST + Webhooks) ensures compatibility with the widest range of agents while being future-proof as the ecosystem evolves.

By prioritizing open-source and self-hosting alongside a hosted version, we enable both rapid validation and long-term sustainability.

Let's build something amazing!
