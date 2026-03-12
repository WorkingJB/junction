# Hosted vs Self-Hosted Parity Guidelines

## Standing Order

**ALL changes and improvements MUST work in both deployment modes unless there is a critical technical limitation.**

This document outlines the requirements and best practices for maintaining feature parity between:
- **Hosted**: Vercel + Supabase Cloud
- **Self-Hosted**: Docker Compose + Local/Self-Hosted Supabase

---

## Core Principles

### 1. Environment-Agnostic Development

All features should be developed to work in both environments from day one.

**DO**:
- ✅ Use environment variables for configuration
- ✅ Test features locally first
- ✅ Test features on Vercel before merging
- ✅ Use Supabase features that work in both cloud and self-hosted modes
- ✅ Document any environment-specific setup

**DON'T**:
- ❌ Hard-code values specific to one environment
- ❌ Use Vercel-only features without fallbacks
- ❌ Assume file system access (Vercel is serverless)
- ❌ Skip testing in Docker Compose

### 2. Feature Flags for Environment Differences

If a feature genuinely can't work in both environments, use feature flags:

```typescript
// lib/env.ts
export const isVercel = process.env.VERCEL === '1';
export const isSelfHosted = !isVercel;

// Usage
if (isVercel) {
  // Use Vercel-specific feature
} else {
  // Use self-hosted alternative
}
```

### 3. Documentation Requirements

Every new feature must include:
1. **Local setup instructions** in README or relevant docs
2. **Hosted setup instructions** in DEPLOYMENT_GUIDE.md
3. **Environment variables** added to `.env.example`
4. **Migration steps** if database changes are involved

---

## Pre-Deployment Checklist

Before pushing any changes, verify:

- [ ] **Code works locally**:
  ```bash
  pnpm dev
  # Test feature at http://localhost:3000
  ```

- [ ] **Docker Compose works**:
  ```bash
  docker compose up --build
  # Test feature in containerized environment
  ```

- [ ] **Environment variables documented**:
  - Added to `.env.example`
  - Documented in DEPLOYMENT_GUIDE.md
  - Added to Vercel (if deployed)

- [ ] **Database changes have migrations**:
  - Migration file created in `supabase/migrations/`
  - Tested locally
  - Ready to push to Supabase cloud

- [ ] **No hardcoded URLs or secrets**:
  - All URLs use environment variables
  - No API keys in code

- [ ] **Dependencies are compatible**:
  - Works in Node.js (self-hosted)
  - Works in Vercel Edge Runtime (if using edge functions)

---

## Common Scenarios

### Adding a New Feature

**Example**: Adding email notifications

1. **Research compatibility**:
   - Can we use the same email service in both environments?
   - If not, what's the abstraction layer?

2. **Implement with abstraction**:
   ```typescript
   // lib/email.ts
   interface EmailService {
     send(to: string, subject: string, body: string): Promise<void>;
   }

   // Use same service (e.g., Supabase Edge Functions) for both
   export const emailService: EmailService = {
     async send(to, subject, body) {
       // Implementation that works in both environments
     }
   };
   ```

3. **Test in both environments**:
   - Local: `pnpm dev`
   - Docker: `docker compose up`
   - Hosted: Push to GitHub, deploy to Vercel

4. **Document**:
   - Update README with email setup
   - Add email service env vars to `.env.example`
   - Update DEPLOYMENT_GUIDE.md

### Adding a Database Table

**Example**: Adding a `notifications` table

1. **Create migration**:
   ```bash
   # Create new migration file
   touch supabase/migrations/20260315000000_add_notifications.sql
   ```

2. **Write migration SQL**:
   ```sql
   CREATE TABLE public.notifications (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES public.users(id),
     message TEXT NOT NULL,
     read BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Test locally**:
   ```bash
   # Apply migration to local database
   supabase db push
   ```

4. **Update types**:
   ```typescript
   // packages/database/src/types.ts
   // Add notification types
   ```

5. **Test in Docker**:
   ```bash
   docker compose down -v  # Clear volumes
   docker compose up  # Migration runs on startup
   ```

6. **Deploy to Supabase Cloud**:
   ```bash
   # Push migration to cloud
   supabase db push --project-ref YOUR_PROJECT_REF
   ```

7. **Deploy to Vercel**:
   ```bash
   git add .
   git commit -m "Add notifications table"
   git push
   ```

### Adding an Integration

**Example**: Adding Slack integration

1. **Plan the architecture**:
   - Webhook receiver: Next.js API route (works in both)
   - OAuth flow: Next.js API route (works in both)
   - Token storage: Supabase database (works in both)

2. **Implement API routes**:
   ```typescript
   // apps/web/app/api/integrations/slack/route.ts
   // This works in both Vercel (serverless) and Docker (Node.js)
   ```

3. **Environment variables**:
   ```bash
   # .env.example
   SLACK_CLIENT_ID=
   SLACK_CLIENT_SECRET=
   SLACK_WEBHOOK_URL=
   ```

4. **Test locally**:
   - Use ngrok for webhook testing
   - Set up Slack app with local callback URL

5. **Test on Vercel**:
   - Update Slack app with Vercel callback URL
   - Test OAuth flow and webhooks

6. **Document**:
   - Add Slack setup instructions to docs
   - Include both local and hosted setup

---

## Architecture Decisions

### File Storage

**Problem**: Vercel is serverless, can't store files on disk

**Solution**: Always use Supabase Storage (works in both)

```typescript
// ✅ CORRECT - Works in both environments
import { supabase } from '@junction/database';

