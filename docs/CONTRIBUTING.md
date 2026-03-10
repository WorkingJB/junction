# Contributing to Junction

Thank you for your interest in contributing to Junction! This guide will help you get started.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Your environment (OS, Node version, browser, etc.)
- Screenshots if applicable

### Suggesting Features

We welcome feature suggestions! Please create an issue with:
- A clear description of the feature
- The problem it solves
- Potential implementation approach (if you have ideas)
- Any relevant examples or mockups

### Pull Requests

1. **Fork the repository** and create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clean, readable code
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed

3. **Test your changes**:
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test  # when tests are added
   ```

4. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Follow conventional commits format:
     ```
     feat: add Todoist integration
     fix: resolve auth redirect issue
     docs: update API reference
     chore: update dependencies
     ```

5. **Push to your fork** and create a pull request:
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots for UI changes

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker and Docker Compose
- Supabase account (or local Supabase)

### Setup Steps

1. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/junction.git
   cd junction
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. Start the database:
   ```bash
   docker compose up -d db
   ```

5. Run migrations:
   ```bash
   supabase db push
   # Or apply migrations manually
   ```

6. Start the dev server:
   ```bash
   pnpm dev
   ```

## Project Structure

```
junction/
├── apps/
│   ├── web/          # Next.js web application
│   └── mcp-server/   # MCP server
├── packages/
│   ├── database/     # Supabase client and types
│   ├── ui/           # Shared UI components
│   └── agent-sdk/    # Agent SDK
├── supabase/
│   └── migrations/   # Database migrations
└── docs/             # Documentation
```

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - use proper typing
- Export types that other packages might need

### React/Next.js

- Use functional components with hooks
- Use Server Components where possible
- Keep components small and focused
- Use proper TypeScript prop types

### CSS/Styling

- Use Tailwind CSS for styling
- Follow the existing design system
- Ensure responsive design
- Test in multiple browsers

### API Routes

- Validate input with Zod
- Return proper HTTP status codes
- Handle errors gracefully
- Add proper TypeScript types

### Database

- Always create migrations for schema changes
- Use transactions for multi-step operations
- Add proper indexes for performance
- Follow naming conventions (snake_case)

## Areas for Contribution

### High Priority

- **Task Integrations**: Add support for Microsoft To Do, Linear, Asana, Jira
- **Agent Examples**: Create example agents using different frameworks
- **Documentation**: Improve setup guides, API docs, tutorials
- **Tests**: Add unit and integration tests
- **UI/UX**: Improve dashboard, add dark mode, enhance mobile experience

### Medium Priority

- **Performance**: Optimize queries, reduce bundle size, improve loading times
- **Features**: Calendar integration, project management, team collaboration
- **Accessibility**: Ensure WCAG AA compliance
- **Internationalization**: Add i18n support

### Low Priority

- **Advanced Features**: Agent-to-agent communication, workflow automation
- **DevOps**: CI/CD pipelines, automated deployments
- **Monitoring**: Error tracking, analytics, logging

## Adding a New Task Integration

To add a new task service integration:

1. Create a new directory: `apps/web/app/api/integrations/[service]/`
2. Implement OAuth flow (`auth/` and `callback/` routes)
3. Create sync logic (`sync/` route)
4. Add webhook handler (`webhook/` route)
5. Update the database types in `packages/database/src/types.ts`
6. Add to the integration provider enum in the migration
7. Create UI for connecting the integration
8. Document the integration in the README

Example structure:
```
apps/web/app/api/integrations/microsoft-todo/
├── auth/route.ts         # Start OAuth flow
├── callback/route.ts     # Handle OAuth callback
├── sync/route.ts         # Sync tasks
└── webhook/route.ts      # Handle webhooks
```

## Adding Agent SDK Features

To add new features to the Agent SDK:

1. Update types in `packages/agent-sdk/src/types.ts`
2. Add methods to `packages/agent-sdk/src/client.ts`
3. Update the README with usage examples
4. Add corresponding API routes if needed
5. Test with real agents

## Writing Documentation

- Use clear, concise language
- Include code examples
- Add screenshots for UI features
- Keep it up to date with code changes
- Use proper markdown formatting

## Testing

(Tests will be added in Phase 2+)

When tests are available:
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes

Examples:
```
feat: add Microsoft To Do integration
fix: resolve task sync conflict
docs: update agent integration guide
refactor: simplify auth logic
```

## Review Process

1. **Automated Checks**: PRs must pass linting and type checking
2. **Code Review**: At least one maintainer will review your PR
3. **Testing**: Changes should be tested (manual testing for now)
4. **Documentation**: Update docs if your changes affect user-facing features
5. **Approval**: Once approved, a maintainer will merge your PR

## Getting Help

- **Questions**: Open a [GitHub Discussion](https://github.com/yourusername/junction/discussions)
- **Issues**: Create a [GitHub Issue](https://github.com/yourusername/junction/issues)
- **Chat**: Join our Discord (coming soon)

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- Our website (coming soon)

Thank you for contributing to Junction! 🎉
