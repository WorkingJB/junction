/**
 * Auth Abstraction Layer
 *
 * This module provides a provider-agnostic authentication interface.
 * Current implementation: Supabase Auth
 * Future implementations: NextAuth, Clerk, Auth0, etc.
 *
 * ## Usage
 *
 * ### Server-side (API Routes, Server Components)
 * ```ts
 * import { createServerAuthService } from '@orqestr/database/auth';
 *
 * const authService = await createServerAuthService();
 * const { data: user, error } = await authService.getCurrentUser();
 * ```
 *
 * ## Adding a New Auth Provider
 *
 * 1. Implement the `IAuthService` interface
 * 2. Create a factory function (e.g., `createCustomAuthService()`)
 * 3. Update environment variables and configuration
 * 4. Swap the implementation in your app code
 *
 * See `supabase-auth-service.ts` for a reference implementation.
 */

// Types
export type {
  AuthUser,
  AuthSession,
  AuthResult,
  AuthError,
  SignInCredentials,
  SignUpData,
} from './types';

// Interface
export type { IAuthService, AuthServiceFactory } from './auth-service';

// Supabase implementation (current)
export { SupabaseAuthService, createServerAuthService } from './supabase-auth-service';
