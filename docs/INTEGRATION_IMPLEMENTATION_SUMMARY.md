# Task Integration Implementation Summary

## Overview

This document summarizes the comprehensive task integration system that has been implemented for Orqestr. The system enables bidirectional synchronization of tasks between Orqestr and external task management platforms.

## Implementation Date

March 11, 2026

## Completed Features

### 1. Database Schema Updates

**Files Created/Modified:**
- `supabase/migrations/20260311000000_add_integration_providers.sql`
- `supabase/migrations/20260311000001_add_oauth_states.sql`
- `packages/database/src/types.ts`

**Changes:**
- Added 7 new integration providers to the `integration_provider` enum:
  - ClickUp
  - Monday.com
  - Google Tasks
  - Microsoft Planner
  - Basecamp
  - TickTick
  - Microsoft Project

- Extended `task_integrations` table with:
  - `webhook_id`, `webhook_secret`, `webhook_url` for webhook support
  - `requires_polling`, `polling_interval_minutes`, `last_poll_at` for polling support
  - `sync_errors`, `last_error`, `last_error_at` for error tracking

- Created `oauth_states` table for CSRF protection during OAuth flows

### 2. Integration Abstraction Layer

**Package Created:** `packages/integrations/`

**Core Components:**

#### Types (`src/types/common.ts`)
- `IntegratedTask` - Standardized task structure
- `IntegrationConfig` - Provider configuration
- `OAuthTokens` - OAuth credentials
- `WebhookPayload` - Webhook data structure
- `SyncResult` - Sync operation results
- `ConflictResolution` - Strategy enum for handling conflicts

#### Base Adapter (`src/adapters/base/adapter.ts`)
- `IntegrationAdapter` interface - Contract for all providers
- `BaseIntegrationAdapter` abstract class - Common implementations
- Methods for:
  - OAuth (authorization URL, token exchange, refresh, revocation)
  - Task sync (fetch, create, update, delete, full sync)
  - Webhooks (register, unregister, validate, process)
  - Rate limiting and connection testing

#### Utilities
- **OAuth (`src/utils/oauth.ts`)**
  - Token expiration checking
  - Auth URL building
  - State generation for CSRF protection
  - Token encryption/decryption placeholders

- **Webhooks (`src/utils/webhooks.ts`)**
  - HMAC signature verification
  - Timestamp validation (replay attack prevention)
  - Payload parsing and sanitization
  - Sensitive data redaction

- **HTTP Client (`src/utils/http.ts`)**
  - HTTP client creation with auth (native fetch)
  - Error handling (ApiError, RateLimitError)
  - Retry with exponential backoff
  - Result pagination

- **Task Mapping (`src/utils/task-mapping.ts`)**
  - Priority mapping (numeric ↔ enum)
  - Status mapping (string ↔ enum)
  - Date parsing and formatting
  - Task validation and merging
  - Change detection

### 3. Provider Implementations (Tier 1)

All three Tier 1 integrations have been fully implemented with OAuth 2.0 and webhook support:

#### Todoist Integration
**Files:** `packages/integrations/src/adapters/todoist/`
- OAuth 2.0 authentication (tokens don't expire)
- REST API v2 integration
- Webhook support with HMAC-SHA256 validation
- Task mapping including priorities, due dates, labels
- Rate limit: 450 requests per 15 minutes

#### Asana Integration
**Files:** `packages/integrations/src/adapters/asana/`
- OAuth 2.0 with refresh tokens
- REST API v1 integration
- Webhook support with signature validation
- Workspace and project management
- Multi-workspace task fetching
- Rate limit: 150 requests per minute

#### ClickUp Integration
**Files:** `packages/integrations/src/adapters/clickup/`
- OAuth 2.0 authentication (tokens don't expire)
- API v2 integration
- Webhook support with signature validation
- Team, space, and list hierarchy support
- Custom field mapping
- Rate limit: 100 requests per minute per team

### 4. API Endpoints

#### Webhook Receiver
**File:** `apps/web/app/api/webhooks/[provider]/route.ts`
- POST handler for webhook events
- GET handler for webhook verification (Asana)
- Signature validation
- Rate limiting (1000 req/min per provider)
- Error handling with proper status codes

#### OAuth Flow
**Files:**
- `apps/web/app/api/integrations/[provider]/oauth/route.ts` - Initiate OAuth
- `apps/web/app/api/integrations/[provider]/callback/route.ts` - OAuth callback

**Features:**
- State generation for CSRF protection
- Token exchange
- Connection testing
- Automatic integration storage

#### Integration Management
**Files:**
- `apps/web/app/api/integrations/route.ts` - List integrations
- `apps/web/app/api/integrations/[id]/route.ts` - Delete integration
- `apps/web/app/api/integrations/[id]/sync/route.ts` - Manual sync trigger

### 5. Webhook Processing Service

**File:** `apps/web/app/services/webhook-processor.ts`

**Features:**
- Provider adapter routing
- Signature verification
- Integration config retrieval from database
- Sync status tracking
- Error counting and logging

### 6. Task Synchronization Service

**File:** `apps/web/app/services/task-sync-service.ts`

**Features:**
- Bidirectional sync between Orqestr and providers
- Conflict detection and resolution
- Four resolution strategies:
  - `LAST_WRITE_WINS` - Most recent update wins (default)
  - `EXTERNAL_WINS` - Prefer provider's version
  - `LOCAL_WINS` - Prefer Orqestr's version
  - `MANUAL` - Flag for user review

- Task creation, updating, and deletion
- Metadata preservation
- Validation and error handling

### 7. User Interface

**Files:**
- `apps/web/app/dashboard/settings/page.tsx` - Settings page
- `apps/web/app/dashboard/settings/IntegrationsTab.tsx` - Integrations UI

**Features:**
- Visual integration status (Connected/Disconnected/Error)
- One-click OAuth connection flow
- Manual sync trigger button
- Last sync time display
- Webhook vs. polling indicator
- Error messages display
- Provider documentation links
- Coming soon integrations preview

### 8. Polling Scheduler

**File:** `apps/web/app/api/cron/sync-polling-integrations/route.ts`
**Config:** `vercel.json` - Cron job configuration

**Features:**
- Runs every 15 minutes via Vercel Cron
- Syncs polling-based integrations (TickTick, etc.)
- Respects custom polling intervals
- Tracks last poll time
- Prevents duplicate syncs
- Error tracking and retry logic
- CRON_SECRET protection

### 9. Rate Limiting

**File:** `apps/web/lib/rate-limiter.ts`

**Features:**
- In-memory rate limit store (use Redis in production)
- Configurable limits and windows
- Standard rate limit headers
- Automatic cleanup of expired entries
- Predefined configurations:
  - AUTH: 5 req/min
  - API: 100 req/min
  - WEBHOOK: 1000 req/min
  - SYNC: 10 req/min per user

### 10. Error Handling

**File:** `apps/web/lib/api-error-handler.ts`

**Features:**
- Custom error classes:
  - `ApiError` - Base error
  - `ValidationError` - 400 errors
  - `UnauthorizedError` - 401 errors
  - `ForbiddenError` - 403 errors
  - `NotFoundError` - 404 errors
  - `RateLimitError` - 429 errors
  - `IntegrationError` - Integration-specific errors

- Centralized error handling
- Zod validation error formatting
- Error logging with context
- Production error tracking hooks

## Integration Capabilities Matrix

| Provider | OAuth | Webhooks | Polling | Priority | Due Dates | Projects | Status |
|----------|-------|----------|---------|----------|-----------|----------|--------|
| Todoist | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | Implemented |
| Asana | ✅ | ✅ | ❌ | ⚠️* | ✅ | ✅ | Implemented |
| ClickUp | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | Implemented |
| TickTick | 🔜 | ❌ | ✅ | 🔜 | 🔜 | 🔜 | Planned |
| Google Tasks | 🔜 | ⚠️ | ✅ | 🔜 | 🔜 | 🔜 | Planned |
| Microsoft To Do | 🔜 | ⚠️ | ✅ | 🔜 | 🔜 | 🔜 | Planned |
| Monday.com | 🔜 | ✅ | ❌ | 🔜 | 🔜 | 🔜 | Planned |
| Basecamp | 🔜 | ✅ | ❌ | 🔜 | 🔜 | 🔜 | Planned |

*Asana doesn't have built-in priority field; can use custom fields or tags

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# Todoist
TODOIST_CLIENT_ID=your_client_id
TODOIST_CLIENT_SECRET=your_client_secret

# Asana
ASANA_CLIENT_ID=your_client_id
ASANA_CLIENT_SECRET=your_client_secret

# ClickUp
CLICKUP_CLIENT_ID=your_client_id
CLICKUP_CLIENT_SECRET=your_client_secret

# Cron Protection
CRON_SECRET=your_random_secret

# App URL (for OAuth callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Migrations

Run the following commands to apply migrations:

```bash
# Navigate to the project root
cd /path/to/orqestr

# Apply migrations via Supabase CLI
supabase db reset  # For local development
# OR
supabase db push   # For production
```

## Testing the Implementation

### 1. Test OAuth Flow
1. Navigate to Settings → Integrations
2. Click "Connect" on Todoist/Asana/ClickUp
3. Complete OAuth authorization
4. Verify connection status shows "Connected"

### 2. Test Manual Sync
1. In Settings → Integrations
2. Click "Sync Now" on a connected integration
3. Check tasks appear in the dashboard
4. Verify sync time updates

### 3. Test Webhooks
1. Register a webhook with the provider's developer console
2. Point it to: `https://your-domain.com/api/webhooks/[provider]`
3. Create/update a task in the external provider
4. Verify task appears/updates in Orqestr

### 4. Test Polling (when implemented)
1. Wait 15 minutes after connecting a polling-based integration
2. Check cron logs for sync execution
3. Verify tasks sync automatically

## Architecture Decisions

### 1. Adapter Pattern
- Chose adapter pattern for easy addition of new providers
- Base interface ensures consistency
- Each provider can override default behavior

### 2. Webhook vs Polling
- Webhooks for real-time sync (Tier 1: Todoist, Asana, ClickUp)
- Polling fallback for providers without webhooks (Tier 2: TickTick)
- Configurable polling intervals per integration

### 3. Conflict Resolution
- Default: LAST_WRITE_WINS (timestamp-based)
- Configurable per sync operation
- Can be extended for user-defined strategies

### 4. Rate Limiting
- In-memory for simplicity (upgrade to Redis for production)
- Per-provider limits align with API documentation
- Automatic retry with exponential backoff

### 5. Error Handling
- Centralized error types and handlers
- Track consecutive errors for health monitoring
- Disable sync after threshold (configurable)

## Known Limitations

1. **Priority Mapping**
   - Asana doesn't have native priority; uses custom fields
   - Priority values may not map 1:1 across all providers

2. **In-Memory Rate Limiting**
   - Current implementation uses in-memory storage
   - Won't scale across multiple server instances
   - Production should use Redis

3. **Webhook Registration**
   - Todoist requires manual webhook setup in developer console
   - Asana and ClickUp support API-based registration

4. **Token Encryption**
   - Placeholder implementation in oauth.ts
   - Production needs proper encryption with key management service

## Next Steps

### Tier 2 Integrations (Medium Priority)
- [ ] TickTick (polling-based)
- [ ] Google Tasks (OAuth + polling)
- [ ] Microsoft To Do (OAuth + polling)

### Tier 3 Integrations (Lower Priority)
- [ ] Monday.com (webhooks supported)
- [ ] Basecamp (webhooks supported)

### Infrastructure Improvements
- [ ] Implement Redis for rate limiting
- [ ] Add proper token encryption with KMS
- [ ] Set up error tracking service (Sentry)
- [ ] Add integration health monitoring dashboard
- [ ] Implement retry queues for failed syncs
- [ ] Add integration usage analytics

### Features
- [ ] Selective sync (choose which projects/lists to sync)
- [ ] Custom field mapping configuration
- [ ] Sync scheduling (custom intervals per user)
- [ ] Conflict resolution UI for manual review
- [ ] Bulk task import from providers
- [ ] Sync logs and history viewer

## File Structure Summary

```
packages/integrations/
├── src/
│   ├── adapters/
│   │   ├── base/
│   │   │   ├── adapter.ts
│   │   │   └── index.ts
│   │   ├── todoist/
│   │   │   ├── adapter.ts
│   │   │   ├── mapper.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── asana/
│   │   │   ├── adapter.ts
│   │   │   ├── mapper.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── clickup/
│   │       ├── adapter.ts
│   │       ├── mapper.ts
│   │       ├── types.ts
│   │       └── index.ts
│   ├── types/
│   │   ├── common.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── http.ts
│   │   ├── oauth.ts
│   │   ├── webhooks.ts
│   │   ├── task-mapping.ts
│   │   └── index.ts
│   ├── index.ts
│   ├── package.json
│   └── tsconfig.json

apps/web/
├── app/
│   ├── api/
│   │   ├── integrations/
│   │   │   ├── [provider]/
│   │   │   │   ├── oauth/
│   │   │   │   │   └── route.ts
│   │   │   │   └── callback/
│   │   │   │       └── route.ts
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts
│   │   │   │   └── sync/
│   │   │   │       └── route.ts
│   │   │   └── route.ts
│   │   ├── webhooks/
│   │   │   └── [provider]/
│   │   │       └── route.ts
│   │   └── cron/
│   │       └── sync-polling-integrations/
│   │           └── route.ts
│   ├── dashboard/
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── IntegrationsTab.tsx
│   └── services/
│       ├── webhook-processor.ts
│       └── task-sync-service.ts
├── lib/
│   ├── rate-limiter.ts
│   └── api-error-handler.ts
└── ...

supabase/migrations/
├── 20260311000000_add_integration_providers.sql
└── 20260311000001_add_oauth_states.sql
```

## Conclusion

The task integration system is now fully functional for Tier 1 providers (Todoist, Asana, ClickUp). Users can:

1. Connect their accounts via OAuth
2. Sync tasks bidirectionally
3. Receive real-time updates via webhooks
4. Manually trigger syncs
5. View sync status and errors
6. Manage multiple integrations

The system is designed to be extensible, with clear patterns for adding new providers and improving existing functionality.