const { data, error } = await supabase.storage
  .from('uploads')
  .upload('file.pdf', file);

// ❌ WRONG - Only works in self-hosted
import fs from 'fs';
fs.writeFileSync('/tmp/file.pdf', data);
```

### Background Jobs

**Problem**: Vercel functions timeout after 10s (hobby) or 60s (pro)

**Solution**: Use Supabase Edge Functions or Vercel Cron

```typescript
// For long-running tasks, use Supabase Edge Functions
// For scheduled tasks, use Vercel Cron (add to vercel.json)

// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync-tasks",
    "schedule": "0 * * * *"  // Every hour
  }]
}
```

### WebSockets

**Problem**: Vercel Edge Runtime doesn't support WebSockets

**Solution**: Use Supabase Realtime (works in both)

```typescript
// ✅ CORRECT - Works in both
import { supabase } from '@junction/database';

const channel = supabase
  .channel('tasks')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks'
  }, (payload) => {
    console.log('Task changed:', payload);
  })
  .subscribe();

// ❌ WRONG - Doesn't work on Vercel
import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: 8080 });
```

### Secrets Management

**Problem**: Different secret storage methods

**Solution**: Environment variables (works in both)

```bash
# Self-hosted: .env file
DATABASE_URL=postgresql://...

# Hosted: Vercel environment variables (set in dashboard)
# Both accessed the same way:
process.env.DATABASE_URL
```

---

## Testing Matrix

Before merging to main, test in all scenarios:

| Scenario | Environment | Test |
|----------|-------------|------|
| **Development** | Local (pnpm dev) | Feature works, no errors |
| **Self-Hosted** | Docker Compose | Feature works, no errors |
| **Production** | Vercel Preview | Feature works, no errors |
| **Database** | Local Postgres | Migration applies cleanly |
| **Database** | Supabase Cloud | Migration applies cleanly |

---

## When Parity is Impossible

In rare cases, a feature may only work in one environment. Document this clearly:

### Example: System-Level Monitoring

```typescript
// This feature only works in self-hosted (Docker)
if (isSelfHosted) {
  // Show system CPU, memory, disk usage
  // Not possible on Vercel serverless
  return <SystemMetrics />;
} else {
  // Show alternative metrics (API response times, etc.)
  return <ApiMetrics />;
}
```

**Documentation**:
```markdown
## System Monitoring

- **Self-Hosted**: Full system metrics (CPU, memory, disk)
- **Hosted**: API performance metrics only

This difference exists because Vercel is a serverless platform
without access to underlying system resources.
```

---

## Emergency Exceptions

If you absolutely must make a hosted-only or self-hosted-only change:

1. **Get approval** (create GitHub issue explaining why)
2. **Document the limitation** in code comments and docs
3. **Create a feature flag** to enable/disable
4. **Plan future work** to achieve parity

---

## Review Process

Pull requests must include:
1. **Screenshots/video** of feature working locally
2. **Confirmation** that feature works on Vercel preview
3. **Updated documentation** (if applicable)
4. **Migration files** (if database changes)
5. **Updated .env.example** (if new env vars)

Reviewers must verify:
- [ ] Code doesn't contain environment-specific hacks
- [ ] Feature is tested in both environments
- [ ] Documentation is updated
- [ ] No hardcoded values

---

## Quick Reference

### Always Use:
- ✅ Environment variables
- ✅ Supabase for database, auth, storage, realtime
- ✅ Next.js API routes
- ✅ Supabase Edge Functions for long-running tasks
- ✅ Docker Compose for local testing

### Never Use:
- ❌ Hardcoded URLs
- ❌ File system writes (use Supabase Storage)
- ❌ WebSocket servers (use Supabase Realtime)
- ❌ Long-running processes in API routes
- ❌ Platform-specific APIs without feature flags

---

## Questions?

When in doubt:
1. Check if the feature works with Supabase (likely works in both)
2. Ask in GitHub Discussions
3. Test in both environments before committing
4. Document any limitations clearly

**Remember**: The goal is to make Orqestr accessible to everyone, whether they want to self-host or use our hosted version. Maintain parity whenever possible!
