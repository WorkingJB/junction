# Abstraction Layer Architecture

This document describes the abstraction layer that decouples Orqestr from Supabase-specific implementations, making it possible to migrate to alternative auth and database providers in the future.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Auth Service](#auth-service)
- [Database Repositories](#database-repositories)
- [Usage Examples](#usage-examples)
- [Adding New Implementations](#adding-new-implementations)
- [Migration Strategy](#migration-strategy)

---

## Overview

### Why an Abstraction Layer?

The abstraction layer provides:

1. **Vendor Independence**: Reduce lock-in to Supabase
2. **Migration Path**: Clear path to alternative providers (NextAuth, Prisma, etc.)
3. **Cost Control**: Ability to switch to self-hosted or cheaper alternatives
4. **Flexibility**: Support both Supabase Cloud and self-hosted deployments

### Current State

- **Implementation**: Supabase (auth + database)
- **Future Options**: NextAuth + Prisma/Drizzle, Clerk + Drizzle, etc.
- **Compatibility**: Works with both Supabase Cloud and self-hosted Supabase

### Design Principles

1. **Provider-agnostic interfaces**: No Supabase types in interfaces
2. **Type safety**: Full TypeScript support
3. **Zero runtime overhead**: Thin wrappers around provider APIs
4. **RLS preservation**: Keep database-level security when possible

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (API Routes, Server Components, etc.)  │
└─────────────────┬───────────────────────┘
                  │
                  │ Uses abstraction interfaces
                  │
┌─────────────────▼───────────────────────┐
│      Abstraction Layer Interfaces       │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ IAuthService │  │ IRepositories   │  │
│  └──────────────┘  └─────────────────┘  │
└─────────────────┬───────────────────────┘
                  │
                  │ Implemented by providers
                  │
┌─────────────────▼───────────────────────┐
│      Provider Implementations           │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │   Supabase   │  │ NextAuth+Prisma │  │
│  │   (current)  │  │    (future)     │  │
│  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────┘
```

### Package Structure

```
packages/database/src/
├── auth/
│   ├── types.ts                    # Provider-agnostic types
│   ├── auth-service.ts             # IAuthService interface
│   ├── supabase-auth-service.ts    # Supabase implementation
│   └── index.ts
├── repositories/
│   ├── types.ts                    # Common repository types
│   ├── tasks-repository.ts         # ITasksRepository interface
│   ├── agents-repository.ts        # IAgentsRepository interface
│   ├── supabase/
│   │   ├── tasks-repository.ts     # Supabase implementation
│   │   ├── agents-repository.ts    # Supabase implementation
│   │   └── index.ts                # Factory function
│   └── index.ts
└── index.ts                        # Main exports
```

---

## Auth Service

### Interface: `IAuthService`

Provider-agnostic authentication interface.

**Location**: `packages/database/src/auth/auth-service.ts`

```typescript
interface IAuthService {
  getCurrentUser(): Promise<AuthResult<AuthUser>>;
  getSession(): Promise<AuthResult<AuthSession>>;
  signIn(credentials: SignInCredentials): Promise<AuthResult<AuthSession>>;
  signUp(data: SignUpData): Promise<AuthResult<AuthSession>>;
  signOut(): Promise<AuthResult<void>>;
}
```

### Current Implementation: Supabase

**Location**: `packages/database/src/auth/supabase-auth-service.ts`

```typescript
import { createServerAuthService } from '@orqestr/database';

const authService = await createServerAuthService();
const { data: user, error } = await authService.getCurrentUser();
```

### Middleware Exception

**Important**: Middleware still uses Supabase directly because:

1. Runs on Edge runtime with special cookie handling requirements
2. Needs to synchronize cookies with the response object
3. Provider-specific middleware implementations vary significantly

**When migrating away from Supabase**, you'll need to rewrite the middleware using your new provider's approach (e.g., NextAuth middleware).

---

## Database Repositories

### Repository Pattern

Instead of directly using database clients, we use the repository pattern:

- **Interface**: Defines operations (CRUD, filters, etc.)
- **Implementation**: Provider-specific (Supabase, Prisma, etc.)
- **Type safety**: Leverages database types throughout

### Example: Tasks Repository

**Interface**: `packages/database/src/repositories/tasks-repository.ts`

```typescript
interface ITasksRepository {
  getById(id: string, userId: string): Promise<DbResult<Task>>;
  getMany(filter: TaskFilter, pagination?: PaginationOptions): Promise<DbResult<Task[]>>;
  create(task: TaskInsert): Promise<DbResult<Task>>;
  update(id: string, userId: string, updates: TaskUpdate): Promise<DbResult<Task>>;
  delete(id: string, userId: string): Promise<DbResult<void>>;
  count(filter: TaskFilter): Promise<DbResult<number>>;
}
```

**Supabase Implementation**: `packages/database/src/repositories/supabase/tasks-repository.ts`

```typescript
class SupabaseTasksRepository implements ITasksRepository {
  async getMany(filter: TaskFilter) {
    let query = this.supabase.from('tasks').select('*');

    if (filter.userId) query = query.eq('user_id', filter.userId);
    if (filter.status) query = query.eq('status', filter.status);
    // ... more filters

    const { data, error } = await query;
    return { data, error };
  }
}
```

### Row Level Security (RLS)

The abstraction **preserves RLS** by:

- Passing `userId` to repository methods
- Using RLS policies at the database level
- Works with both Supabase Cloud and self-hosted Supabase

If migrating to a non-RLS database (e.g., Prisma with MySQL), you'll need to implement user ID checks in the repository implementation.

---

## Usage Examples

### API Route with Auth + Repository

**Before** (direct Supabase):

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id);

  return NextResponse.json({ tasks });
}
```

**After** (abstraction layer):

```typescript
import { createServerAuthService, createRepositories } from '@orqestr/database';

export async function GET(request: NextRequest) {
  // Auth
  const authService = await createServerAuthService();
  const { data: user, error: authError } = await authService.getCurrentUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Database
  const repos = await createRepositories();
  const { data: tasks, error } = await repos.tasks.getMany({ userId: user.id });

  return NextResponse.json({ tasks });
}
```

### Benefits

1. **Cleaner code**: Less boilerplate
2. **Type safety**: Repository methods are fully typed
3. **Testable**: Easy to mock repositories
4. **Swappable**: Change `createRepositories()` implementation without touching business logic

---

## Adding New Implementations

### Example: NextAuth + Prisma

#### Step 1: Implement Auth Service

Create `packages/database/src/auth/nextauth-auth-service.ts`:

```typescript
import { getServerSession } from 'next-auth';
import type { IAuthService } from './auth-service';

export class NextAuthService implements IAuthService {
  async getCurrentUser(): Promise<AuthResult<AuthUser>> {
    const session = await getServerSession();

    if (!session?.user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    return {
      data: {
        id: session.user.id,
        email: session.user.email,
        metadata: session.user,
      },
      error: null,
    };
  }

  // ... implement other methods
}
```

#### Step 2: Implement Repository

Create `packages/database/src/repositories/prisma/tasks-repository.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import type { ITasksRepository } from '../tasks-repository';

export class PrismaTasksRepository implements ITasksRepository {
  constructor(private prisma: PrismaClient) {}

  async getMany(filter: TaskFilter): Promise<DbResult<Task[]>> {
    try {
      const tasks = await this.prisma.task.findMany({
        where: {
          userId: filter.userId,
          status: filter.status,
          // ... more filters
        },
      });

      return { data: tasks, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  // ... implement other methods
}
```

#### Step 3: Update Factory Functions

Update `packages/database/src/repositories/prisma/index.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaTasksRepository } from './tasks-repository';

export async function createRepositories(): Promise<IRepositories> {
  const prisma = new PrismaClient();

  return {
    tasks: new PrismaTasksRepository(prisma),
    agents: new PrismaAgentsRepository(prisma),
  };
}
```

#### Step 4: Switch Implementation

In your app, change the import:

```typescript
// Before
import { createRepositories } from '@orqestr/database/repositories/supabase';

// After
import { createRepositories } from '@orqestr/database/repositories/prisma';
```

Or better, configure via environment variable:

```typescript
const provider = process.env.DB_PROVIDER || 'supabase';
const { createRepositories } = await import(`@orqestr/database/repositories/${provider}`);
```

---

## Migration Strategy

### Phase 1: Abstraction (Current)

✅ Create abstraction interfaces
✅ Implement Supabase adapters
✅ Update key API routes
⏳ Update remaining routes and components

### Phase 2: Dual Support (Optional)

If needed, support both Supabase and alternative provider:

```typescript
const repos = process.env.USE_SUPABASE === 'true'
  ? await createSupabaseRepositories()
  : await createPrismaRepositories();
```

This allows gradual migration and A/B testing.

### Phase 3: Full Migration

1. Implement alternative auth + database providers
2. Migrate data from Supabase to new provider
3. Update environment variables
4. Deploy and test
5. Remove Supabase dependencies

### Cost Considerations

**Supabase Cloud** → **Self-hosted Supabase**:
- Change: `NEXT_PUBLIC_SUPABASE_URL` to your self-hosted instance
- No code changes needed (uses same abstraction)
- Saves: ~$600/month at Team tier

**Supabase** → **NextAuth + Prisma**:
- Implement new adapters (estimated 2-3 days)
- Migrate data (schema changes may be needed)
- Test thoroughly (auth is critical)
- Saves: Supabase costs, but adds complexity

---

## Testing

### Unit Testing Repositories

Mock the repository interface:

```typescript
const mockTasksRepo: ITasksRepository = {
  getMany: jest.fn().mockResolvedValue({
    data: [{ id: '1', title: 'Test' }],
    error: null
  }),
  // ... mock other methods
};

const repos = { tasks: mockTasksRepo, agents: mockAgentsRepo };
```

### Integration Testing

Test with actual database:

```typescript
describe('TasksRepository', () => {
  it('should fetch tasks for user', async () => {
    const repos = await createRepositories();
    const { data, error } = await repos.tasks.getMany({ userId: 'test-user' });

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });
});
```

---

## Remaining Work

### API Routes to Update

Most routes still use direct Supabase. Update these to use abstraction:

- ✅ `/api/tasks` (GET, POST)
- ✅ `/api/tasks/[id]` (PATCH, DELETE)
- ⏳ `/api/agents/*`
- ⏳ `/api/agent-tasks/*`
- ⏳ `/api/integrations/*`
- ⏳ `/api/settings/*`

### Client Components

Components that use Supabase client directly:

- ⏳ `components/user-menu.tsx`
- ⏳ `app/dashboard/*` pages
- ⏳ `app/(auth)/*` pages

For client-side usage, you may want to create a client-side abstraction as well.

---

## Questions?

See the reference implementations:

- Auth: `packages/database/src/auth/supabase-auth-service.ts`
- Repository: `packages/database/src/repositories/supabase/tasks-repository.ts`
- API Route: `apps/web/app/api/tasks/route.ts`

For more details on maintaining hosted/self-hosted parity, see [HOSTED_SELFHOSTED_PARITY.md](./HOSTED_SELFHOSTED_PARITY.md).
